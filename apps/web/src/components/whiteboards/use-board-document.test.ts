import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const apply = vi.hoisted(() => vi.fn());
vi.mock("@/modules/whiteboards/actions", () => ({
  applyBoardOperationAction: apply,
}));
import { board, object } from "@/test/board-fixtures";
import { useBoardDocument } from "./use-board-document";
describe("Board document concurrency", () => {
  it("preserves PostgreSQL microsecond ordering and final same-transaction row changes", () => {
    const row = object({ updated_at: "2026-11-02T00:00:00.123100+00:00" });
    const { result } = renderHook(() => useBoardDocument(board, [row], true));
    act(() =>
      result.current.receive({
        ...row,
        x: 100,
        updated_at: "2026-11-02T00:00:00.123200+00:00",
      }),
    );
    expect(result.current.rows[0]!.x).toBe(100);
    act(() =>
      result.current.receive({
        ...row,
        x: 200,
        updated_at: "2026-11-02T00:00:00.123200+00:00",
      }),
    );
    expect(result.current.rows[0]!.x).toBe(200);
    act(() =>
      result.current.receive({
        ...row,
        x: 300,
        updated_at: "2026-11-02T00:00:00.123150+00:00",
      }),
    );
    expect(result.current.rows[0]!.x).toBe(200);
  });
  beforeEach(() => vi.clearAllMocks());
  it("keeps a newer remote winner and invalidates conflicting local history", async () => {
    const row = object(),
      remote = { ...row, x: 900, updated_at: "2026-11-03T00:00:00Z" };
    let resolve!: (value: unknown) => void;
    apply.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useBoardDocument(board, [row], true));
    act(() => {
      result.current.startInteraction(row.id);
      void result.current.commit([{ ...row, x: 100 }]);
      result.current.receive(remote);
    });
    expect(result.current.rows[0]!.x).toBe(100);
    await act(async () =>
      resolve({
        status: "success",
        data: [{ ...row, x: 100, updated_at: "2026-11-02T00:00:00Z" }],
      }),
    );
    expect(result.current.rows[0]!.x).toBe(900);
    expect(result.current.history.past).toHaveLength(0);
  });
  it("deduplicates its own pre-response Realtime echo without erasing undo", async () => {
    const row = object(),
      saved = { ...row, x: 100, updated_at: "2026-11-02T00:00:00Z" };
    let resolve!: (value: unknown) => void;
    apply.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useBoardDocument(board, [row], true));
    act(() => {
      void result.current.commit([{ ...row, x: 100 }]);
      result.current.receive(saved);
    });
    await act(async () => resolve({ status: "success", data: [saved] }));
    act(() => result.current.receive(saved));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.history.past).toHaveLength(1);
  });
  it("rejects foreign updates and refuses a snapshot that raced with another change", () => {
    const row = object(),
      { result } = renderHook(() => useBoardDocument(board, [row], true));
    const revision = result.current.getRevision();
    act(() =>
      result.current.receive({
        ...row,
        organization_id: crypto.randomUUID(),
        x: 100,
      }),
    );
    expect(result.current.rows[0]!.x).toBe(row.x);
    act(() =>
      result.current.receive({
        ...row,
        x: 200,
        updated_at: "2026-11-02T00:00:00Z",
      }),
    );
    let merged = true;
    act(() => {
      merged = result.current.mergeSnapshot([row], revision);
    });
    expect(merged).toBe(false);
    expect(result.current.rows[0]!.x).toBe(200);
  });
  it("reconciles a missed remote archive and keeps unrelated history intact", async () => {
    const a = object(),
      b = object();
    apply.mockResolvedValue({
      status: "success",
      data: [{ ...a, x: 100, updated_at: "2026-11-02T00:00:00Z" }],
    });
    const { result } = renderHook(() => useBoardDocument(board, [a, b], true));
    await act(async () => {
      await result.current.commit([{ ...a, x: 100 }, b]);
    });
    act(() => {
      result.current.mergeSnapshot(
        [result.current.rows.find((row) => row.id === a.id)!],
        result.current.getRevision(),
      );
    });
    expect(result.current.rows.map((row) => row.id)).toEqual([a.id]);
    expect(result.current.history.past).toHaveLength(1);
  });
  it("validates form changes before publishing optimistic state", async () => {
    const row = object(),
      { result } = renderHook(() => useBoardDocument(board, [row], true));
    await act(async () => {
      expect(await result.current.commit([{ ...row, width: 0 }])).toBe(false);
    });
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.rows[0]!.width).toBe(row.width);
    expect(result.current.dirty).toBe(false);
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it("ignores duplicate/out-of-order events including a stale resurrection after archive", () => {
    const row = object(),
      archived = {
        ...row,
        updated_at: "2026-11-03T00:00:00Z",
        archived_at: "2026-11-03T00:00:00Z",
      };
    const { result } = renderHook(() => useBoardDocument(board, [row], true));
    act(() => result.current.receive(archived));
    expect(result.current.rows).toHaveLength(0);
    act(() => {
      result.current.receive(row);
      result.current.receive(archived);
    });
    expect(result.current.rows).toHaveLength(0);
  });
  it("requires reload instead of replaying a failed intent over a collaborator change", async () => {
    const row = object();
    apply.mockResolvedValue({ status: "error", message: "Save failed" });
    const { result } = renderHook(() => useBoardDocument(board, [row], true));
    await act(async () => {
      await result.current.commit([{ ...row, x: 100 }]);
    });
    expect(result.current.hasRetry).toBe(true);
    act(() =>
      result.current.receive({
        ...row,
        x: 900,
        updated_at: "2026-11-03T00:00:00Z",
      }),
    );
    expect(result.current.hasRetry).toBe(false);
    expect(result.current.dirty).toBe(true);
    expect(result.current.error).toMatch(/Reload/);
    act(() => {
      result.current.retry();
      result.current.navigate("REDO");
      result.current.navigate("UNDO");
    });
    expect(apply).toHaveBeenCalledOnce();
  });
});
