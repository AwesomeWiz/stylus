import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { board, object } from "@/test/board-fixtures";
const apply = vi.hoisted(() => vi.fn());
vi.mock("@/modules/whiteboards/actions", () => ({
  applyBoardOperationAction: apply,
}));
import { useBoardDocument } from "./use-board-document";
afterEach(cleanup);
describe("failed Board intent recovery", () => {
  it("rolls back only the failed edit, retains remote work/history, and accepts the next operation", async () => {
    const a = object(),
      b = object();
    apply
      .mockResolvedValueOnce({ status: "success", data: [{ ...a, x: 50 }] })
      .mockResolvedValueOnce({
        status: "error",
        code: "INFRASTRUCTURE",
        message: "Saved state restored.",
      })
      .mockResolvedValueOnce({ status: "success", data: [{ ...a, x: 70 }] });
    const { result } = renderHook(() => useBoardDocument(board, [a, b], true));
    await act(async () => {
      await result.current.commit([{ ...a, x: 50 }, b]);
    });
    await act(async () => {
      await result.current.commit([{ ...a, x: 100 }, b]);
    });
    expect(result.current.rows.find((r) => r.id === a.id)!.x).toBe(50);
    expect(result.current.history.past).toHaveLength(1);
    expect(result.current.isDirty()).toBe(false);
    expect(result.current.hasRetry).toBe(true);
    await act(async () => {
      await result.current.commit([{ ...result.current.rows[0]!, x: 70 }, b]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.hasRetry).toBe(false);
  });
  it("retries a failed creation with the same identity after removing its optimistic row", async () => {
    const a = object();
    apply
      .mockResolvedValueOnce({ status: "error", message: "Temporary error" })
      .mockResolvedValueOnce({ status: "success", data: [a] });
    const { result } = renderHook(() => useBoardDocument(board, [], true));
    await act(async () => {
      await result.current.commit([a]);
    });
    expect(result.current.rows).toHaveLength(0);
    await act(async () => {
      result.current.retry();
    });
    expect(result.current.rows[0]!.id).toBe(a.id);
    expect(result.current.history.past).toHaveLength(1);
    expect(apply.mock.calls.at(-1)![0].upserts[0].id).toBe(a.id);
  });
  it.each([
    "AUTHORIZATION",
    "LOCKED",
    "LIMIT",
    "VALIDATION",
    "SCHEMA",
    "CONFLICT",
  ])("restores a valid document for %s", async (code) => {
    const a = object();
    apply.mockResolvedValue({
      status: "error",
      code,
      message: "A safe local error",
    });
    const { result } = renderHook(() => useBoardDocument(board, [a], true));
    await act(async () => {
      await result.current.commit([{ ...a, x: 100 }]);
    });
    expect(result.current.rows[0]!.x).toBe(a.x);
    expect(result.current.dirty).toBe(false);
    expect(result.current.hasReload).toBe(code === "CONFLICT");
  });
});
