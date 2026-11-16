import { z } from "zod";
const id = z.uuid(),
  revision = z.iso.datetime({ offset: true }).nullable();
export const milestoneStatuses = ["PLANNED", "ACTIVE", "COMPLETE"] as const;
export const executionMutation = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("dependency"),
      taskId: id,
      blockedById: id,
      link: z.boolean(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("assignment"),
      taskId: id,
      milestoneId: id.nullable(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("milestone"),
      id,
      title: z.string().trim().min(2).max(160),
      description: z.string().max(4000),
      targetDate: z.iso.date().nullable(),
      status: z.enum(milestoneStatuses),
      ownerId: id.nullable(),
      archived: z.boolean(),
      revision,
    })
    .strict(),
  z
    .object({
      operation: z.literal("note"),
      id,
      title: z.string().trim().min(2).max(160),
      content: z.string().max(40000),
      archived: z.boolean(),
      revision,
    })
    .strict(),
  z
    .object({
      operation: z.literal("note-link"),
      noteId: id,
      kind: z.enum(["task", "milestone"]),
      targetId: id,
      link: z.boolean(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("note-memory"),
      noteId: id,
      revision: z.iso.datetime({ offset: true }),
      title: z.string().trim().min(2).max(160),
      content: z.string().trim().min(1).max(10000),
      kind: z.enum(["FACT", "DECISION", "INSIGHT", "PREFERENCE", "NOTE"]),
    })
    .strict(),
]);
export const executionSelection = z.object({ taskId: id }).strict();
export const executionSearch = z
  .object({
    kind: z.enum(["task", "milestone"]),
    query: z.string().trim().max(100),
    cursor: id.optional(),
  })
  .strict();
export type ExecutionMutation = z.infer<typeof executionMutation>;
