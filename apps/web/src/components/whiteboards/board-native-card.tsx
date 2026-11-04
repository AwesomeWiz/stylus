"use client";
import Link from "next/link";
import type { Route } from "next";
import { createContext, useContext } from "react";
import {
  CheckSquare,
  FileSearch,
  Lightbulb,
  Users,
  Flag,
  FileText,
  NotebookPen,
  ArrowUpRight,
} from "lucide-react";
import type {
  BoardElementRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  BoardEntityTypesContext,
  nativeReference,
  useNativeEntity,
} from "./board-entity-store";
export const NativeOpenContext = createContext<() => boolean>(() => true);
const icons = {
  task: CheckSquare,
  evidence: FileSearch,
  idea: Lightbulb,
  competitor: Users,
  campaign: Flag,
  brief: FileText,
  note: NotebookPen,
};
export function BoardNativeCard({
  row,
  members = [],
  onActivate,
  properties = false,
}: {
  row: BoardElementRow;
  members?: TaskMember[];
  onActivate?: (id: string) => boolean;
  properties?: boolean;
}) {
  const result = useNativeEntity(row),
    beforeOpen = useContext(NativeOpenContext),
    reference = nativeReference(row);
  const metadata = useContext(BoardEntityTypesContext).get(
    reference?.entityType ?? "",
  );
  const label = metadata?.label ?? "Stylus item",
    Icon = icons[metadata?.icon ?? "brief"];
  return (
    <div
      data-native-card
      className={`bg-background text-foreground flex h-full min-w-0 flex-col gap-2 overflow-hidden rounded-md border p-3 ${properties ? "text-sm" : "text-xs"}`}
    >
      <p className="text-muted-foreground flex items-center gap-2">
        <Icon aria-hidden className="size-4 shrink-0" />
        {result?.status === "available" ? label : "Stylus item"}
      </p>
      {result?.status === "available" ? (
        <>
          <p className="line-clamp-2 font-medium">{result.projection.title}</p>
          {result.projection.archived ? <p>Archived</p> : null}
          {result.projection.status ? (
            <p>{result.projection.status.replaceAll("_", " ")}</p>
          ) : null}
          {properties && result.projection.summary ? (
            <p className="whitespace-pre-wrap">{result.projection.summary}</p>
          ) : null}
          <dl className="space-y-1">
            {result.projection.details
              .slice(0, properties ? 5 : 2)
              .map((detail) => (
                <div key={detail.label} className="flex min-w-0 gap-2">
                  <dt className="text-muted-foreground shrink-0">
                    {detail.label}
                  </dt>
                  <dd className="truncate">
                    {detail.kind === "member"
                      ? (members.find(
                          (member) => member.member_user_id === detail.value,
                        )?.display_name ?? "Member unavailable")
                      : detail.kind === "date"
                        ? /^\d{4}-\d{2}-\d{2}$/.test(detail.value)
                          ? new Date(
                              detail.value + "T00:00:00",
                            ).toLocaleDateString()
                          : new Date(detail.value).toLocaleString()
                        : detail.value}
                  </dd>
                </div>
              ))}
          </dl>
          <Link
            className="nodrag nopan text-primary mt-auto inline-flex min-h-10 shrink-0 items-center gap-1 underline"
            prefetch={false}
            href={result.projection.href as Route}
            onClick={(event) => {
              if (
                onActivate?.(row.id) === false ||
                (!(
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                ) &&
                  !beforeOpen())
              )
                event.preventDefault();
            }}
            aria-label={`Open ${label}: ${result.projection.title}`}
          >
            Open {label}
            <ArrowUpRight aria-hidden className="size-3" />
          </Link>
        </>
      ) : (
        <p role={result?.status === "error" ? "status" : undefined}>
          {!reference
            ? "Item unavailable"
            : !result
              ? "Loading item…"
              : result.status === "error"
                ? "Item could not load. Refresh items to retry."
                : "Item unavailable"}
        </p>
      )}
      {properties ? (
        <p className="text-muted-foreground text-xs">
          Linked to the canonical item. Edit it in its own workspace.
        </p>
      ) : null}
    </div>
  );
}
