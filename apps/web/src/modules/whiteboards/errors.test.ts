import { describe, it, expect } from "vitest";
import { classifyBoardError } from "./errors";
import { WhiteboardMutationDeniedError } from "./authorization";
describe("safe Board error classification", () => {
  it.each([
    [
      { code: "PGRST202", message: "public.apply_board_operation not found" },
      "SCHEMA",
    ],
    [{ code: "42501" }, "AUTHORIZATION"],
    [new WhiteboardMutationDeniedError(), "AUTHORIZATION"],
    [
      { code: "23514", message: "Unlock this object and its container" },
      "LOCKED",
    ],
    [{ code: "22023", message: "Operation exceeds 200 objects" }, "LIMIT"],
    [{ code: "40001" }, "CONFLICT"],
    [
      { code: "23514", message: "Invalid ownership sensitive SQL" },
      "VALIDATION",
    ],
    [new Error("private stack / connection credentials"), "INFRASTRUCTURE"],
  ])("returns only safe codes and messages", (error, code) => {
    const result = classifyBoardError(error);
    expect(result.code).toBe(code);
    expect(result.message).not.toMatch(
      /sensitive|credentials|apply_board_operation/,
    );
  });
});
