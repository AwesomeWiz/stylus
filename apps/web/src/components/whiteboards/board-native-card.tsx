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
  CircleHelp,
  FlaskConical,
  BookOpenCheck,
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
  hypothesis: CircleHelp,
  experiment: FlaskConical,
  learning: BookOpenCheck,
};
function displayValue(value: string) {
  if (!/^[A-Z][A-Z_ ]+$/.test(value)) return value;
  const text = value.toLowerCase().replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
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
      className={`bg-background text-foreground hover:border-ring/50 focus-within:border-ring flex h-full min-w-0 flex-col overflow-hidden rounded-md border p-3 ${properties ? "gap-2 text-sm" : "gap-1 text-xs"}`}
    >
      <p className="text-muted-foreground flex shrink-0 items-center gap-2 text-[10px] font-medium tracking-wide uppercase">
        <Icon aria-hidden className="size-4 shrink-0" />
        {result?.status === "available" ? label : "Stylus item"}
      </p>
      {result?.status === "available" ? (
        <>
          <p className="line-clamp-2 shrink-0 text-sm leading-4 font-semibold [overflow-wrap:anywhere]">
            {result.projection.title}
          </p>
          <div
            className={
              properties
                ? "space-y-2"
                : "min-h-0 flex-1 space-y-1 overflow-hidden"
            }
          >
            {result.projection.archived || result.projection.status ? (
              <div className="flex flex-wrap gap-1">
                {[
                  ...(result.projection.archived ? ["Archived"] : []),
                  ...(result.projection.status
                    ? [displayValue(result.projection.status)]
                    : []),
                ]
                  .filter((s, i, all) => all.indexOf(s) === i)
                  .map((status) => (
                    <span
                      key={status}
                      className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] leading-3"
                    >
                      {status}
                    </span>
                  ))}
              </div>
            ) : null}
            {properties && result.projection.summary ? (
              <p className="whitespace-pre-wrap">{result.projection.summary}</p>
            ) : null}
            {!properties &&
            metadata?.icon === "experiment" &&
            result.projection.summary ? (
              <p
                title={result.projection.summary}
                className="text-muted-foreground line-clamp-1 text-[11px] leading-4 [overflow-wrap:anywhere]"
              >
                {result.projection.summary}
              </p>
            ) : null}
            <dl className="space-y-0.5 text-[11px] leading-3.5">
              {result.projection.details
                .filter(
                  (detail) =>
                    properties ||
                    !(
                      detail.label === "Confidence" &&
                      result.projection.status?.endsWith("CONFIDENCE")
                    ),
                )
                .filter(
                  (detail) =>
                    properties ||
                    metadata?.icon !== "experiment" ||
                    !result.projection.summary ||
                    detail.label ===
                      (result.projection.details.some(
                        (d) => d.label === "Target end",
                      )
                        ? "Target end"
                        : "Owner"),
                )
                .slice(
                  0,
                  properties
                    ? 5
                    : metadata?.icon === "experiment" &&
                        result.projection.summary
                      ? 1
                      : 2,
                )
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
                          : displayValue(detail.value)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
          <Link
            className="nodrag nopan hover:bg-muted focus-visible:outline-ring mt-auto inline-flex min-h-10 shrink-0 items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 max-md:min-h-11"
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
