"use client";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import { boardPaint } from "@/modules/whiteboards/elements";
import { BoardTypography } from "./board-typography";
import { BoardColorPicker, boardFillColors } from "./board-color-picker";
export const STICKY_COLORS = [
  { background: "#fef3c7", color: "#713f12", label: "Butter" },
  { background: "#dbeafe", color: "#1e3a8a", label: "Sky" },
  { background: "#dcfce7", color: "#14532d", label: "Mint" },
  { background: "#ffe4e6", color: "#881337", label: "Rose" },
  { background: "#ede9fe", color: "#4c1d95", label: "Lavender" },
  { background: "#ffedd5", color: "#7c2d12", label: "Apricot" },
  { background: "#e4e4e7", color: "#27272a", label: "Neutral" },
];
export function WhiteboardInspector({
  element,
  onStyleChange,
  pending,
  showTypography = true,
}: {
  element: BoardElementRow;
  onStyleChange: (
    style: Record<string, unknown>,
  ) => Promise<boolean> | boolean | void;
  pending: boolean;
  showTypography?: boolean;
}) {
  const update = (patch: Record<string, unknown>) =>
    onStyleChange({ ...element.style, ...patch });
  if (showTypography && ["TEXT", "STICKY"].includes(element.element_type))
    return (
      <BoardTypography
        row={element}
        disabled={pending}
        compact
        onChange={onStyleChange}
      />
    );
  if (!["STICKY", "SHAPE", "ARROW"].includes(element.element_type)) return null;
  return (
    <div
      className="space-y-2"
      aria-label={`${element.element_type.toLowerCase()} formatting`}
    >
      {element.element_type === "STICKY" ? (
        <BoardColorPicker
          label="Sticky fill"
          elementId={element.id}
          styleKey="background"
          value={
            typeof element.style.background === "string"
              ? boardPaint(element.style.background, "#fef3c7")
              : boardPaint(element.style.color, "#fef3c7")
          }
          colors={STICKY_COLORS.map((c) => c.background)}
          disabled={pending}
          onChange={(background) => {
            const choice = STICKY_COLORS.find(
              (c) => c.background === background,
            );
            const auto =
              !element.style.background ||
              !element.style.color ||
              STICKY_COLORS.some((c) => c.color === element.style.color);
            return update({
              background,
              ...(choice && auto ? { color: choice.color } : {}),
            });
          }}
        />
      ) : null}
      {element.element_type === "SHAPE" ? (
        <>
          <BoardColorPicker
            label="Shape fill"
            elementId={element.id}
            styleKey="fill"
            allowNone
            value={boardPaint(element.style.fill, "#f4f4f5")}
            colors={boardFillColors}
            disabled={pending}
            onChange={(fill) => update({ fill })}
          />
          <BoardColorPicker
            label="Shape stroke"
            elementId={element.id}
            styleKey="stroke"
            allowNone
            value={boardPaint(element.style.stroke, "#71717a")}
            disabled={pending}
            onChange={(stroke) => update({ stroke })}
          />
        </>
      ) : null}
      {element.element_type === "ARROW" ? (
        <BoardColorPicker
          label="Arrow color"
          elementId={element.id}
          styleKey="color"
          value={boardPaint(element.style.color, "#52525b")}
          disabled={pending}
          onChange={(color) => update({ color })}
        />
      ) : null}
    </div>
  );
}
