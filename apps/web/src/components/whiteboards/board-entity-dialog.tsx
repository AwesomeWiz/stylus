"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { focusBoardCanvas } from "./board-navigation";
import type { EntityReference } from "@/core/entities/public";
import type {
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { convertBoardEntityAction } from "@/modules/whiteboards/entity-actions";
import { readBoardEntities, type EntityReadResult } from "./board-entity-store";

export type NativeRequest =
  | { mode: "insert" }
  | { mode: "convert"; entityType: string; sourceIds: string[] }
  | { mode: "recover"; attemptId: string };
type Attempt = {
  id: string;
  type: string;
  sources: string[];
  fields: Record<string, string | null>;
};
function localDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}
/** A user-reviewed form; no execution happens merely by opening or selecting a type. */
export function BoardEntityDialog({
  scope,
  request,
  members,
  onClose,
  onResume,
  onInsert,
  onLinked,
  onRefresh,
}: {
  scope: { organizationId: string; boardId: string };
  request: NativeRequest;
  members: TaskMember[];
  onClose: () => void;
  onResume: (attemptId: string) => void;
  onInsert: (
    ref: EntityReference,
    cardId?: string,
    conversionId?: string,
  ) => Promise<boolean>;
  onLinked: (row: BoardElementRow) => void;
  onRefresh: () => void;
}) {
  const [data, setData] = useState<EntityReadResult>(),
    [type, setType] = useState(
      request.mode === "convert" ? request.entityType : "",
    ),
    [query, setQuery] = useState(""),
    [page, setPage] = useState<EntityReadResult & { searchKey: string }>(),
    [fields, setFields] = useState<Record<string, string>>({}),
    [attempt, setAttempt] = useState<Attempt>(),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [note, setNote] = useState(""),
    [archivedLink, setArchivedLink] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const discovery = await readBoardEntities(scope, {
        operation: "discover",
      });
      if (!active) return;
      if (request.mode === "convert") {
        const result = await readBoardEntities(scope, {
          operation: "preview",
          sourceIds: request.sourceIds,
          entityType: request.entityType,
        });
        if (!active) return;
        const provider = discovery.types.find(
          (item) => item.id === request.entityType && item.creatable,
        );
        if (!provider || !result.preview)
          throw Error("This conversion is unavailable.");
        const next = Object.fromEntries(
          (provider.fields ?? []).map((field) => [
            field.key,
            field.initial ?? "",
          ]),
        );
        next.title = result.preview.title;
        for (const key of [
          "description",
          "concept",
          "content",
          "statement",
          "testPlan",
        ])
          if (provider.fields?.some((field) => field.key === key))
            next[key] = result.preview.text.slice(
              0,
              provider.fields.find((field) => field.key === key)?.maxLength ??
                4800,
            );
        Object.assign(
          next,
          "fields" in result.preview ? result.preview.fields : {},
        );
        setFields(next);
        setData({ ...discovery, preview: result.preview });
      } else if (request.mode === "recover") {
        const recovered = await readBoardEntities(scope, {
          operation: "recover",
          attemptId: request.attemptId,
        });
        if (!active) return;
        if (!recovered.receipt) throw Error("Conversion unavailable.");
        const receipt = recovered.receipt;
        setType(receipt.entity_type);
        setAttempt({
          id: receipt.id,
          type: receipt.entity_type,
          sources: receipt.source_ids,
          fields: receipt.input as Record<string, string | null>,
        });
        setFields(
          Object.fromEntries(
            Object.entries(receipt.input).map(([key, value]) => [
              key,
              value == null
                ? ""
                : key === "dueAt"
                  ? localDate(String(value))
                  : String(value),
            ]),
          ),
        );
        setData(discovery);
        setArchivedLink(!!recovered.card?.archived_at);
        setNote(
          recovered.card?.archived_at
            ? "This conversion's Board card was archived. Its canonical item remains; recovery will not undo that archive. Insert an existing item to make a new reference."
            : recovered.card
              ? "This item is already linked. Retry confirms the existing card without moving it."
              : "Resume this exact conversion. Its existing item will be reused.",
        );
      } else {
        setData(discovery);
        setType(
          (current) =>
            current ||
            discovery.types.find((item) => item.searchable)?.id ||
            "",
        );
      }
    })()
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [scope, request, retry]);
  useEffect(() => {
    if (request.mode !== "insert" || !type) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void readBoardEntities(
        scope,
        { operation: "search", entityType: type, query },
        controller.signal,
      )
        .then((value) => {
          if (!controller.signal.aborted)
            setPage({ ...value, searchKey: type + "|" + query });
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [scope, request.mode, type, query, retry]);
  const provider = data?.types.find((item) => item.id === type);
  const searchKey = type + "|" + query;
  const currentPage = page?.searchKey === searchKey ? page : undefined;
  async function convert() {
    if (busy || !provider?.creatable) return;
    setBusy(true);
    setError("");
    const normalized = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        key === "dueAt" && value ? new Date(value).toISOString() : value,
      ]),
    );
    const current = attempt ?? {
      id: crypto.randomUUID(),
      type,
      sources: request.mode === "convert" ? request.sourceIds : [],
      fields: normalized,
    };
    setAttempt(current);
    try {
      const result = await convertBoardEntityAction({
        ...scope,
        attemptId: current.id,
        entityType: current.type,
        sourceIds: current.sources,
        fields: current.fields,
      });
      if (result.status !== "success") {
        if (result.code === "VALIDATION") setAttempt(undefined);
        throw Error(result.message);
      }
      const recovered = await readBoardEntities(scope, {
        operation: "recover",
        attemptId: current.id,
      });
      if (recovered.card) {
        if (recovered.card.archived_at) {
          setArchivedLink(true);
          throw Error(
            "This conversion's Board card was archived. Its item was retained. Recovery will not undo the archive.",
          );
        }
        onLinked(recovered.card);
        onRefresh();
        onClose();
        return;
      }
      const ok = await onInsert(
        result.data.reference,
        result.data.cardId,
        current.id,
      );
      if (!ok)
        throw Error(
          "The item exists, but its Board link could not save. Finish Board recovery, then retry this conversion or resume it after reload. No second item will be created.",
        );
      onRefresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        requestAnimationFrame(focusBoardCanvas);
      }}
      className="[&_button]:min-h-10 [&_button]:min-w-10 max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      mobileSheet
      title={
        request.mode === "insert"
          ? "Insert from Stylus"
          : `Create ${provider?.label ?? "item"} from selection`
      }
      description={
        request.mode === "insert"
          ? "Link an authorized item from this organization. Its canonical record stays in its workspace."
          : "Review the mapped fields before creating one item. Source objects stay on the Board; this does not add Company Knowledge."
      }
    >
      <div className="space-y-4 p-5 sm:p-6">
        {loading ? <p role="status">Loading authorized items…</p> : null}
        {error ? (
          <div role="alert" className="space-y-2">
            <p>{error}</p>
            {!data ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setRetry((value) => value + 1);
                }}
              >
                Retry loading
              </Button>
            ) : null}
          </div>
        ) : null}
        {request.mode === "insert" ? (
          <>
            <label className="block text-sm">
              Type
              <select
                aria-label="Item type"
                className="bg-background mt-1 min-h-11 w-full rounded border p-2"
                value={type}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setType(event.target.value);
                }}
              >
                {data?.types
                  .filter((item) => item.searchable)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Search
              <input
                className="bg-background mt-1 min-h-11 w-full rounded border p-2"
                maxLength={120}
                value={query}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setQuery(event.target.value);
                }}
              />
            </label>
            {!loading &&
            currentPage &&
            !currentPage.items?.some((item) => item.status === "available") ? (
              <p>No matching authorized items.</p>
            ) : null}
            <ul className="space-y-1">
              {currentPage?.items?.map((item) =>
                item.status === "available" ? (
                  <li key={item.reference.entityId}>
                    <button
                      type="button"
                      disabled={busy}
                      className="hover:bg-muted min-h-11 w-full rounded border p-3 text-left disabled:opacity-50"
                      onClick={() => {
                        setBusy(true);
                        void onInsert(item.reference)
                          .then((ok) => {
                            if (ok) onClose();
                            else
                              setError(
                                "The link could not save. Check Board recovery and retry.",
                              );
                          })
                          .catch(() =>
                            setError("The link could not save. Retry."),
                          )
                          .finally(() => setBusy(false));
                      }}
                    >
                      <span className="block text-sm font-medium">
                        {item.projection.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {item.projection.status ?? ""}
                        {item.reference.immutable
                          ? ` · ${item.reference.immutable.evidenceId} · Exact evidence`
                          : " · Live item"}
                      </span>
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
            {currentPage?.hasMore ? (
              <Button
                variant="secondary"
                disabled={busy || loading}
                onClick={() => {
                  setLoading(true);
                  void readBoardEntities(scope, {
                    operation: "search",
                    entityType: type,
                    query,
                    cursor: currentPage.cursor,
                  })
                    .then((next) =>
                      setPage((old) =>
                        old?.searchKey === searchKey
                          ? {
                              ...next,
                              searchKey,
                              items: [
                                ...(old?.items ?? []),
                                ...(next.items ?? []),
                              ],
                            }
                          : old,
                      ),
                    )
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                Load more items
              </Button>
            ) : null}
            {data?.recoveries?.length ? (
              <details>
                <summary className="min-h-11 cursor-pointer text-sm">
                  Your recent conversions
                </summary>
                <ul>
                  {data.recoveries.map((row) => (
                    <li key={row.id}>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onResume(row.id)}
                      >
                        Resume{" "}
                        {data.types.find((item) => item.id === row.entity_type)
                          ?.label ?? "item"}{" "}
                        · {new Date(row.created_at).toLocaleString()}
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : !loading && provider ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void convert();
            }}
          >
            {note ? (
              <p role="status" className="text-sm">
                {note}
              </p>
            ) : null}
            {data?.preview ? (
              <details>
                <summary className="min-h-11 cursor-pointer text-sm">
                  Selected content ({data.preview.sourceIds.length} objects)
                  {data.preview.truncated
                    ? " · truncated to 4,800 characters"
                    : ""}
                </summary>
                <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {data.preview.text}
                </pre>
              </details>
            ) : null}
            {provider.fields?.map((field) => (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.required ? " *" : ""}
                {field.kind === "textarea" ? (
                  <textarea
                    className="bg-background mt-1 min-h-28 w-full rounded border p-2"
                    required={field.required}
                    maxLength={field.maxLength}
                    disabled={busy || !!attempt}
                    value={fields[field.key] ?? ""}
                    onChange={(event) =>
                      setFields({ ...fields, [field.key]: event.target.value })
                    }
                  />
                ) : field.kind === "select" || field.kind === "assignee" ? (
                  <select
                    className="bg-background mt-1 min-h-11 w-full rounded border p-2"
                    disabled={busy || !!attempt}
                    value={fields[field.key] ?? ""}
                    onChange={(event) =>
                      setFields({ ...fields, [field.key]: event.target.value })
                    }
                  >
                    {field.kind === "assignee" ? (
                      <>
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option
                            key={member.member_user_id}
                            value={member.member_user_id}
                          >
                            {member.display_name}
                          </option>
                        ))}
                      </>
                    ) : (
                      field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    type={
                      field.kind === "datetime"
                        ? "datetime-local"
                        : field.kind === "date"
                          ? "date"
                          : "text"
                    }
                    className="bg-background mt-1 min-h-11 w-full rounded border p-2"
                    required={field.required}
                    maxLength={field.maxLength}
                    disabled={busy || !!attempt}
                    value={fields[field.key] ?? ""}
                    onChange={(event) =>
                      setFields({ ...fields, [field.key]: event.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <p className="text-muted-foreground text-xs">
              Creates one {provider.label}. The Board receives a reference card.
              Selected objects remain unchanged.
            </p>
            <Button type="submit" disabled={busy || archivedLink}>
              {busy
                ? "Confirming…"
                : attempt
                  ? "Retry this conversion"
                  : "Create and link"}
            </Button>
          </form>
        ) : null}
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
