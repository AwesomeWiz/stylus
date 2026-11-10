"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import {
  entityReferenceKey,
  entityReferenceSchema,
  type EntityReference,
  type EntityResolution,
} from "@/core/entities/public";
import type {
  BoardElementRow,
  BoardEntityConversionRow,
} from "@/lib/supabase/database.types";
import type { EntityRegistry } from "@/core/entities/public";

export type BoardEntityType = ReturnType<EntityRegistry["discover"]>[number];
export type EntityReadResult = {
  organizationId: string;
  boardId: string;
  types: BoardEntityType[];
  resolutions?: EntityResolution[];
  items?: EntityResolution[];
  hasMore?: boolean;
  cursor?: string;
  preview?: {
    fields?: Record<string, string>;
    title: string;
    text: string;
    truncated: boolean;
    sourceIds: string[];
  };
  recoveries?: Pick<
    BoardEntityConversionRow,
    "id" | "entity_type" | "state" | "created_at" | "card_id"
  >[];
  receipt?: BoardEntityConversionRow;
  card?: BoardElementRow | null;
};
export async function readBoardEntities(
  scope: { organizationId: string; boardId: string },
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<EntityReadResult> {
  const response = await fetch("/api/boards/entities", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, ...scope }),
    signal: signal ?? AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      response.status === 403
        ? "Board items are unavailable. Check your access."
        : "Board items could not load. Retry.",
    );
  const value = ((await response.json()) as { data: EntityReadResult }).data;
  if (
    value.organizationId !== scope.organizationId ||
    value.boardId !== scope.boardId
  )
    throw Error("Board items are unavailable.");
  return value;
}
export function nativeReference(
  row: Pick<BoardElementRow, "element_type" | "content"> | undefined,
) {
  if (row?.element_type !== "ENTITY_CARD") return undefined;
  const parsed = entityReferenceSchema.safeParse(row.content.reference);
  return parsed.success ? parsed.data : undefined;
}
/** Scoped to a mounted account/org/Board boundary. Projections never enter saved rows. */
export function createBoardEntityStore() {
  let snapshot: ReadonlyMap<string, EntityResolution> = new Map();
  const listeners = new Set<() => void>(),
    keyed = new Map<string, Set<() => void>>();
  const emit = (next: ReadonlyMap<string, EntityResolution>) => {
    const old = snapshot;
    snapshot = next;
    for (const [key, callbacks] of keyed)
      if (old.get(key) !== next.get(key)) for (const call of callbacks) call();
    for (const call of listeners) call();
  };
  return {
    snapshot: () => snapshot,
    subscribe(call: () => void) {
      listeners.add(call);
      return () => {
        listeners.delete(call);
      };
    },
    subscribeKey(key: string, call: () => void) {
      const set = keyed.get(key) ?? new Set();
      set.add(call);
      keyed.set(key, set);
      return () => {
        set.delete(call);
        if (!set.size) keyed.delete(key);
      };
    },
    set(results: readonly EntityResolution[]) {
      const next = new Map(snapshot);
      for (const result of results) {
        const key = entityReferenceKey(result.reference),
          old = next.get(key);
        next.set(
          key,
          JSON.stringify(old) === JSON.stringify(result) ? old! : result,
        );
      }
      emit(next);
    },
    retain(refs: readonly EntityReference[], clear = false) {
      const keys = new Set(refs.map(entityReferenceKey));
      const next = new Map(
        [...snapshot].filter(([key]) => !clear && keys.has(key)),
      );
      if (next.size !== snapshot.size) emit(next);
    },
  };
}
export type BoardEntityStore = ReturnType<typeof createBoardEntityStore>;
export const BoardEntityContext = createContext<BoardEntityStore | null>(null);
export const BoardEntityTypesContext = createContext<
  ReadonlyMap<string, BoardEntityType>
>(new Map());
const emptySnapshot = new Map<string, EntityResolution>();
const noopSubscribe = () => () => {};
export function useNativeEntity(
  row?: Pick<BoardElementRow, "element_type" | "content">,
) {
  const store = useContext(BoardEntityContext),
    ref = nativeReference(row),
    key = ref ? entityReferenceKey(ref) : "";
  return useSyncExternalStore(
    (call) => store?.subscribeKey(key, call) ?? noopSubscribe(),
    () => store?.snapshot().get(key),
    () => undefined,
  );
}
export function useNativeEntities() {
  const store = useContext(BoardEntityContext);
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.snapshot ?? (() => emptySnapshot),
    () => emptySnapshot,
  );
}
