"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
import { uploadBoardImageAction } from "@/modules/whiteboards/actions";
import { boardImageFileSchema } from "@/modules/whiteboards/schemas";
import { nextZIndex } from "@/modules/whiteboards/elements";
interface Upload {
  id: string;
  file: File;
  position: { x: number; y: number };
  replace?: string;
  state: "Queued" | "Uploading" | "Uploaded" | "Error";
  error?: string;
}
export function useBoardUploads(
  board: BoardRow,
  getRows: () => BoardElementRow[],
  onStart: (id: string) => void,
  onCancel: (id: string) => void,
  onUploaded: (row: BoardElementRow, url: string, created: boolean) => void,
) {
  const [items, setItems] = useState<Upload[]>([]),
    [error, setError] = useState<string | null>(null);
  const queue = useRef<Upload[]>([]),
    running = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const process = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        if (!alive.current) break;
        const item = queue.current.find((entry) => entry.state === "Queued");
        if (!item) break;
        item.state = "Uploading";
        setItems([...queue.current]);
        if (item.replace) onStart(item.replace);
        try {
          const form = new FormData();
          form.set("boardId", board.id);
          form.set("uploadId", item.id);
          form.set("file", item.file);
          let width = 320,
            height = 240;
          try {
            if (typeof createImageBitmap === "function") {
              const bitmap = await createImageBitmap(item.file);
              const scale = Math.min(320 / bitmap.width, 240 / bitmap.height);
              width = Math.max(24, Math.round(bitmap.width * scale));
              height = Math.max(24, Math.round(bitmap.height * scale));
              bitmap.close();
            }
          } catch {
            /* Storage still applies the existing MIME/size policy. */
          }
          form.set("x", String(item.position.x));
          form.set("y", String(item.position.y));
          form.set("width", String(width));
          form.set("height", String(height));
          form.set("zIndex", String(nextZIndex(getRows())));
          if (item.replace) form.set("replaceElementId", item.replace);
          const result = await uploadBoardImageAction(form);
          if (result.status === "error") throw new Error(result.message);
          if (alive.current)
            onUploaded(
              result.data.element,
              result.data.signedUrl,
              !item.replace,
            );
          item.state = "Uploaded";
        } catch (caught) {
          item.state = "Error";
          item.error =
            caught instanceof Error
              ? caught.message
              : "Upload failed. Retry this file.";
          if (item.replace) onCancel(item.replace);
        }
        if (alive.current) setItems([...queue.current]);
      }
    } finally {
      running.current = false;
    }
  }, [board.id, getRows, onCancel, onStart, onUploaded]);
  const add = useCallback(
    (files: File[], position: { x: number; y: number }, replace?: string) => {
      if (
        files.length > 10 ||
        queue.current.filter((entry) =>
          ["Queued", "Uploading", "Error"].includes(entry.state),
        ).length +
          files.length >
          10
      ) {
        setError(
          "Choose up to 10 images per batch. Finish or dismiss the current batch first.",
        );
        return;
      }
      setError(null);
      const next = files.map((file, index): Upload => {
        const valid = boardImageFileSchema.safeParse(file);
        return {
          id: crypto.randomUUID(),
          file,
          position: { x: position.x + index * 32, y: position.y + index * 32 },
          replace,
          state: valid.success ? "Queued" : "Error",
          error: valid.success ? undefined : valid.error.issues[0]?.message,
        };
      });
      queue.current = [
        ...queue.current.filter((entry) => entry.state !== "Uploaded"),
        ...next,
      ];
      setItems([...queue.current]);
      void process();
    },
    [process],
  );
  return {
    items,
    error,
    add,
    pending: items.some((item) => ["Queued", "Uploading"].includes(item.state)),
    retry: (id: string) => {
      const item = queue.current.find((row) => row.id === id);
      if (item && boardImageFileSchema.safeParse(item.file).success) {
        item.state = "Queued";
        item.error = undefined;
        setItems([...queue.current]);
        void process();
      }
    },
    dismiss: () => {
      queue.current = queue.current.filter((row) =>
        ["Queued", "Uploading"].includes(row.state),
      );
      setItems([...queue.current]);
      setError(null);
    },
  };
}
