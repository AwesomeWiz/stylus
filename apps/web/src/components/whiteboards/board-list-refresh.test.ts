import { afterEach, describe, it, expect } from "vitest";
import {
  markBoardListChanged,
  consumeBoardListChange,
} from "./board-list-refresh";
afterEach(() => sessionStorage.clear());
describe("list freshness after local editor reconciliation", () => {
  it("consumes one account/organization-scoped boolean without exposing data across scopes", () => {
    markBoardListChanged("a", "one");
    expect(consumeBoardListChange("b", "one")).toBe(false);
    expect(consumeBoardListChange("a", "two")).toBe(false);
    expect(consumeBoardListChange("a", "one")).toBe(true);
    expect(consumeBoardListChange("a", "one")).toBe(false);
  });
});
