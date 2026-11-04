import { z } from "zod";
import { entityReferenceSchema } from "@/core/entities/public";
import type { BoardElementRow } from "@/lib/supabase/database.types";
const documentSchema = z
  .object({
    kind: z.literal("stylus-native-references-v1"),
    items: z
      .array(
        z
          .object({
            reference: entityReferenceSchema,
            x: z.number().finite().min(-2000000).max(2000000),
            y: z.number().finite().min(-2000000).max(2000000),
            width: z.number().min(24).max(10000),
            height: z.number().min(24).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export function copyNativeReferences(rows: BoardElementRow[]) {
  if (
    !rows.length ||
    rows.length > 50 ||
    rows.some((row) => row.element_type !== "ENTITY_CARD")
  )
    return undefined;
  const left = Math.min(...rows.map((row) => row.x)),
    top = Math.min(...rows.map((row) => row.y));
  return JSON.stringify(
    documentSchema.parse({
      kind: "stylus-native-references-v1",
      items: rows.map((row) => ({
        reference: row.content.reference,
        x: row.x - left,
        y: row.y - top,
        width: row.width,
        height: row.height,
      })),
    }),
  );
}
export function pasteNativeReferences(text: string, organizationId: string) {
  if (text.length > 32768) return undefined;
  try {
    const parsed = documentSchema.safeParse(JSON.parse(text));
    if (
      !parsed.success ||
      parsed.data.items.some(
        (item) => item.reference.organizationId !== organizationId,
      )
    )
      return undefined;
    return parsed.data.items;
  } catch {
    return undefined;
  }
}
