import { describe, it, expect } from "vitest";
import {
  copyNativeReferences,
  pasteNativeReferences,
} from "./native-clipboard";
import { createLocalObject, duplicateObjects } from "./operations";
import { operationElementSchema } from "./schemas";
import { nativeInsertionPoint } from "./native-placement";
import { entityConversionSchema } from "./entity-schemas";
const org = crypto.randomUUID(),
  board = crypto.randomUUID(),
  actor = crypto.randomUUID(),
  reference = {
    entityType: "core.task",
    entityId: crypto.randomUUID(),
    organizationId: org,
  };
const card = createLocalObject(
  "ENTITY_CARD",
  board,
  org,
  actor,
  [],
  { x: 12, y: 20 },
  {
    content: { reference },
    style: {},
    metadata: { conversionId: crypto.randomUUID() },
  },
);
describe("native reference persistence and clipboard", () => {
  it("bounds reviewed UTF-8 input before allocating a durable receipt", () => {
    const scope = {
      organizationId: org,
      boardId: board,
      attemptId: crypto.randomUUID(),
      sourceIds: [card.id],
      entityType: "core.task",
    };
    expect(
      entityConversionSchema.safeParse({
        ...scope,
        fields: { title: "Reviewed", description: "a".repeat(5000) },
      }).success,
    ).toBe(true);
    expect(
      entityConversionSchema.safeParse({
        ...scope,
        fields: { title: "Reviewed", description: "\u0915".repeat(6000) },
      }).success,
    ).toBe(false);
  });
  it("places new links without covering source content or previous cards", () => {
    const point = nativeInsertionPoint([card], { x: card.x, y: card.y });
    expect(point.y).toBeGreaterThanOrEqual(card.y + card.height + 16);
    expect(nativeInsertionPoint([], point)).toEqual(point);
  });
  it("copies references and geometry only and rejects cross-tenant paste", () => {
    const text = copyNativeReferences([card])!;
    expect(text).not.toContain("conversionId");
    expect(text).not.toContain("created_by");
    expect(pasteNativeReferences(text, org)?.[0]?.reference).toEqual(reference);
    expect(pasteNativeReferences(text, crypto.randomUUID())).toBeUndefined();
    expect(
      pasteNativeReferences(
        text.replace('"reference":', '"title":"snapshot","reference":'),
        org,
      ),
    ).toBeUndefined();
  });
  it("duplicates only a reference, never its creation receipt", () => {
    const result = duplicateObjects([card], [card.id], actor),
      copy = result.rows.find((row) => row.id !== card.id)!;
    expect(copy.content).toEqual({ reference });
    expect(copy.metadata).toEqual({});
    expect(copy.id).not.toBe(card.id);
  });
  it("rejects saved snapshots, aliases, arbitrary styling and malformed references", () => {
    expect(operationElementSchema.safeParse(card).success).toBe(true);
    for (const patch of [
      { content: { reference, title: "Stale title" } },
      { metadata: { label: "Stale alias" } },
      { style: { color: "red" } },
      { content: { reference: { ...reference, secret: "hidden" } } },
    ])
      expect(
        operationElementSchema.safeParse({ ...card, ...patch }).success,
      ).toBe(false);
  });
});
