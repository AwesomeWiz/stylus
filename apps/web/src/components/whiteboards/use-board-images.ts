"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import { readBoardImagesAction } from "@/modules/whiteboards/read-actions";

export function useBoardImages(
  board: BoardRow,
  rows: BoardElementRow[],
  initial: Record<string, string>,
  visibleIds?: string[],
) {
  const [urls, setUrls] = useState(initial);
  const paths = useRef(
    new Map(
      rows
        .filter((row) => initial[row.id])
        .map((row) => [row.id, String(row.metadata.storagePath)]),
    ),
  );
  const requested = useRef(new Set<string>());
  const generation = useRef(new Map<string, number>());
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const resolve = useCallback(
    async (ids: string[], force = false) => {
      const candidates = ids.filter((id) => {
        const row = rowsRef.current.find((item) => item.id === id);
        if (!row || row.element_type !== "IMAGE") return false;
        const key = `${id}:${row.metadata.storagePath}`;
        if (!force && requested.current.has(key)) return false;
        requested.current.add(key);
        generation.current.set(id, (generation.current.get(id) ?? 0) + 1);
        return true;
      });
      for (let start = 0; start < candidates.length; start += 25) {
        const batch = candidates.slice(start, start + 25);
        const expected = batch.map((id) => ({
          id,
          path: String(
            rowsRef.current.find((row) => row.id === id)?.metadata.storagePath,
          ),
          generation: generation.current.get(id),
        }));
        const apply = (
          images: readonly { id: string; path: string; url: string | null }[],
        ) => {
          if (!mounted.current) return;
          const updates: Record<string, string> = {};
          for (const item of expected) {
            if (
              generation.current.get(item.id) !== item.generation ||
              String(
                rowsRef.current.find((row) => row.id === item.id)?.metadata
                  .storagePath,
              ) !== item.path
            )
              continue;
            paths.current.set(item.id, item.path);
            updates[item.id] =
              images.find(
                (image) => image.id === item.id && image.path === item.path,
              )?.url ?? "";
          }
          if (Object.keys(updates).length)
            setUrls((before) => ({ ...before, ...updates }));
        };
        try {
          const result = await readBoardImagesAction({
            boardId: board.id,
            organizationId: board.organization_id,
            ids: batch,
          });
          apply(result.status === "success" ? result.images : []);
        } catch {
          apply([]); // A completed failure must not remain labeled "Loading".
        }
      }
    },
    [board.id, board.organization_id],
  );
  const visibleSignature = visibleIds?.join("|") ?? null;
  const eligible = useMemo(
    () =>
      visibleSignature === null
        ? null
        : new Set(visibleSignature ? visibleSignature.split("|") : []),
    [visibleSignature],
  );
  const signature = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.element_type === "IMAGE" && (!eligible || eligible.has(row.id)),
        )
        .map((row) => `${row.id}:${row.metadata.storagePath}`)
        .join("|"),
    [rows, eligible],
  );
  useEffect(() => {
    void resolve(
      rowsRef.current
        .filter(
          (row) =>
            row.element_type === "IMAGE" && (!eligible || eligible.has(row.id)),
        )
        .map((row) => row.id),
    );
  }, [resolve, signature, eligible]);
  const url = useCallback(
    (row: BoardElementRow) =>
      paths.current.get(row.id) === String(row.metadata.storagePath)
        ? urls[row.id]
        : undefined,
    [urls],
  );
  const retry = useCallback(
    (id: string) => {
      void resolve([id], true);
    },
    [resolve],
  );
  const accept = useCallback((row: BoardElementRow, value: string) => {
    generation.current.set(row.id, (generation.current.get(row.id) ?? 0) + 1);
    paths.current.set(row.id, String(row.metadata.storagePath));
    setUrls((before) => ({ ...before, [row.id]: value }));
  }, []);
  return { url, retry, accept };
}
