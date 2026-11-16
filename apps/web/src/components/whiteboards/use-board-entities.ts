"use client";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
  entityReferenceKey,
  type EntityReference,
} from "@/core/entities/public";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  nativeReference,
  readBoardEntities,
  type BoardEntityStore,
  type BoardEntityType,
} from "./board-entity-store";

export function useBoardEntities(
  scope: { organizationId: string; boardId: string },
  rows: BoardElementRow[],
  store: BoardEntityStore,
) {
  const [types, setTypes] = useState<BoardEntityType[]>([]);
  const encoded = useMemo(
    () =>
      JSON.stringify(
        [
          ...new Map(
            rows.flatMap((row) => {
              const ref = nativeReference(row);
              return ref ? [[entityReferenceKey(ref), ref] as const] : [];
            }),
          ).values(),
        ].sort((a, b) =>
          entityReferenceKey(a).localeCompare(entityReferenceKey(b)),
        ),
      ),
    [rows],
  );
  const state = useRef({
    scope,
    refs: [] as EntityReference[],
    generation: 0,
    busy: false,
    again: false,
    disposed: false,
  });
  const refresh = useCallback(
    (clear = false) => {
      const current = state.current;
      if (clear) {
        current.generation++;
        store.retain(current.refs, true);
      }
      if (current.busy) {
        current.again = true;
        return;
      }
      current.busy = true;
      void (async () => {
        do {
          current.again = false;
          const generation = current.generation,
            refs = current.refs;
          try {
            const response = await readBoardEntities(current.scope, {
              operation: "discover",
            });
            if (!current.disposed && generation === current.generation)
              setTypes((previous) =>
                JSON.stringify(previous) === JSON.stringify(response.types)
                  ? previous
                  : response.types,
              );
          } catch {
            if (!current.disposed && generation === current.generation)
              setTypes([]);
          }
          for (let at = 0; at < refs.length; at += 50) {
            const batch = refs.slice(at, at + 50);
            try {
              const response = await readBoardEntities(current.scope, {
                operation: "resolve",
                references: batch,
              });
              if (!current.disposed && generation === current.generation)
                store.set(response.resolutions ?? []);
            } catch {
              if (!current.disposed && generation === current.generation)
                store.set(
                  batch.map((reference) => ({ reference, status: "error" })),
                );
            }
            if (current.disposed || generation !== current.generation) break;
          }
        } while (current.again && !current.disposed);
        current.busy = false;
      })();
    },
    [store],
  );
  useEffect(() => {
    const current = state.current;
    current.disposed = false;
    current.scope = {
      organizationId: scope.organizationId,
      boardId: scope.boardId,
    };
    current.refs = JSON.parse(encoded);
    current.generation++;
    store.retain(current.refs);
    refresh();
    return () => {
      current.generation++;
      current.disposed = true;
    };
  }, [encoded, scope.organizationId, scope.boardId, store, refresh]);
  useEffect(() => {
    const focus = () => {
      if (document.visibilityState === "visible") refresh(true);
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  return { refresh, types };
}
