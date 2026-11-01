import { describe, expect, it } from "vitest";
import { taskHref } from "./url-state";
describe("Task URL state", () => {
  it("opens and closes selection without losing list or unrelated query state", () => {
    const context =
      "view=archive&query=launch&assignee=unassigned&status=COMPLETED&priority=HIGH&custom=1";
    const selected = taskHref(context, { task: "task-1" });
    expect(selected).toBe(`/tasks?${context}&task=task-1`);
    expect(taskHref(selected.split("?")[1]!, { task: null })).toBe(
      `/tasks?${context}`,
    );
  });
  it("changes one filter while preserving selection and the view", () => {
    expect(
      taskHref("view=all&query=old&task=id", {
        query: "new phrase",
        status: "TODO",
      }),
    ).toBe("/tasks?view=all&query=new+phrase&task=id&status=TODO");
    expect(taskHref("task=id", { task: null })).toBe("/tasks");
  });
});
