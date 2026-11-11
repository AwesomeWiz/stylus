"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type {
  ConnectionView,
  IntegrationTarget,
  ResourcePage,
  SearchInput,
} from "@/core/integrations/public";
import {
  attachConnectedResource as attachConnectedResourceAction,
  loadCalendarChoices as loadCalendarChoicesAction,
  searchConnectedResources as searchConnectedResourcesAction,
} from "@/modules/integrations/actions";
import { resilientIntegrationAction } from "./client-action";
const attachConnectedResource = resilientIntegrationAction(
  attachConnectedResourceAction,
);
const loadCalendarChoices = resilientIntegrationAction(
  loadCalendarChoicesAction,
);
const searchConnectedResources = resilientIntegrationAction(
  searchConnectedResourcesAction,
);
import { integrationControl, integrationLabels } from "./integration-labels";
export function ResourcePicker({
  target,
  connections,
  onClose,
  onAttached,
  onRestoreFocus,
}: {
  target: IntegrationTarget;
  connections: ConnectionView[];
  onClose: () => void;
  onAttached: () => void;
  onRestoreFocus?: () => void;
}) {
  const [connectionId, setConnection] = useState(connections[0]?.id ?? ""),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState<NonNullable<SearchInput["kind"]>>("repository"),
    [repo, setRepo] = useState(""),
    [calendar, setCalendar] = useState("primary"),
    [calendars, setCalendars] = useState<{ id: string; title: string }[]>([]),
    [result, setResult] = useState<ResourcePage>({ items: [] }),
    [resolvedKey, setResolvedKey] = useState(""),
    [busy, setBusy] = useState(false),
    [attaching, setAttaching] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const request = useRef(0),
    mounted = useRef(true),
    connection = connections.find((c) => c.id === connectionId);
  const entityType = target.entityType,
    entityId = target.entityId;
  const searchKey = JSON.stringify([
    connectionId,
    query,
    kind,
    repo,
    calendar,
    entityType,
    entityId,
    retry,
  ]);
  const searching = busy || resolvedKey !== searchKey;
  const visibleItems = resolvedKey === searchKey ? result.items : [];
  const visibleError = resolvedKey === searchKey ? error : "";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (connection?.provider === "google-calendar")
      loadCalendarChoices({
        target: { entityType, entityId },
        connectionId,
      }).then((r) => {
        if (!active) return;
        if (r.ok) setCalendars(r.data);
        else setError(r.message);
      });
    return () => {
      active = false;
    };
  }, [connectionId, connection?.provider, entityType, entityId]);
  useEffect(() => {
    const version = ++request.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      setResult({ items: [] });
      const r = await searchConnectedResources({
        target: { entityType, entityId },
        connectionId,
        query,
        kind,
        repositoryId: repo || connection?.config.repositories?.[0]?.id,
        calendarId: calendar,
      });
      if (!mounted.current || version !== request.current) return;
      setBusy(false);
      setResolvedKey(searchKey);
      if (r.ok) setResult(r.data);
      else setError(r.message);
    }, 350);
    return () => clearTimeout(timer);
  }, [
    connectionId,
    query,
    kind,
    repo,
    calendar,
    connection,
    entityType,
    entityId,
    retry,
    searchKey,
  ]);
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
      onOpenChange={(open) => {
        if (!open && !attaching) onClose();
      }}
      mobileSheet
      title="Add connected resource"
      description="Choose a reference to share with readers of this work. Provider permissions stay unchanged."
    >
      <div className="space-y-4 p-5 sm:p-6">
        <label className="block text-sm">
          Provider
          <Select
            disabled={attaching}
            className={integrationControl}
            value={connectionId}
            onChange={(e) => {
              setConnection(e.target.value);
              setRepo("");
              setKind("repository");
              setCalendar("primary");
              setCalendars([]);
            }}
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {integrationLabels[c.provider].title}
              </option>
            ))}
          </Select>
        </label>
        {connection?.provider === "github" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Resource type
              <Select
                className={integrationControl}
                value={kind}
                disabled={attaching}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="repository">Repositories</option>
                <option value="issue">Issues</option>
                <option value="pull-request">Pull requests</option>
                <option value="commit">Commits</option>
              </Select>
            </label>
            {kind !== "repository" ? (
              <label className="text-sm">
                Repository
                <Select
                  className={integrationControl}
                  value={repo || connection.config.repositories?.[0]?.id || ""}
                  disabled={attaching}
                  onChange={(e) => setRepo(e.target.value)}
                >
                  {connection.config.repositories?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
          </div>
        ) : null}
        {connection?.provider === "google-calendar" ? (
          <label className="block text-sm">
            Calendar
            <Select
              className={integrationControl}
              value={calendar}
              disabled={attaching}
              onChange={(e) => setCalendar(e.target.value)}
            >
              <option value="primary">Primary</option>
              {calendars
                .filter((c) => c.id !== "primary")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </Select>
          </label>
        ) : null}
        <label className="block text-sm">
          Search resources
          <input
            className={integrationControl}
            value={query}
            disabled={attaching}
            maxLength={120}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="text-muted-foreground text-xs">
          {connection?.provider === "github"
            ? "Search titles within each repository page. More results continues browsing."
            : connection?.provider === "google-calendar"
              ? "Upcoming events over the next 90 days. Attendees are not shown."
              : "File metadata only. Contents are never imported."}
        </p>
        {searching ? (
          <p role="status" className="text-sm">
            Searching…
          </p>
        ) : visibleError ? (
          <div role="alert" className="text-sm">
            {visibleError}{" "}
            <Button variant="ghost" onClick={() => setRetry((v) => v + 1)}>
              Retry search
            </Button>
          </div>
        ) : !visibleItems.length ? (
          <p role="status" className="text-sm">
            No matching resources on this page.
          </p>
        ) : null}
        <ul className="divide-y">
          {visibleItems.map((item) => (
            <li
              key={JSON.stringify(item.locator)}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{item.title}</p>
                <p className="text-muted-foreground text-xs break-words">
                  {item.detail}
                  {item.start ? ` · ${item.start}` : ""}
                </p>
              </div>
              <Button
                aria-label={"Attach " + item.title}
                variant="secondary"
                disabled={attaching || searching}
                onClick={async () => {
                  setAttaching(true);
                  setError("");
                  const r = await attachConnectedResource({
                    target,
                    connectionId,
                    locator: item.locator,
                  });
                  if (!mounted.current) return;
                  setAttaching(false);
                  if (r.ok) onAttached();
                  else setError(r.message);
                }}
              >
                Attach
              </Button>
            </li>
          ))}
        </ul>
        {resolvedKey === searchKey && result.cursor ? (
          <Button
            variant="secondary"
            disabled={searching || attaching}
            onClick={async () => {
              const version = ++request.current;
              setBusy(true);
              const r = await searchConnectedResources({
                target,
                connectionId,
                query,
                kind,
                repositoryId: repo || connection?.config.repositories?.[0]?.id,
                calendarId: calendar,
                cursor: result.cursor,
              });
              if (!mounted.current || version !== request.current) return;
              setBusy(false);
              if (r.ok)
                setResult((old) => ({
                  items: [...old.items, ...r.data.items],
                  cursor: r.data.cursor,
                }));
              else setError(r.message);
            }}
          >
            More results
          </Button>
        ) : null}
        <Button variant="ghost" disabled={attaching} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
