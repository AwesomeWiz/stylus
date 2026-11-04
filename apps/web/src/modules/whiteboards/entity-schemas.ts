import { z } from "zod";
import { entityReferenceSchema } from "@/core/entities/public";
const scope = { organizationId: z.uuid(), boardId: z.uuid() };
const sourceIds = z
  .array(z.uuid())
  .min(1)
  .max(30)
  .refine((ids) => new Set(ids).size === ids.length);
export const entityReadSchema = z.discriminatedUnion("operation", [
  z
    .object({
      ...scope,
      operation: z.literal("resolve"),
      references: z.array(entityReferenceSchema).max(50),
    })
    .strict(),
  z.object({ ...scope, operation: z.literal("discover") }).strict(),
  z
    .object({
      ...scope,
      operation: z.literal("search"),
      entityType: z.string().max(80),
      query: z.string().trim().max(120),
      cursor: z.uuid().optional(),
    })
    .strict(),
  z.object({ ...scope, operation: z.literal("preview"), sourceIds }).strict(),
  z
    .object({ ...scope, operation: z.literal("recover"), attemptId: z.uuid() })
    .strict(),
]);
export const entityConversionSchema = z
  .object({
    ...scope,
    attemptId: z.uuid(),
    entityType: z.string().max(80),
    sourceIds,
    fields: z
      .record(z.string().max(40), z.union([z.string().max(8000), z.null()]))
      .refine(
        (value) =>
          Object.keys(value).length <= 20 &&
          new TextEncoder().encode(JSON.stringify(value)).byteLength <= 15000,
        "Keep the conversion preview under 15 KB.",
      ),
  })
  .strict();
export type EntityReadInput = z.infer<typeof entityReadSchema>;
