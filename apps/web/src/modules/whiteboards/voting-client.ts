import { readVotingSchema, votingSnapshotSchema } from "./voting";
import type { z } from "zod";

/** Fetch bypasses Next's client Server Action queue; no shared/private cache. */
export async function readBoardVoting(input: z.infer<typeof readVotingSchema>) {
  const response = await fetch("/api/boards/voting", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readVotingSchema.parse(input)),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    return {
      status: "error",
      code: response.status === 403 ? "ACCESS" : "RETRY",
    } as const;
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("status" in result) ||
    result.status !== "success" ||
    !("data" in result)
  )
    throw Error("Invalid voting response");
  return {
    status: "success",
    data: votingSnapshotSchema.parse(result.data),
  } as const;
}
