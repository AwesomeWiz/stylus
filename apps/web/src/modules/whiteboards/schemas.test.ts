import { describe, expect, it } from "vitest";

import {
  boardImageSchema,
  boardTitleSchema,
  createElementSchema,
  updateElementSchema,
} from "./schemas";

const boardId = "10000000-0000-4000-8000-000000000001";

describe("whiteboard schemas", () => {
  it("normalizes a useful board title", () => {
    expect(boardTitleSchema.parse("  Brand direction  ")).toBe(
      "Brand direction",
    );
  });

  it("accepts valid final element geometry and content", () => {
    expect(
      createElementSchema.parse({
        boardId,
        content: { text: "Idea" },
        elementType: "STICKY",
        height: 180,
        metadata: {},
        style: { color: "#fff" },
        width: 200,
        x: -40,
        y: 90,
        zIndex: 2,
      }),
    ).toMatchObject({ height: 180, width: 200, x: -40, y: 90 });
  });

  it.each([
    [0, 100],
    [100, -1],
    [Number.NaN, 100],
  ])("rejects invalid dimensions", (width, height) => {
    expect(
      createElementSchema.safeParse({
        boardId,
        content: {},
        elementType: "SHAPE",
        height,
        metadata: {},
        style: {},
        width,
        x: 0,
        y: 0,
        zIndex: 1,
      }).success,
    ).toBe(false);
  });

  it("does not permit board or organization reassignment in an update payload", () => {
    const result = updateElementSchema.parse({
      elementId: "20000000-0000-4000-8000-000000000001",
      x: 10,
      boardId: "20000000-0000-4000-8000-000000000002",
      organizationId: boardId,
    });
    expect(result).toEqual({
      elementId: "20000000-0000-4000-8000-000000000001",
      x: 10,
    });
  });

  it("accepts PNG, JPEG, and WebP images within 10 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      const file = new File(["image"], `safe.${type.split("/")[1]}`, { type });
      expect(
        boardImageSchema.safeParse({
          boardId,
          file,
          height: 100,
          width: 100,
          x: 0,
          y: 0,
          zIndex: 1,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects executable and oversized uploads", () => {
    const executable = new File(["alert(1)"], "payload.svg", {
      type: "image/svg+xml",
    });
    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.png",
      { type: "image/png" },
    );
    expect(
      boardImageSchema.safeParse({
        boardId,
        file: executable,
        height: 100,
        width: 100,
        x: 0,
        y: 0,
        zIndex: 1,
      }).success,
    ).toBe(false);
    expect(
      boardImageSchema.safeParse({
        boardId,
        file: oversized,
        height: 100,
        width: 100,
        x: 0,
        y: 0,
        zIndex: 1,
      }).success,
    ).toBe(false);
  });
});
