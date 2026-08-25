import { describe, expect, it } from "vitest";

import { notificationDestination } from "./routing";

describe("notification routing", () => {
  it("derives only known internal task destinations", () => {
    expect(
      notificationDestination({
        entity_id: "20000000-0000-4000-8000-000000000001",
        entity_type: "TASK",
      }),
    ).toBe("/tasks?view=all&task=20000000-0000-4000-8000-000000000001");
    expect(
      notificationDestination({ entity_id: null, entity_type: null }),
    ).toBeNull();
  });
});
