import { z } from "zod";

export const memoryKinds = [
  "FACT",
  "DECISION",
  "INSIGHT",
  "PREFERENCE",
  "NOTE",
] as const;
export const memoryProvenanceValues = [
  "HUMAN",
  "PLUGIN",
  "IMPORTED",
  "SYSTEM",
] as const;

const memoryFields = {
  content: z
    .string()
    .trim()
    .min(1, "Enter the knowledge to remember.")
    .max(10_000, "Keep memory content under 10,000 characters."),
  kind: z.enum(memoryKinds),
  sourceReference: z
    .string()
    .trim()
    .max(500, "Keep the source reference under 500 characters."),
  title: z
    .string()
    .trim()
    .min(2, "Enter a concise title.")
    .max(160, "Keep the title under 160 characters."),
};

export const createMemorySchema = z.object(memoryFields);
export const updateMemorySchema = z.object({
  ...memoryFields,
  memoryId: z.uuid(),
});
export const memoryLifecycleSchema = z.object({
  archived: z.enum(["true", "false"]).transform((value) => value === "true"),
  memoryId: z.uuid(),
});

export const memoryFilterSchema = z.object({
  archived: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  kind: z.enum(memoryKinds).optional(),
  provenance: z.enum(memoryProvenanceValues).optional(),
  search: z.string().trim().max(100).default(""),
});

export type MemoryFilters = z.infer<typeof memoryFilterSchema>;
export type MemoryActionState = {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialMemoryActionState: MemoryActionState = { status: "idle" };
