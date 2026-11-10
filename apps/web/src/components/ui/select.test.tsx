import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Select } from "./select";
import { Dialog } from "./dialog";
afterEach(cleanup);
describe("shared form selection", () => {
  it("Escape closes the inner popup before the enclosing Radix dialog", () => {
    const close = vi.fn();
    render(
      <Dialog
        open
        onOpenChange={close}
        title="Edit Task"
        description="Task form"
      >
        <label>
          Priority
          <Select name="priority" defaultValue="MEDIUM">
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </label>
      </Dialog>,
    );
    const trigger = screen.getByRole("combobox", { name: /Priority/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("option", { name: "Medium" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
  });
  it("preserves form fields and native change events through keyboard selection and modal focus", () => {
    const changed = vi.fn();
    render(
      <div role="dialog">
        <form aria-label="Task">
          <label htmlFor="priority">Priority</label>
          <Select
            id="priority"
            name="priority"
            defaultValue="MEDIUM"
            onChange={(e) => changed(e.currentTarget.value)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
          <button>Next</button>
        </form>
      </div>,
    );
    const trigger = screen.getByRole("combobox", { name: "Priority" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const medium = screen.getByRole("option", { name: "Medium" });
    expect(medium).toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(medium);
    fireEvent.keyDown(medium, { key: "End" });
    const high = screen.getByRole("option", { name: "High" });
    expect(high).toHaveFocus();
    fireEvent.click(high);
    expect(changed).toHaveBeenCalledExactlyOnceWith("HIGH");
    expect(
      new FormData(screen.getByRole("form") as HTMLFormElement).get("priority"),
    ).toBe("HIGH");
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("option", { name: "High" }), {
      key: "Tab",
    });
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("skips disabled options, cancels without changes and preserves a controlled value", () => {
    const changed = vi.fn();
    render(
      <label>
        Owner
        <Select name="owner" value="a" onChange={changed}>
          <option value="a">Alpha</option>
          <option value="b" disabled>
            Unavailable member
          </option>
          <option value="c">Charlie</option>
        </Select>
      </label>,
    );
    const trigger = screen.getByRole("combobox", { name: /Owner/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("option", { name: "Alpha" }), {
      key: "ArrowDown",
    });
    expect(screen.getByRole("option", { name: "Charlie" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("option", { name: "Charlie" }), {
      key: "Escape",
    });
    expect(trigger).toHaveFocus();
    expect(changed).not.toHaveBeenCalled();
  });
  it("resets an uncontrolled form selection to its original default", () => {
    render(
      <form>
        <label>
          Role
          <Select name="role" defaultValue="MEMBER">
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </Select>
        </label>
      </form>,
    );
    const trigger = screen.getByRole("combobox", { name: /Role/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Viewer" }));
    expect(trigger).toHaveTextContent("Viewer");
    fireEvent.reset(trigger.closest("form")!);
    expect(trigger).toHaveTextContent("Member");
    expect(new FormData(trigger.closest("form")!).get("role")).toBe("MEMBER");
  });
});
