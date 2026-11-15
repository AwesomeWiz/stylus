"use client";
import { useEffect, useState } from "react";
import type { EntityProvenanceLink } from "@/core/entities/public";
import { loadEntityProvenance } from "@/core/entities/actions";
import { loadTaskProvenance } from "@/modules/tasks/client-reads";
import { EntityProvenance } from "./entity-provenance";
export function EntityProvenanceLookup({
  entityType,
  entityId,
  organizationId,
}: {
  entityType: string;
  entityId: string;
  organizationId?: string;
}) {
  const [state, setState] = useState<{
      key: string;
      links: readonly EntityProvenanceLink[];
      error?: boolean;
    }>(),
    key = entityType + ":" + entityId;
  useEffect(() => {
    let active = true,
      generation = 0;
    async function refresh() {
      if (document.hidden) return;
      const turn = ++generation;
      setState(undefined);
      try {
        const result =
          entityType === "core.task" && organizationId
            ? await loadTaskProvenance({ taskId: entityId, organizationId })
            : await loadEntityProvenance({ entityType, entityId });
        if (active && turn === generation)
          setState({
            key,
            links: result.links,
            error: result.status === "error",
          });
      } catch {
        if (active && turn === generation)
          setState({ key, links: [], error: true });
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [key, entityType, entityId, organizationId]);
  if (state?.key !== key) return null;
  return state.error ? (
    <p role="status" className="text-muted-foreground text-sm">
      Decision provenance could not load. Reload to retry.
    </p>
  ) : (
    <EntityProvenance links={state.links} />
  );
}
