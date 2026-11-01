"use client";

import { useSyncExternalStore } from "react";
import { taskHref } from "@/modules/tasks/url-state";

const eventName = "stylus:task-location";
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(eventName, listener);
  };
}
const snapshot = () => window.location.search;

/** Native history integrates with the App Router without refetching list data. */
export function useTaskQuery(initialQuery: string) {
  return useSyncExternalStore(subscribe, snapshot, () => initialQuery);
}

export function selectTaskQuery(patch: Record<string, string | null>) {
  window.history.pushState(null, "", taskHref(window.location.search, patch));
  window.dispatchEvent(new Event(eventName));
}
