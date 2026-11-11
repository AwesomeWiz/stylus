"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type {
  CalendarChoice,
  IntegrationTarget,
} from "@/core/integrations/public";
import {
  createConnectedCalendarEvent as createConnectedCalendarEventAction,
  loadCalendarChoices as loadCalendarChoicesAction,
  loadCalendarRecovery as loadCalendarRecoveryAction,
} from "@/modules/integrations/actions";
import { resilientIntegrationAction } from "./client-action";
const createConnectedCalendarEvent = resilientIntegrationAction(
  createConnectedCalendarEventAction,
);
const loadCalendarChoices = resilientIntegrationAction(
  loadCalendarChoicesAction,
);
const loadCalendarRecovery = resilientIntegrationAction(
  loadCalendarRecoveryAction,
);
import { integrationControl } from "./integration-labels";
export function CalendarEventForm({
  target,
  connectionId,
  title,
  date,
  onClose,
  onCreated,
  onRestoreFocus,
}: {
  target: IntegrationTarget;
  connectionId: string;
  title: string;
  date: string;
  onClose: () => void;
  onCreated: () => void;
  onRestoreFocus?: () => void;
}) {
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempted, setAttempted] = useState(false),
    [ready, setReady] = useState(false),
    [reload, setReload] = useState(0),
    [recovery, setRecovery] = useState<Record<string, string> | null>(null);
  const intent = useRef<string | null>(null),
    payload = useRef<unknown>(null),
    mounted = useRef(true);
  const entityType = target.entityType,
    entityId = target.entityId;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    async function load() {
      setReady(false);
      setError("");
      const r = await loadCalendarChoices({
        target: { entityType, entityId },
        connectionId,
      });
      if (!active) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setCalendars(r.data.filter((c) => c.writable));
      const prior = await loadCalendarRecovery({
        target: { entityType, entityId },
        connectionId,
      });
      if (!active) return;
      if (!prior.ok) {
        setError(prior.message);
        return;
      }
      if (prior.data) {
        intent.current = prior.data.id;
        setRecovery(prior.data.input);
        payload.current = {
          target: { entityType, entityId },
          connectionId,
          intentId: prior.data.id,
          event: prior.data.input,
        };
        setAttempted(true);
      }
      setReady(true);
    }
    void load();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [connectionId, entityType, entityId, reload]);
  function localDate() {
    if (date.length === 10) return date;
    const value = new Date(date);
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return (
    <Dialog
      open
      className="[&_button]:min-h-11"
      onCloseAutoFocus={
        onRestoreFocus
          ? (e) => {
              e.preventDefault();
              onRestoreFocus();
            }
          : undefined
      }
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
      title="Add to Google Calendar"
      description="Create one event in your owned calendar. Future date changes do not synchronize. Unlinking never deletes the event."
      mobileSheet
    >
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!intent.current) {
            const form = new FormData(e.currentTarget);
            intent.current = crypto.randomUUID();
            payload.current = {
              target,
              connectionId,
              intentId: intent.current,
              event: {
                title: form.get("title"),
                date: form.get("date"),
                time: form.get("time"),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                calendarId: form.get("calendar"),
              },
            };
          }
          setAttempted(true);
          setBusy(true);
          setError("");
          const r = await createConnectedCalendarEvent(payload.current);
          if (!mounted.current) return;
          setBusy(false);
          if (r.ok) onCreated();
          else {
            setError(r.message);
            if (r.recovery === "edit") {
              intent.current = null;
              payload.current = null;
              setAttempted(false);
              setRecovery(null);
            }
          }
        }}
      >
        {recovery ? (
          <p role="status" className="text-sm">
            An earlier creation is unresolved. Retry this event to recover its
            link without creating another.
          </p>
        ) : null}
        <label className="block text-sm">
          Title
          <input
            key={recovery?.title ?? "new"}
            className={integrationControl}
            name="title"
            defaultValue={recovery?.title ?? title.slice(0, 160)}
            maxLength={160}
            required
            disabled={attempted || !ready}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Date
            <input
              key={recovery?.date ?? "new"}
              className={integrationControl}
              name="date"
              type="date"
              defaultValue={recovery?.date ?? localDate()}
              required
              disabled={attempted || !ready}
            />
          </label>
          <label className="text-sm">
            Time (optional)
            <input
              key={recovery?.time ?? "new"}
              defaultValue={recovery?.time ?? ""}
              className={integrationControl}
              name="time"
              type="time"
              disabled={attempted || !ready}
            />
          </label>
        </div>
        <label className="block text-sm">
          Calendar
          <Select
            key={recovery?.calendarId ?? "new"}
            defaultValue={recovery?.calendarId}
            className={integrationControl}
            name="calendar"
            required
            disabled={attempted || !ready || !calendars.length}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </label>
        {!ready && !error ? (
          <p role="status" className="text-sm">
            Loading owned calendars…
          </p>
        ) : null}
        {ready && !calendars.length ? (
          <p role="status" className="text-sm">
            No owned calendar is available in the first 25 calendars. You can
            still link existing events.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm">
            {error}
            {attempted
              ? " Retry keeps the same event identity. Do not start a second creation while this one is unresolved."
              : ""}
          </p>
        ) : null}
        {error && !ready ? (
          <Button variant="secondary" onClick={() => setReload((v) => v + 1)}>
            Retry calendars
          </Button>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Optional time uses your current device timezone. Timed events last 30
          minutes; leaving time blank creates an all-day event. No invitations
          are sent.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || !ready || !calendars.length} type="submit">
            {busy
              ? "Creating event…"
              : attempted
                ? "Retry same event"
                : "Create event"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
