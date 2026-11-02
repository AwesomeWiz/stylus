import type {
  BoardElementRow,
  BoardElementType,
} from "@/lib/supabase/database.types";

/** Paths are private object keys, never URLs or normalizable relative paths. */
export function isBoardImagePath(
  value: unknown,
  organizationId: string,
  boardId: string,
): value is string {
  if (typeof value !== "string") return false;
  const prefix = `${organizationId}/${boardId}/`;
  return (
    value.startsWith(prefix) &&
    /^[a-z0-9][a-z0-9_.-]{0,250}\.(png|jpe?g|webp)$/i.test(
      value.slice(prefix.length),
    )
  );
}

/** Authored paint cannot turn an SVG stroke into an external resource fetch. */
export function boardPaint(value: unknown, fallback: string) {
  return typeof value === "string" &&
    /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8})$/i.test(value)
    ? value
    : fallback;
}

export const defaultElementSize: Record<
  BoardElementType,
  { height: number; width: number }
> = {
  SECTION: { height: 420, width: 640 },
  GROUP: { height: 200, width: 300 },
  LINK: { height: 120, width: 300 },
  ARROW: { height: 24, width: 220 },
  IMAGE: { height: 240, width: 320 },
  SHAPE: { height: 140, width: 200 },
  STICKY: { height: 180, width: 200 },
  TEXT: { height: 80, width: 240 },
};

export function defaultElementData(type: BoardElementType) {
  switch (type) {
    case "SECTION":
      return {
        content: { title: "Section", collapsed: false },
        style: { fill: "#f4f4f5", stroke: "#a1a1aa" },
      };
    case "GROUP":
      return { content: { title: "Group" }, style: {} };
    case "LINK":
      return { content: { title: "", url: "", note: "" }, style: {} };
    case "TEXT":
      return {
        content: { text: "Text" },
        style: { align: "left", color: "#18181b", fontSize: 24 },
      };
    case "STICKY":
      return {
        content: { text: "New idea" },
        style: { background: "#fef3c7", color: "#713f12", fontSize: 18 },
      };
    case "SHAPE":
      return {
        content: { shape: "rectangle" },
        style: { fill: "#f4f4f5", stroke: "#71717a" },
      };
    case "ARROW":
      return {
        content: {},
        style: { color: "#52525b", strokeWidth: 2 },
      };
    case "IMAGE":
      return { content: {}, style: { objectFit: "contain" } };
  }
}

export function nextZIndex(elements: Pick<BoardElementRow, "z_index">[]) {
  return (
    elements.reduce(
      (highest, element) => Math.max(highest, element.z_index),
      0,
    ) + 1
  );
}

export function reorderElement(
  elements: BoardElementRow[],
  elementId: string,
  direction: "BACKWARD" | "FORWARD" | "FRONT" | "BACK",
) {
  const ordered = [...elements].sort(
    (left, right) =>
      left.z_index - right.z_index || left.id.localeCompare(right.id),
  );
  const currentIndex = ordered.findIndex((element) => element.id === elementId);
  if (currentIndex < 0) return elements;
  const targetIndex =
    direction === "FRONT"
      ? ordered.length - 1
      : direction === "BACK"
        ? 0
        : direction === "FORWARD"
          ? Math.min(ordered.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
  const [selected] = ordered.splice(currentIndex, 1);
  if (!selected) return elements;
  ordered.splice(targetIndex, 0, selected);
  const indexes = new Map(
    ordered.map((element, index) => [element.id, index + 1]),
  );
  return elements.map((element) => ({
    ...element,
    z_index: indexes.get(element.id) ?? element.z_index,
  }));
}
