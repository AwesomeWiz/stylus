import { z } from "zod";
import type {
  BoardElementRow,
  BoardVoteRow,
  BoardVoteSummary,
  BoardVotingSessionRow,
  BoardVotingSnapshot,
} from "@/lib/supabase/database.types";
import { isObjectLocked } from "./operations";

export const votingTypes = [
  "STICKY",
  "TEXT",
  "IMAGE",
  "SHAPE",
  "GROUP",
] as const;
export const votingTypeLabels = {
  STICKY: "Sticky notes",
  TEXT: "Text",
  IMAGE: "Images",
  SHAPE: "Shapes",
  GROUP: "Groups",
};
export const startVotingSchema = z.object({
  boardId: z.uuid(),
  organizationId: z.uuid(),
  allowance: z.number().int().min(1).max(5),
  types: z
    .array(z.enum(votingTypes))
    .min(1)
    .max(5)
    .refine((types) => new Set(types).size === types.length),
});
export const voteSchema = z.object({
  boardId: z.uuid(),
  organizationId: z.uuid(),
  sessionId: z.uuid(),
  elementId: z.uuid(),
  slot: z.number().int().min(1).max(5),
  active: z.boolean(),
  requestId: z.uuid(),
  expectedVersion: z.number().int().min(0),
});
export const votingScopeSchema = z.object({
  boardId: z.uuid(),
  organizationId: z.uuid(),
});
export const readVotingSchema = votingScopeSchema.extend({
  ids: z.array(z.uuid()).max(200),
  after: z
    .object({ total: z.number().int().positive(), id: z.uuid() })
    .optional(),
});
const summarySchema = z.object({
  element_id: z.uuid(),
  total: z.number().int().nonnegative(),
  mine: z.number().int().min(0).max(5),
  participants: z.array(z.uuid()).max(20),
  rank: z.number().int().positive().optional(),
});
export const votingSnapshotSchema = z.object({
  session: z
    .object({
      id: z.uuid(),
      organization_id: z.uuid(),
      board_id: z.uuid(),
      status: z.enum(["ACTIVE", "ENDED"]),
      allowance: z.number().int().min(1).max(5),
      eligible_types: z.array(z.enum(votingTypes)).min(1).max(5),
      started_by: z.uuid().nullable(),
      ended_by: z.uuid().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      ended_at: z.string().nullable(),
      revision: z.number().int().positive(),
    })
    .nullable(),
  own_votes: z
    .array(
      z.object({
        organization_id: z.uuid(),
        board_id: z.uuid(),
        session_id: z.uuid(),
        voter_id: z.uuid(),
        slot: z.number().int().min(1).max(5),
        element_id: z.uuid(),
        active: z.boolean(),
        version: z.number().int().positive(),
        request_id: z.uuid(),
        updated_at: z.string(),
      }),
    )
    .max(5),
  summaries: z.array(summarySchema).max(200),
  results: z.array(summarySchema).max(100),
  has_more: z.boolean(),
});
export const emptyVoting: BoardVotingSnapshot = {
  session: null,
  own_votes: [],
  summaries: [],
  results: [],
  has_more: false,
};
export function eligibleForVoting(
  row: BoardElementRow,
  session: BoardVotingSessionRow | null,
  rows: BoardElementRow[],
) {
  return (
    !!session &&
    !row.archived_at &&
    session.eligible_types.includes(row.element_type) &&
    !isObjectLocked(row, rows)
  );
}
/** Replace only our allocation; remote counts in the latest snapshot survive rollback. */
export function projectVoting(
  data: BoardVotingSnapshot,
  own: BoardVoteRow[],
  userId: string,
) {
  const previous = new Map<string, number>(),
    next = new Map<string, number>();
  for (const vote of data.own_votes)
    if (vote.active)
      previous.set(vote.element_id, (previous.get(vote.element_id) ?? 0) + 1);
  for (const vote of own)
    if (vote.active)
      next.set(vote.element_id, (next.get(vote.element_id) ?? 0) + 1);
  const project = (row: BoardVoteSummary): BoardVoteSummary => {
    const mine = next.get(row.element_id) ?? 0,
      total = Math.max(
        0,
        row.total - (previous.get(row.element_id) ?? 0) + mine,
      );
    return {
      ...row,
      total,
      mine,
      participants: mine
        ? [...new Set([userId, ...row.participants])].slice(0, 20)
        : row.participants.filter((id) => id !== userId),
    };
  };
  const known = new Set(data.summaries.map((row) => row.element_id));
  const summaries = [
    ...data.summaries,
    ...[...next.keys()]
      .filter((id) => !known.has(id))
      .map((element_id) => ({
        element_id,
        total: 0,
        mine: 0,
        participants: [],
      })),
  ].map(project);
  return {
    ...data,
    own_votes: own,
    summaries,
    results: data.results.map(project),
  };
}
export function votingError(code?: string) {
  if (code === "55000") return "Voting has ended. Refresh results.";
  if (code === "PT409" || code === "23505")
    return "Voting changed. Refresh and try again.";
  if (code === "42501")
    return "Voting is unavailable. Check your Board access.";
  if (code === "22023")
    return "This vote is no longer eligible or available. Refresh voting.";
  return "Voting could not be confirmed. Refresh voting before retrying.";
}
