import { z } from "zod";
import { entityProjectionSchema } from "@/core/entities/public";
/** Content-only public projection; no plugin persistence reaches Core consumers. */
export const attentionItemSchema = z
  .object({
    id: z.string().min(1).max(120),
    kind: z
      .string()
      .regex(/^[a-z][a-z-]*$/)
      .max(40),
    title: z.string().min(1).max(200),
    href: entityProjectionSchema.shape.href,
    scope: z.enum(["personal", "team"]),
    reason: z.string().min(1).max(120),
    timestamp: z
      .union([z.iso.datetime({ offset: true }), z.iso.date()])
      .nullable(),
    ownerId: z.uuid().nullable(),
    rank: z.number().int().min(0).max(9),
  })
  .strict();
export type AttentionItem = z.infer<typeof attentionItemSchema>;
export function attentionGroups(items: readonly AttentionItem[]) {
  const unique = [
    ...new Map(items.map((i) => [i.kind + ":" + i.id, i])).values(),
  ].sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.timestamp ?? "9999").localeCompare(b.timestamp ?? "9999") ||
      a.id.localeCompare(b.id),
  );
  function bounded(scope: AttentionItem["scope"]) {
    const candidates = unique.filter(
      (i) => i.scope === scope && i.kind !== "learning",
    );
    // Reserve the first action of each kind so a busy Task list cannot hide
    // every evaluation or delivery checkpoint. Fill remaining space by rank.
    const first = new Map<string, AttentionItem>();
    for (const item of candidates)
      if (!first.has(item.kind)) first.set(item.kind, item);
    const selected = new Set([...first.values()].slice(0, 12));
    for (const item of candidates) {
      if (selected.size === 12) break;
      selected.add(item);
    }
    return candidates.filter((item) => selected.has(item));
  }
  return {
    personal: bounded("personal"),
    team: bounded("team"),
    learning: unique.filter((i) => i.kind === "learning").slice(0, 3),
  };
}
