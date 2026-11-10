import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./requests", () => ({ saveExecution: m.save }));
import { NoteForm } from "./note-form";
import { MilestoneForm } from "./milestone-form";
import { NoteMemoryForm } from "./note-memory-form";
import type { CoreNoteRow } from "@/lib/supabase/database.types";
const record: CoreNoteRow = {
  id: crypto.randomUUID(),
  organization_id: crypto.randomUUID(),
  title: "Working decision",
  content: "# Draft\nA tentative observation.",
  created_by: crypto.randomUUID(),
  updated_by: crypto.randomUUID(),
  created_at: "2026-11-10T12:00:00Z",
  updated_at: "2026-11-10T12:00:00.123456Z",
  archived_at: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({ status: "success" });
});
afterEach(cleanup);
describe("working Note editing and explicit durable promotion", () => {
  it.each(["Note", "Milestone"])(
    "associates the %s title error and focuses its field without submitting",
    async (kind) => {
      render(
        kind === "Note" ? (
          <NoteForm onSaved={vi.fn()} />
        ) : (
          <MilestoneForm members={[]} onSaved={vi.fn()} />
        ),
      );
      fireEvent.click(screen.getByRole("button", { name: `Create ${kind}` }));
      const title = screen.getByLabelText(/Title/);
      expect(title).toHaveFocus();
      expect(title).toHaveAttribute("aria-invalid", "true");
      expect(title).toHaveAccessibleDescription(
        "Enter a title of at least two characters.",
      );
      expect(m.save).not.toHaveBeenCalled();
    },
  );
  it("keeps failed edits and preview text, without Memory writes on opening or typing", async () => {
    m.save.mockResolvedValue({
      status: "error",
      message: "This record changed. Reload.",
    });
    render(<NoteForm record={record} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "Retained working text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByText("Retained working text")).toBeInTheDocument();
    expect(m.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed");
    fireEvent.click(screen.getByRole("button", { name: "Edit text" }));
    expect(screen.getByLabelText("Content")).toHaveValue(
      "Retained working text",
    );
    expect(m.save.mock.calls[0]?.[0]).toMatchObject({
      operation: "note",
      revision: record.updated_at,
      content: "Retained working text",
    });
  });
  it("requires separate edited confirmation and exact reviewed Note revision for Memory", async () => {
    const saved = vi.fn();
    render(<NoteMemoryForm note={record} onSaved={saved} />);
    expect(m.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Memory title"), {
      target: { value: "Reviewed decision" },
    });
    fireEvent.change(screen.getByLabelText("Reviewed content"), {
      target: { value: "Only this reviewed conclusion is durable." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirm addition to Company Memory",
      }),
    );
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(m.save).toHaveBeenCalledExactlyOnceWith({
      operation: "note-memory",
      noteId: record.id,
      revision: record.updated_at,
      title: "Reviewed decision",
      content: "Only this reviewed conclusion is durable.",
      kind: "NOTE",
    });
  });
  it("never silently truncates a long Note into Memory", () => {
    render(
      <NoteMemoryForm
        note={{ ...record, content: "x".repeat(10001) }}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Reviewed content")).toHaveValue("");
    expect(screen.getByText(/nothing has been truncated/)).toBeInTheDocument();
    expect(m.save).not.toHaveBeenCalled();
  });
});
