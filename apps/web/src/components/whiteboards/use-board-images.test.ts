import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/modules/whiteboards/read-actions", () => ({
  readBoardImagesAction: read,
}));
import { board, object } from "@/test/board-fixtures";
import { useBoardImages } from "./use-board-images";
describe("Deferred private image previews", () => {
  beforeEach(() => vi.clearAllMocks());
  it("finishes a failed signing state honestly and retries without uploading", async () => {
    const row = object({
      element_type: "IMAGE",
      metadata: {
        storagePath: `${board.organization_id}/${board.id}/asset.png`,
      },
    });
    read
      .mockResolvedValueOnce({ status: "error", message: "Unavailable" })
      .mockResolvedValueOnce({
        status: "success",
        images: [
          { id: row.id, path: row.metadata.storagePath, url: "signed-current" },
        ],
      });
    const { result } = renderHook(() => useBoardImages(board, [row], {}));
    await waitFor(() => expect(result.current.url(row)).toBe(""));
    act(() => result.current.retry(row.id));
    await waitFor(() => expect(result.current.url(row)).toBe("signed-current"));
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("rejects a late signing response after an image is replaced", async () => {
    const row = object({
        element_type: "IMAGE",
        metadata: {
          storagePath: `${board.organization_id}/${board.id}/first.png`,
        },
      }),
      next = {
        ...row,
        metadata: {
          storagePath: `${board.organization_id}/${board.id}/replacement.png`,
        },
      };
    let complete!: (value: unknown) => void;
    read
      .mockReturnValueOnce(
        new Promise((done) => {
          complete = done;
        }),
      )
      .mockResolvedValueOnce({
        status: "success",
        images: [
          {
            id: next.id,
            path: next.metadata.storagePath,
            url: "signed-replacement",
          },
        ],
      });
    const { result, rerender } = renderHook(
      ({ rows }) => useBoardImages(board, rows, {}),
      { initialProps: { rows: [row] } },
    );
    rerender({ rows: [next] });
    await waitFor(() =>
      expect(result.current.url(next)).toBe("signed-replacement"),
    );
    await act(async () =>
      complete({
        status: "success",
        images: [
          { id: row.id, path: row.metadata.storagePath, url: "stale-original" },
        ],
      }),
    );
    expect(result.current.url(next)).toBe("signed-replacement");
  });
});
