"use client";
import { useMemo, useState } from "react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  presentationSections,
  reconcilePresentation,
  startPresentation,
  movePresentation,
  type BoardPresentationState,
} from "@/modules/whiteboards/presentation";
export function useBoardPresentation(
  rows: BoardElementRow[],
  selected: string[],
) {
  const sections = useMemo(() => presentationSections(rows), [rows]);
  const [state, setState] = useState<BoardPresentationState | null>(null),
    [unavailable, setUnavailable] = useState(false),
    [notice, setNotice] = useState<string | null>(null);
  const reconciled = reconcilePresentation(state, sections);
  // Synchronize only when canonical Section identity/order changes. No effect
  // refits an active Section simply because its content changed remotely.
  if (reconciled !== state) {
    setState(reconciled);
    if (!reconciled && state)
      setNotice("Presentation ended because no Sections remain.");
  }
  return {
    state: reconciled,
    sections,
    section: reconciled ? sections[reconciled.index] : undefined,
    unavailable,
    setUnavailable,
    notice,
    start: () => {
      const next = startPresentation(sections, selected);
      if (next) {
        setState(next);
        setNotice(null);
      } else setUnavailable(true);
    },
    exit: () => {
      setState(null);
      setNotice(null);
    },
    move: (delta: number) =>
      setState((current) =>
        current
          ? movePresentation(
              reconcilePresentation(current, sections) ?? current,
              sections,
              delta,
            )
          : null,
      ),
  };
}
