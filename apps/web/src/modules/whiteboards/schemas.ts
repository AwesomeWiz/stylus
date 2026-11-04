import { z } from "zod";

import type { BoardElementType } from "@/lib/supabase/database.types";
import { boardTypographySchema } from "./typography";

export const boardTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a board name.")
  .max(120, "Keep the board name under 120 characters.");

export const boardIdSchema = z.uuid();
export const elementIdSchema = z.uuid();
export const commentIdSchema = z.uuid();
export const boardElementTypeSchema = z.enum([
  "TEXT",
  "STICKY",
  "IMAGE",
  "SHAPE",
  "ARROW",
  "SECTION",
  "GROUP",
  "LINK",
] satisfies readonly BoardElementType[]);

const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);
const dimension = z.number().finite().min(24).max(10_000);
const jsonObject = z.record(z.string(), z.unknown()).refine((value) => {
  try {
    return JSON.stringify(value).length <= 24000;
  } catch {
    return false;
  }
}, "Keep object data under 24 KB.");

export const safeBoardUrl = z
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an http or https URL without credentials.");
export const boardShapeValues = [
  "rectangle",
  "rounded_rectangle",
  "circle",
  "diamond",
  "line",
  "arrow",
] as const;
export const boardTemplateValues = [
  "blank",
  "brand-moodboard",
  "campaign",
  "reel-storyboard",
  "research-synthesis",
  "competitor-inspiration",
  "brainstorm",
] as const;
export const boardTemplateSchema = z.enum(boardTemplateValues);

export const createElementSchema = z.object({
  id: elementIdSchema.optional(),
  boardId: boardIdSchema,
  content: jsonObject,
  parentId: elementIdSchema.nullable().optional(),
  locked: z.boolean().optional(),
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
    parentId: elementIdSchema.nullable().optional(),
    locked: z.boolean().optional(),
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

export const createBoardCommentSchema = z.object({
  boardId: boardIdSchema,
  body: z.string().trim().min(1, "Write a comment.").max(2000),
  elementId: elementIdSchema.nullable().default(null),
  mentionedUserIds: z.array(z.uuid()).max(50).default([]),
  parentId: commentIdSchema.nullable().default(null),
});

export type CreateElementInput = z.input<typeof createElementSchema>;
export type UpdateElementInput = z.input<typeof updateElementSchema>;
export type CreateBoardCommentInput = z.input<typeof createBoardCommentSchema>;

export const operationElementSchema = z
  .object({
    id: elementIdSchema,
    element_type: boardElementTypeSchema,
    x: coordinate,
    y: coordinate,
    width: dimension,
    height: dimension,
    rotation: z.number().finite().min(-360).max(360),
    z_index: z.number().int().min(-1_000_000).max(1_000_000),
    parent_id: elementIdSchema.nullable(),
    locked: z.boolean(),
    content: jsonObject,
    style: jsonObject,
    metadata: jsonObject,
  })
  .superRefine((value, context) => {
    if (value.element_type === "ARROW") {
      if (
        value.content.label !== undefined &&
        (typeof value.content.label !== "string" ||
          value.content.label.length > 200)
      )
        context.addIssue({
          code: "custom",
          path: ["content", "label"],
          message: "Keep arrow labels under 200 characters.",
        });
      if (
        value.content.reverse !== undefined &&
        typeof value.content.reverse !== "boolean"
      )
        context.addIssue({
          code: "custom",
          path: ["content", "reverse"],
          message: "Choose a valid arrow direction.",
        });
    }
    for (const key of Object.keys(
      boardTypographySchema.shape,
    ) as (keyof typeof boardTypographySchema.shape)[]) {
      if (
        value.style[key] !== undefined &&
        !boardTypographySchema.shape[key].safeParse(value.style[key]).success
      )
        context.addIssue({
          code: "custom",
          path: ["style", key],
          message: "Use a supported text property value.",
        });
    }
    if (
      value.metadata.label !== undefined &&
      (typeof value.metadata.label !== "string" ||
        !value.metadata.label.trim() ||
        value.metadata.label.length > 200)
    )
      context.addIssue({
        code: "custom",
        path: ["metadata", "label"],
        message: "Use a layer name from 1 to 200 characters.",
      });
    function issue(message: string) {
      context.addIssue({ code: "custom", message });
    }
    for (const key of ["text", "alt", "caption", "note"])
      if (
        value.content[key] !== undefined &&
        (typeof value.content[key] !== "string" ||
          value.content[key].length > 5000)
      )
        issue("Keep text under 5,000 characters.");
    if (
      value.element_type === "IMAGE" &&
      value.content.sourceUrl &&
      !safeBoardUrl.safeParse(value.content.sourceUrl).success
    )
      issue("Enter a safe source URL.");
    if (value.element_type === "LINK") {
      if (!safeBoardUrl.safeParse(value.content.url).success)
        issue("Enter a safe link URL.");
      if (
        !z.string().trim().min(1).max(200).safeParse(value.content.title)
          .success
      )
        issue("Enter a link title.");
    }
    if (value.element_type === "SECTION") {
      if (
        value.parent_id ||
        !z.string().trim().min(1).max(200).safeParse(value.content.title)
          .success
      )
        issue("Sections need a name and cannot be nested.");
      if (
        value.content.collapsed !== undefined &&
        typeof value.content.collapsed !== "boolean"
      )
        issue("Invalid collapse state.");
    }
    for (const [key, min, max] of [
      ["cropZoom", 1, 4],
      ["cropX", 0, 100],
      ["cropY", 0, 100],
      ["fontSize", 12, 72],
    ] as const) {
      if (
        value.style[key] !== undefined &&
        !z.number().finite().min(min).max(max).safeParse(value.style[key])
          .success
      )
        issue(`Invalid ${key}.`);
    }
  });
export const boardOperationSchema = z
  .object({
    boardId: boardIdSchema,
    upserts: z.array(operationElementSchema).max(200),
    archiveIds: z.array(elementIdSchema).max(200),
  })
  .refine(({ upserts, archiveIds }) => {
    const ids = [...upserts.map((row) => row.id), ...archiveIds];
    return (
      ids.length > 0 && ids.length <= 200 && new Set(ids).size === ids.length
    );
  }, "Choose between 1 and 200 distinct objects.");
