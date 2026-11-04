"use client";
import type {
  BoardReactionKind,
  BoardReactionSummary,
  TaskMember,
} from "@/lib/supabase/database.types";
// The requested social feedback symbols are content, separate from Lucide tool icons.
export const reactionChoices = [
  { kind: "like", label: "Like", symbol: "👍" },
  { kind: "heart", label: "Love", symbol: "❤️" },
  { kind: "fire", label: "Great idea", symbol: "🔥" },
  { kind: "eyes", label: "Interested", symbol: "👀" },
  { kind: "celebrate", label: "Celebrate", symbol: "🎉" },
] as const;
export function BoardReactions({
  elementId,
  rows = [],
  members = [],
  canMutate,
  all = false,
  pending = [],
  onToggle,
}: {
  elementId: string;
  rows?: BoardReactionSummary[];
  members?: TaskMember[];
  canMutate: boolean;
  all?: boolean;
  pending?: string[];
  onToggle?: (id: string, kind: BoardReactionKind) => void;
}) {
  const choices = reactionChoices.filter(
    (choice) =>
      all || rows.some((row) => row.reaction === choice.kind && row.total > 0),
  );
  if (!choices.length) return null;
  return (
    <div
      role="group"
      aria-label="Object reactions"
      className="nodrag nopan nowheel bg-background text-foreground flex flex-wrap gap-0.5 rounded border p-0.5 shadow-sm"
    >
      {choices.map((choice) => {
        const row = rows.find((row) => row.reaction === choice.kind),
          people = row?.participants
            .map(
              (id) =>
                members.find((member) => member.member_user_id === id)
                  ?.display_name ?? "Former member",
            )
            .join(", ");
        return (
          <button
            key={choice.kind}
            type="button"
            disabled={
              !canMutate || pending.includes(elementId + ":" + choice.kind)
            }
            aria-label={`${choice.label}: ${row?.total ?? 0} reactions${row?.mine ? ", you reacted" : ""}`}
            aria-pressed={!!row?.mine}
            title={
              people
                ? `${choice.label}: ${people}${(row?.total ?? 0) > 20 ? ", and others" : ""}`
                : choice.label
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.(elementId, choice.kind);
            }}
            className="aria-pressed:bg-primary-subtle flex min-h-8 min-w-8 items-center justify-center gap-1 rounded px-1 text-xs disabled:opacity-70"
          >
            <span aria-hidden>{choice.symbol}</span>
            {row?.total ? <span>{row.total}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
