"use client";
import { useEffect, useRef, useState } from "react";
import { saveOnboardingDraftAction } from "@/modules/onboarding/actions";
import {
  readDraftFields,
  type OnboardingDraft,
} from "@/modules/onboarding/drafts";
import { useOnboardingNavigation } from "./navigation";
export function useDraftSave({
  form,
  organizationId,
  step,
  draft,
}: {
  form: React.RefObject<HTMLFormElement | null>;
  organizationId: string;
  step: string;
  draft: OnboardingDraft;
}) {
  const [status, setStatus] = useState(
      draft.conflicted ? "conflict" : draft.updated_at ? "saved" : "ready",
    ),
    [message, setMessage] = useState("");
  const revision = useRef(draft.updated_at),
    base = useRef(draft.base_revision),
    last = useRef(""),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    flight = useRef<Promise<boolean> | null>(null),
    mounted = useRef(true),
    nav = useOnboardingNavigation();
  async function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (draft.conflicted) return false;
    if (flight.current) return flight.current;
    if (!dirty.current) return true;
    const run = async () => {
      while (form.current) {
        const fields = readDraftFields(form.current),
          serialized = JSON.stringify(fields);
        if (serialized === last.current) {
          dirty.current = false;
          if (mounted.current) setStatus(revision.current ? "saved" : "ready");
          return true;
        }
        dirty.current = true;
        if (mounted.current) {
          setStatus("saving");
          setMessage("");
        }
        try {
          const result = await saveOnboardingDraftAction({
            organizationId,
            step,
            fields,
            revision: revision.current,
            baseRevision: base.current,
          });
          if (result.status !== "success") {
            if (mounted.current) {
              setStatus("error");
              setMessage(
                result.message ?? "Check the draft fields before retrying.",
              );
            }
            return false;
          }
          revision.current = result.revision;
          last.current = serialized;
          if (mounted.current) setStatus("saved");
        } catch {
          if (mounted.current) {
            setStatus("error");
            setMessage(
              "The draft response was interrupted. Reload to check what saved before retrying.",
            );
          }
          return false;
        }
      }
      return false;
    };
    flight.current = run();
    try {
      return await flight.current;
    } finally {
      flight.current = null;
    }
  }
  useEffect(() => {
    mounted.current = true;
    // Never infer persistence from live DOM values at hydration: an input may
    // already contain an early user edit before this passive effect runs.
    const before = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeunload", before);
    };
  }, []);
  // Register the latest form closure after each render; registration only changes
  // a navigation ref and its cleanup never writes component state.
  useEffect(() => nav?.register(flush));
  function changed() {
    if (draft.conflicted) return;
    dirty.current = true;
    setStatus("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }
  return {
    status,
    message,
    revision,
    base,
    flush,
    changed,
    markCommitted: () => {
      dirty.current = false;
    },
  };
}
