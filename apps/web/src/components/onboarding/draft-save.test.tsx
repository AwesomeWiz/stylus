import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useRef, useLayoutEffect } from "react";
import type { Route } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn() }));
vi.mock("@/modules/onboarding/actions", () => ({
  saveOnboardingDraftAction: m.save,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
import { useDraftSave } from "./use-draft-save";
import { OnboardingNavigation, OnboardingLink } from "./navigation";
const org = "10000000-0000-4000-8000-000000000001",
  stamp = "2026-11-10T12:00:00.123456Z";
function Fields({ earlyEdit = false }: { earlyEdit?: boolean }) {
  const form = useRef<HTMLFormElement>(null),
    save = useDraftSave({
      form,
      organizationId: org,
      step: "company",
      draft: {
        fields: {},
        updated_at: null,
        base_revision: null,
        conflicted: false,
      },
    });
  const earlyApplied = useRef(false);
  useLayoutEffect(() => {
    if (earlyEdit && !earlyApplied.current) {
      earlyApplied.current = true;
      form.current!.querySelector<HTMLInputElement>(
        "[name=companyName]",
      )!.value = "Early hydration edit";
      save.changed();
    }
  });
  return (
    <>
      <form ref={form} onChange={save.changed}>
        <input name="step" type="hidden" value="company" />
        <input aria-label="Company name" name="companyName" defaultValue="" />
      </form>
      <p role="status">{save.status}</p>
      <p>{save.message}</p>
      <button onClick={() => void save.flush()}>Retry</button>
      <OnboardingLink href={"/onboarding/problem" as Route}>
        Next step
      </OnboardingLink>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  m.save.mockResolvedValue({ status: "success", revision: stamp });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("recoverable debounced onboarding drafts", () => {
  it("persists an edit made before passive hydration effects without mistaking it for saved baseline", async () => {
    render(
      <OnboardingNavigation>
        <Fields earlyEdit />
      </OnboardingNavigation>,
    );
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(m.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        fields: { companyName: ["Early hydration edit"] },
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("saved");
  });
  it("does not write on mount; coalesces partial typing and does not refetch", async () => {
    render(
      <OnboardingNavigation>
        <Fields />
      </OnboardingNavigation>,
    );
    expect(m.save).not.toHaveBeenCalled();
    const input = screen.getByLabelText("Company name");
    fireEvent.change(input, { target: { value: "N" } });
    await act(() => vi.advanceTimersByTimeAsync(400));
    fireEvent.change(input, { target: { value: "No" } });
    await act(() => vi.advanceTimersByTimeAsync(799));
    expect(m.save).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(m.save).toHaveBeenCalledExactlyOnceWith({
      organizationId: org,
      step: "company",
      fields: { companyName: ["No"] },
      revision: null,
      baseRevision: null,
    });
    expect(screen.getByRole("status")).toHaveTextContent("saved");
  });
  it("serializes in-flight edits with the returned exact revision", async () => {
    let finish: (r: unknown) => void = () => {};
    m.save.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    render(
      <OnboardingNavigation>
        <Fields />
      </OnboardingNavigation>,
    );
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "First" },
    });
    await act(() => vi.advanceTimersByTimeAsync(800));
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Latest" },
    });
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(m.save).toHaveBeenCalledTimes(1);
    await act(async () => finish({ status: "success", revision: stamp }));
    expect(m.save).toHaveBeenCalledTimes(2);
    expect(m.save.mock.calls[1]?.[0]).toMatchObject({
      revision: stamp,
      fields: { companyName: ["Latest"] },
    });
  });
  it("holds navigation on failure, retains text and retries explicitly", async () => {
    m.save.mockResolvedValueOnce({
      status: "error",
      message: "Offline. Retry.",
    });
    render(
      <OnboardingNavigation>
        <Fields />
      </OnboardingNavigation>,
    );
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Retained" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("link", { name: "Next step" })),
    );
    expect(m.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Company name")).toHaveValue("Retained");
    expect(screen.getByText("Offline. Retry.")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByText("Retry")));
    await act(async () =>
      fireEvent.click(screen.getByRole("link", { name: "Next step" })),
    );
    expect(m.push).toHaveBeenCalledWith("/onboarding/problem");
  });
  it("keeps native modifier-click behavior without claiming navigation saved", () => {
    render(
      <OnboardingNavigation>
        <Fields />
      </OnboardingNavigation>,
    );
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Draft" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Next step" }), {
      ctrlKey: true,
    });
    expect(m.push).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });
});
