import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { GrowthEvaluationForm } from "./growth-evaluation-form";
import { GrowthMemoryForm } from "./growth-memory-form";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  search: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/modules/marketing/growth-actions", () => ({
  mutateGrowthAction: mocks.mutate,
  findGrowthChoicesAction: mocks.search,
}));
import { GrowthRecordForm } from "./growth-forms";
import type { GrowthRow } from "@/modules/marketing/growth";
afterEach(cleanup);
const id = crypto.randomUUID(),
  org = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  experiment: GrowthRow = {
    id,
    organization_id: org,
    hypothesis_id: crypto.randomUUID(),
    title: "Setup experiment",
    success_criteria: "7 of 10 complete",
    status: "EVALUATING",
    created_by: actor,
    updated_by: actor,
    created_at: "2026-11-09T00:00:00Z",
    updated_at: "2026-11-09T00:00:00Z",
    archived_at: null,
  };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutate.mockImplementation(async (input) => ({
    status: "success",
    data: { id: input.id ?? id, operation: input.operation },
  }));
  mocks.search.mockResolvedValue({
    status: "success",
    data: { items: [], hasMore: false },
  });
});
describe("reviewed growth forms", () => {
  it("retains text and creation identity after an interrupted response", async () => {
    const saved = vi.fn();
    mocks.mutate.mockRejectedValueOnce(Error("Network interrupted"));
    render(<GrowthRecordForm kind="hypothesis" members={[]} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Clear first step" },
    });
    fireEvent.change(screen.getByLabelText(/Testable belief/), {
      target: { value: "We believe a clear next step helps" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create hypothesis" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText(/Testable belief/)).toHaveValue(
      "We believe a clear next step helps",
    );
    expect(saved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create hypothesis" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[1]![0].id).toBe(
      mocks.mutate.mock.calls[0]![0].id,
    );
  });
  it("does not invent a Learning or silently update the Hypothesis", async () => {
    render(<GrowthEvaluationForm experiment={experiment} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/What happened/), {
      target: { value: "The small sample was mixed" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Complete experiment" }),
    );
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
      operation: "evaluate",
      outcome: "INCONCLUSIVE",
      learning: null,
      updateHypothesis: false,
      revision: experiment.updated_at,
    });
  });
  it("creates an optional reviewed Learning only when requested", async () => {
    render(<GrowthEvaluationForm experiment={experiment} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/What happened/), {
      target: { value: "Eight of ten completed unaided" },
    });
    fireEvent.click(screen.getByLabelText("Supported"));
    fireEvent.click(screen.getByLabelText(/Record an accepted Learning/));
    fireEvent.change(screen.getByLabelText(/Learning title/), {
      target: { value: "Setup clarity" },
    });
    fireEvent.change(screen.getByLabelText(/What did we learn/), {
      target: { value: "Clear first steps helped this sample" },
    });
    fireEvent.click(screen.getByLabelText(/Also update the Hypothesis/));
    fireEvent.click(
      screen.getByRole("button", { name: "Complete experiment" }),
    );
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
      outcome: "SUPPORTED",
      learning: {
        title: "Setup clarity",
        conclusion: "Clear first steps helped this sample",
      },
      updateHypothesis: true,
    });
  });
  it("opening Memory preview does nothing until edited text is confirmed", async () => {
    render(
      <GrowthMemoryForm
        learning={{
          ...experiment,
          experiment_id: id,
          title: "Setup insight",
          conclusion: "A reviewed conclusion",
        }}
        onSaved={vi.fn()}
      />,
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Approved text/), {
      target: { value: "Edited durable knowledge" },
    });
    fireEvent.change(screen.getByLabelText(/Memory type/), {
      target: { value: "INSIGHT" },
    });
    expect(mocks.mutate).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Add to Company Memory" }),
    );
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0]![0]).toEqual({
      operation: "promote",
      learningId: id,
      title: "Setup insight",
      content: "Edited durable knowledge",
      kind: "INSIGHT",
    });
  });
});
