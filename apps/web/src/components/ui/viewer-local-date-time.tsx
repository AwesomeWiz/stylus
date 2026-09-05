"use client";

import { useSyncExternalStore } from "react";

const subscribeToHydration = () => () => undefined;
const browserSnapshot = () => true;
const serverSnapshot = () => false;

export function formatViewerDateTime(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone,
      timeZoneName: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return null;
  }
}

export function ViewerLocalDateTime({ value }: { value: string | null }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    browserSnapshot,
    serverSnapshot,
  );
  if (!value) return <>Never / unavailable</>;
  if (!hydrated)
    return <span aria-label="Local time loading">Local time…</span>;

  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatted = formatViewerDateTime(value, timeZone);
  if (formatted === null) return <>Unavailable</>;

  return <time dateTime={value}>{formatted}</time>;
}
