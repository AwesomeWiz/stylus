"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import type { IntegrationTarget } from "@/core/integrations/public";
import {
  loadConnectedResources as loadConnectedResourcesAction,
  refreshConnectedResources as refreshConnectedResourcesAction,
  unlinkConnectedResource as unlinkConnectedResourceAction,
} from "@/modules/integrations/actions";
import { resilientIntegrationAction } from "./client-action";
const loadConnectedResources = resilientIntegrationAction(
  loadConnectedResourcesAction,
);
const refreshConnectedResources = resilientIntegrationAction(
  refreshConnectedResourcesAction,
);
const unlinkConnectedResource = resilientIntegrationAction(
  unlinkConnectedResourceAction,
);
import { integrationLabels } from "./integration-labels";
import { ResourcePicker } from "./resource-picker";
import { CalendarEventForm } from "./calendar-event-form";
type Panel = Extract<
  Awaited<ReturnType<typeof loadConnectedResources>>,
  { ok: true }
>["data"];
export function ConnectedResources({
  target,
  editable = true,
}: {
  target: IntegrationTarget;
  editable?: boolean;
}) {
  return (
    <ResourcePanel
      key={`${target.entityType}:${target.entityId}`}
      target={target}
      editable={editable}
    />
  );
}
function ResourcePanel({
  target,
  editable,
}: {
  target: IntegrationTarget;
  editable: boolean;
}) {
  const [data, setData] = useState<Panel | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [picker, setPicker] = useState(false),
    [calendar, setCalendar] = useState(false),
    [reload, setReload] = useState(0);
  const active = useRef(true),
    generation = useRef(0),
    expiry = useRef(new Map<string, number>()),
    root = useRef<HTMLElement>(null),
    opener = useRef<HTMLElement | null>(null);
  function openDialog(next: "picker" | "calendar") {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (next === "picker") setPicker(true);
    else setCalendar(true);
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      (opener.current?.isConnected ? opener.current : root.current)?.focus();
    });
  }
  const entityId = target.entityId,
    entityType = target.entityType;
  useEffect(() => {
    active.current = true;
    const version = ++generation.current;
    loadConnectedResources({ entityId, entityType }).then(
      (r) => {
        if (!active.current || version !== generation.current) return;
        if (r.ok) {
          setData(r.data);
          setError("");
        } else {
          setData(null);
          setError(r.message);
        }
      },
      () => {
        if (active.current && version === generation.current)
          setError("Connected resources could not load. Try again.");
      },
    );
    return () => {
      active.current = false;
    };
  }, [entityId, entityType, reload]);
  useEffect(() => {
    if (!data) return;
    const available = data.items.filter((item) => item.status === "available");
    if (!available.length) return;
    const keys = new Set(
      available.map((item) =>
        item.status === "available" ? item.id + item.resource.checkedAt : "",
      ),
    );
    for (const key of expiry.current.keys())
      if (!keys.has(key)) expiry.current.delete(key);
    for (const item of available)
      if (item.status === "available") {
        const key = item.id + item.resource.checkedAt;
        if (!expiry.current.has(key))
          expiry.current.set(
            key,
            Math.min(
              Number.isFinite(Date.parse(item.resource.checkedAt))
                ? Date.parse(item.resource.checkedAt) + 60_000
                : Date.now(),
              Date.now() + 60_000,
            ),
          );
      }
    const deadline = Math.min(...expiry.current.values());
    function expire() {
      setData((old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.status === "available" &&
                (expiry.current.get(item.id + item.resource.checkedAt) ?? 0) <=
                  Date.now()
                  ? {
                      id: item.id,
                      provider: item.provider,
                      status: "unavailable" as const,
                      message: "Refresh this resource to check access.",
                    }
                  : item,
              ),
            }
          : null,
      );
    }
    const timer = setTimeout(expire, Math.max(0, deadline - Date.now()));
    window.addEventListener("focus", expire);
    document.addEventListener("visibilitychange", expire);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", expire);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [data]);
  async function update(more = false) {
    setBusy(true);
    setError("");
    const version = ++generation.current;
    const r = await refreshConnectedResources({
      target,
      cursor: more ? data?.cursor : undefined,
      refresh: !more,
    });
    if (!active.current || version !== generation.current) return;
    setBusy(false);
    if (r.ok)
      setData((old) =>
        old
          ? {
              ...old,
              items: more ? [...old.items, ...r.data.items] : r.data.items,
              cursor: r.data.cursor,
            }
          : null,
      );
    else {
      setData((old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) => ({
                id: item.id,
                provider: item.provider,
                status: "unavailable" as const,
                message: "Refresh this resource to check access.",
              })),
            }
          : null,
      );
      setError(r.message);
    }
  }
  const canEdit = editable && data?.canEdit,
    calendarConnection = data?.connections.find(
      (c) => c.provider === "google-calendar",
    );
  function changed() {
    setPicker(false);
    setCalendar(false);
    setReload((v) => v + 1);
  }
  return (
    <section
      ref={root}
      tabIndex={-1}
      aria-label="Connected resources"
      className="space-y-3 border-t pt-4 outline-none [&_button]:min-h-11"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Connected resources</h3>
        {canEdit && data.connections.length ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => openDialog("picker")}
          >
            Add resource
          </Button>
        ) : null}
      </div>
      {!data && !error ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading connected resources…
        </p>
      ) : null}
      {error ? (
        <div className="text-sm" role="alert">
          {error}{" "}
          <Button variant="ghost" onClick={() => setReload((v) => v + 1)}>
            Retry connected resources
          </Button>
        </div>
      ) : null}
      {data?.items.length ? (
        <ul className="divide-y">
          {data.items.map((item) => {
            const label = integrationLabels[item.provider],
              Icon = label.icon;
            return (
              <li key={item.id} className="flex min-w-0 gap-3 py-3 text-sm">
                <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {item.status === "available" ? (
                    <>
                      <a
                        className="inline-flex min-h-11 max-w-full items-center gap-2 font-medium underline"
                        href={item.resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="break-words">
                          {item.resource.title}
                        </span>
                        <ExternalLink
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="sr-only">
                          Open in {label.title} (new tab)
                        </span>
                      </a>
                      <p className="text-muted-foreground text-xs break-words">
                        {item.resource.detail}
                        {item.resource.state ? ` · ${item.resource.state}` : ""}
                      </p>
                      {item.resource.start ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          <ViewerLocalDateTime value={item.resource.start} />
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p>{label.title} resource</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {item.message}
                      </p>
                    </>
                  )}
                  {canEdit ? (
                    <Button
                      aria-label={
                        "Unlink " +
                        (item.status === "available"
                          ? item.resource.title
                          : label.title + " resource")
                      }
                      variant="ghost"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const version = ++generation.current;
                        const r = await unlinkConnectedResource({
                          target,
                          id: item.id,
                        });
                        if (!active.current || version !== generation.current)
                          return;
                        setBusy(false);
                        if (r.ok) {
                          setData((old) =>
                            old
                              ? {
                                  ...old,
                                  items: old.items.filter(
                                    (v) => v.id !== item.id,
                                  ),
                                }
                              : null,
                          );
                        } else setError(r.message);
                      }}
                    >
                      Unlink
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : data ? (
        <p className="text-muted-foreground text-sm">
          No connected resources.{" "}
          {canEdit && !data.connections.length ? (
            <Link className="underline" href="/settings/integrations">
              Connect a tool in Settings
            </Link>
          ) : null}
        </p>
      ) : null}
      {data?.items.some((v) => v.provider !== "github") ? (
        <p className="text-muted-foreground text-xs">
          Linked Google metadata is shared here. Opening a resource still
          requires access in Google.
        </p>
      ) : null}
      {data?.items.length ? (
        <Button variant="ghost" disabled={busy} onClick={() => update()}>
          Refresh resources
        </Button>
      ) : null}
      {data?.cursor ? (
        <Button variant="ghost" disabled={busy} onClick={() => update(true)}>
          More connected resources
        </Button>
      ) : null}
      {canEdit &&
      calendarConnection &&
      data.target.date &&
      ["core.task", "core.milestone", "marketing.experiment"].includes(
        target.entityType,
      ) ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => openDialog("calendar")}
        >
          Add to Google Calendar
        </Button>
      ) : null}
      {picker && data ? (
        <ResourcePicker
          target={target}
          connections={data.connections}
          onClose={() => setPicker(false)}
          onAttached={changed}
          onRestoreFocus={restoreFocus}
        />
      ) : null}
      {calendar && data && calendarConnection ? (
        <CalendarEventForm
          target={target}
          connectionId={calendarConnection.id}
          title={data.target.title}
          date={data.target.date!}
          onClose={() => setCalendar(false)}
          onCreated={changed}
          onRestoreFocus={restoreFocus}
        />
      ) : null}
    </section>
  );
}
