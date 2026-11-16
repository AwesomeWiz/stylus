import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/modules/execution/actions", () => ({
  searchExecutionAction: m.search,
}));
import { ExecutionChoicePicker } from "./choice-picker";
beforeEach(() => {
  vi.clearAllMocks();
  m.search.mockResolvedValue({
    status: "success",
    data: {
      items: [{ id: "canonical", title: "Chosen Task", status: "TODO" }],
      more: false,
    },
  });
});
afterEach(cleanup);
describe("explicit bounded canonical record search", () => {
  it("supports Enter without submitting a surrounding edit form or querying on raw typing", async () => {
    const submit = vi.fn(),
      select = vi.fn();
    render(
      <form onSubmit={submit}>
        <ExecutionChoicePicker kind="task" onSelect={select} />
      </form>,
    );
    fireEvent.change(screen.getByLabelText("Find a task"), {
      target: { value: "Chosen" },
    });
    expect(m.search).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText("Find a task"), { key: "Enter" });
    await screen.findByRole("button", { name: /Chosen Task/ });
    expect(m.search).toHaveBeenCalledExactlyOnceWith({
      kind: "task",
      query: "Chosen",
    });
    expect(submit).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Chosen Task/ }));
    expect(select).toHaveBeenCalledWith({
      id: "canonical",
      title: "Chosen Task",
      status: "TODO",
    });
  });
  it("discards stale query results and preserves an isolated retry", async () => {
    let finish: (r: unknown) => void = () => {};
    m.search.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      }),
    );
    render(<ExecutionChoicePicker kind="task" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Search records" }));
    fireEvent.change(screen.getByLabelText("Find a task"), {
      target: { value: "Changed" },
    });
    await act(async () =>
      finish({
        status: "success",
        data: {
          items: [{ id: "old", title: "Old private result", status: "TODO" }],
          more: false,
        },
      }),
    );
    expect(screen.queryByText("Old private result")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Search records" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Chosen Task/ }),
      ).toBeInTheDocument(),
    );
  });
});
