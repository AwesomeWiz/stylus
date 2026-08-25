import { z } from "zod";

import type { BoardElementType } from "@/lib/supabase/database.types";

export const boardTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a board name.")
  .max(120, "Keep the board name under 120 characters.");

export const boardIdSchema = z.uuid();
export const elementIdSchema = z.uuid();
export const boardElementTypeSchema = z.enum([
  "TEXT",
  "STICKY",
  "IMAGE",
  "SHAPE",
  "ARROW",
] satisfies readonly BoardElementType[]);

const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);
const dimension = z.number().finite().min(24).max(10_000);
const jsonObject = z.record(z.string(), z.unknown());

export const createElementSchema = z.object({
  boardId: boardIdSchema,
  content: jsonObject,
  elementType: boardElementTypeSchema,
  height: dimension,
  metadata: jsonObject.default({}),
  rotation: z.number().finite().min(-360).max(360).default(0),
  style: jsonObject,
  width: dimension,
  x: coordinate,
  y: coordinate,
  zIndex: z.number().int().min(-1_000_000).max(1_000_000),
});

export const updateElementSchema = z
  .object({
    content: jsonObject.optional(),
    elementId: elementIdSchema,
    height: dimension.optional(),
    metadata: jsonObject.optional(),
    rotation: z.number().finite().min(-360).max(360).optional(),
    style: jsonObject.optional(),
    width: dimension.optional(),
    x: coordinate.optional(),
    y: coordinate.optional(),
    zIndex: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  })
  .refine(
    (input) =>
      Object.entries(input).some(
        ([key, entry]) => key !== "elementId" && entry !== undefined,
      ),
    "Provide an element change.",
  );

export const boardImageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Choose an image.")
  .refine(
    (file) => file.size <= 10 * 1024 * 1024,
    "Images must be 10 MB or smaller.",
  )
  .refine(
    (file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    "Upload a PNG, JPEG, or WebP image.",
  );

export const boardImageSchema = z.object({
  boardId: boardIdSchema,
  file: boardImageFileSchema,
  height: dimension,
  width: dimension,
  x: coordinate,
  y: coordinate,
  zIndex: z.number().int().min(-1_000_000).max(1_000_000),
});

export type CreateElementInput = z.input<typeof createElementSchema>;
export type UpdateElementInput = z.input<typeof updateElementSchema>;
