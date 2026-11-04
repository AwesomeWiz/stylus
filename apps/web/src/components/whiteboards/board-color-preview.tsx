"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
export function createBoardColorPreview() {
  const entries = new Map<
      string,
      { owner: string; style: Record<string, unknown> }
    >(),
    listeners = new Map<string, Set<() => void>>();
  const notify = (id: string) => {
    for (const listener of listeners.get(id) ?? []) listener();
  };
  return {
    subscribe(id: string, listener: () => void) {
      const set = listeners.get(id) ?? new Set();
      set.add(listener);
      listeners.set(id, set);
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(id);
      };
    },
    get: (id: string) => entries.get(id)?.style ?? null,
    set(id: string, owner: string, style: Record<string, unknown>) {
      entries.set(id, { owner, style });
      notify(id);
    },
    clear(id: string, owner: string) {
      if (entries.get(id)?.owner === owner) {
        entries.delete(id);
        notify(id);
      }
    },
  };
}
export const BoardColorPreviewContext = createContext<ReturnType<
  typeof createBoardColorPreview
> | null>(null);
const absent = () => null,
  noop = () => () => {};
export function useBoardColorRow(row: BoardElementRow) {
  const store = useContext(BoardColorPreviewContext);
  const style = useSyncExternalStore(
    store ? (listener) => store.subscribe(row.id, listener) : noop,
    store ? () => store.get(row.id) : absent,
    absent,
  );
  return useMemo(
    () => (style ? { ...row, style: { ...row.style, ...style } } : row),
    [row, style],
  );
}
