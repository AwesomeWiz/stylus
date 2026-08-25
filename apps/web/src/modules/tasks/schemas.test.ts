import { describe, expect, it } from "vitest";

import { createTaskSchema } from "./schemas";

function validInput() {
  return {
    assigneeId: "",
    description: "",
    dueAt: "2026-08-26T12:00:00.000Z",
    priority: "MEDIUM",
    scheduledAt: "2026-08-25T12:00:00.000Z",
    title: "Prepare launch notes",
  };
}

describe("task input validation", () => {
  it("supports a quick unassigned task", () => {
    expect(createTaskSchema.parse(validInput())).toMatchObject({
      assigneeId: null,
      description: "",
      priority: "MEDIUM",
    });
  });

  it("rejects invalid timestamps independent of machine timezone", () => {
    expect(
      createTaskSchema.safeParse({ ...validInput(), dueAt: "tomorrow" })
        .success,
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({ ...validInput(), dueAt: "2026-08-26T12:00" })
        .success,
    ).toBe(false);
  });

  it("rejects a due time before the scheduled time", () => {
    const result = createTaskSchema.safeParse({
      ...validInput(),
      dueAt: "2026-08-24T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.flatten().fieldErrors.dueAt).toBeDefined();
  });
});
