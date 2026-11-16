import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
afterEach(cleanup);
const mocks = vi.hoisted(() => ({ read: vi.fn(), convert: vi.fn() }));
vi.mock("./board-entity-store", () => ({ readBoardEntities: mocks.read }));
vi.mock("@/modules/whiteboards/entity-actions", () => ({
  convertBoardEntityAction: mocks.convert,
}));
import { BoardEntityDialog } from "./board-entity-dialog";
const org = crypto.randomUUID(),
  board = crypto.randomUUID(),
  source = crypto.randomUUID(),
  target = crypto.randomUUID(),
  card = crypto.randomUUID();
const type = {
  id: "core.task",
  label: "Task",
  icon: "task",
  binding: "live",
  routePrefix: "/tasks",
  creatable: true,
  searchable: true,
  fields: [
    {
      key: "title",
      label: "Title",
      kind: "text",
      required: true,
      maxLength: 200,
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      maxLength: 5000,
    },
  ],
};
beforeEach(() => {
  mocks.read.mockReset();
  mocks.convert.mockReset();
  mocks.read.mockImplementation(async (_scope, input) =>
    input.operation === "preview"
      ? {
          preview: {
            title: "Selected text",
            text: "Explicit Board content",
            sourceIds: [source],
            truncated: false,
          },
        }
      : input.operation === "recover"
        ? { card: null }
        : { types: [type], recoveries: [] },
  );
  mocks.convert.mockResolvedValue({
    status: "success",
    data: {
      reference: {
        organizationId: org,
        entityType: "core.task",
        entityId: target,
      },
      cardId: card,
    },
  });
});
describe("reviewed native conversion", () => {
  it("does not resurrect an explicitly archived conversion card after reload", async () => {
    const attemptId = crypto.randomUUID();
    mocks.read.mockImplementation(async (_scope, input) =>
      input.operation === "recover"
        ? {
            receipt: {
              id: attemptId,
              entity_type: "core.task",
              source_ids: [source],
              input: { title: "Recorded task", description: "Reviewed" },
            },
            card: { id: card, archived_at: "2026-11-04T00:00:00Z" },
          }
        : { types: [type], recoveries: [] },
    );
    render(
      <BoardEntityDialog
        scope={{ organizationId: org, boardId: board }}
        request={{ mode: "recover", attemptId }}
        members={[]}
        onClose={() => {}}
        onResume={() => {}}
        onInsert={vi.fn()}
        onLinked={vi.fn()}
        onRefresh={() => {}}
      />,
    );
    await screen.findByText(/recovery will not undo that archive/);
    expect(
      screen.getByRole("button", { name: "Retry this conversion" }),
    ).toBeDisabled();
    expect(mocks.convert).not.toHaveBeenCalled();
  });
  it("executes only after submission, retains the same attempt through linking failure and retries", async () => {
    const insert = vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      close = vi.fn();
    render(
      <BoardEntityDialog
        scope={{ organizationId: org, boardId: board }}
        request={{
          mode: "convert",
          entityType: "core.task",
          sourceIds: [source],
        }}
        members={[]}
        onClose={close}
        onResume={() => {}}
        onInsert={insert}
        onLinked={() => {}}
        onRefresh={() => {}}
      />,
    );
    await screen.findByDisplayValue("Selected text");
    expect(mocks.convert).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Reviewed task" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create and link" }));
    await screen.findByText(/The item exists, but its Board link/);
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Title/)).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry this conversion" }),
    );
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(mocks.convert).toHaveBeenCalledTimes(2);
    expect(mocks.convert.mock.calls[1]?.[0]).toEqual(
      mocks.convert.mock.calls[0]?.[0],
    );
    expect(mocks.convert.mock.calls[0]?.[0].fields.title).toBe("Reviewed task");
    expect(insert.mock.calls[1]).toEqual(insert.mock.calls[0]);
  });
  it("allows correcting invalid preview fields before a receipt is allocated", async () => {
    mocks.convert.mockResolvedValue({
      status: "error",
      code: "VALIDATION",
      message: "Enter a task title.",
    });
    render(
      <BoardEntityDialog
        scope={{ organizationId: org, boardId: board }}
        request={{
          mode: "convert",
          entityType: "core.task",
          sourceIds: [source],
        }}
        members={[]}
        onClose={() => {}}
        onResume={() => {}}
        onInsert={vi.fn()}
        onLinked={() => {}}
        onRefresh={() => {}}
      />,
    );
    await screen.findByDisplayValue("Selected text");
    fireEvent.click(screen.getByRole("button", { name: "Create and link" }));
    await screen.findByText("Enter a task title.");
    expect(screen.getByLabelText(/Title/)).not.toBeDisabled();
  });
});
