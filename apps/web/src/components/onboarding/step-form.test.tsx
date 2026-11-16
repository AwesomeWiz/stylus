import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  save: vi.fn(),
  commit: vi.fn(),
  resolve: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/modules/onboarding/actions", () => ({
  saveOnboardingDraftAction: m.save,
  saveOnboardingStepAction: m.commit,
  resolveOnboardingDraftAction: m.resolve,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh, push: vi.fn() }),
}));
import { OnboardingStepForm } from "./step-form";
import { CompetitorEditor } from "./competitor-editor";
import { OnboardingDraftContext } from "./draft-context";
const props = {
  data: {
    company: null,
    audience: null,
    brand: null,
    marketing: null,
    competitors: [],
  },
  editing: false,
  step: "company" as const,
  organizationId: crypto.randomUUID(),
  draft: {
    fields: {},
    updated_at: null,
    base_revision: null,
    conflicted: false,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({
    status: "success",
    revision: "2026-11-10T12:00:00.123456Z",
  });
  m.commit.mockResolvedValue({
    status: "error",
    message: "A recoverable save failure.",
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("onboarding form validation and resume", () => {
  it("validates inline and focuses the actual labeled field before canonical or draft commit", () => {
    vi.useFakeTimers();
    render(<OnboardingStepForm {...props} />);
    fireEvent.change(screen.getByLabelText(/Company or startup name/), {
      target: { value: "N" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const name = screen.getByLabelText(/Company or startup name/);
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", "companyName-error");
    expect(m.commit).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "Back" }),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
  });
  it("restores partial raw draft values independently of canonical required fields", () => {
    render(
      <OnboardingStepForm
        {...props}
        draft={{
          fields: {
            companyName: ["Partial saved name"],
            shortDescription: ["Still incomplete"],
            stage: ["IDEA"],
          },
          updated_at: "2026-11-10T12:00:00Z",
          base_revision: null,
          conflicted: false,
        }}
      />,
    );
    expect(screen.getByLabelText(/Company or startup name/)).toHaveValue(
      "Partial saved name",
    );
    expect(screen.getByLabelText(/Short description/)).toHaveValue(
      "Still incomplete",
    );
    expect(
      screen.getByRole("combobox", { name: /Company stage/ }),
    ).toHaveTextContent("Idea");
    expect(
      new FormData(
        screen.getByRole("button", { name: "Continue" }).closest("form")!,
      ).get("stage"),
    ).toBe("IDEA");
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
    expect(m.save).not.toHaveBeenCalled();
  });
  it("requires explicit conflict resolution and preserves the exact saved revision", async () => {
    const revision = "2026-11-10T12:00:00.123456Z";
    m.resolve.mockResolvedValue({ status: "success" });
    render(
      <OnboardingStepForm
        {...props}
        draft={{
          fields: { companyName: ["My draft"] },
          updated_at: revision,
          base_revision: revision,
          conflicted: true,
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByLabelText(/Company or startup name/)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep this draft" }));
    await waitFor(() => expect(m.refresh).toHaveBeenCalled());
    expect(m.resolve).toHaveBeenCalledExactlyOnceWith({
      organizationId: props.organizationId,
      step: "company",
      revision,
      keep: true,
    });
  });
  it("retains stable new Competitor IDs across raw draft resume", () => {
    const id = crypto.randomUUID(),
      fields = {
        competitors: [
          JSON.stringify([
            {
              id,
              name: "Fictional competitor",
              type: "DIRECT",
              instagram: "",
              website: "",
              relevance: "",
              shortDescription: "",
            },
          ]),
        ],
      };
    render(
      <OnboardingDraftContext value={fields}>
        <CompetitorEditor initialCompetitors={[]} />
      </OnboardingDraftContext>,
    );
    expect(screen.getByLabelText(/Name/)).toHaveValue("Fictional competitor");
    expect(
      JSON.parse(
        (document.querySelector("[name=competitors]") as HTMLInputElement)
          .value,
      )[0].id,
    ).toBe(id);
  });
});
