"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BoardElementRow } from "@/lib/supabase/database.types";

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72];
const TEXT_COLORS = [
  "#18181b",
  "#52525b",
  "#1d4ed8",
  "#b91c1c",
  "#047857",
  "#7e22ce",
];
const STICKY_COLORS = [
  { background: "#fef3c7", color: "#713f12", label: "Yellow" },
  { background: "#dbeafe", color: "#1e3a8a", label: "Blue" },
  { background: "#dcfce7", color: "#14532d", label: "Green" },
  { background: "#ffe4e6", color: "#881337", label: "Rose" },
  { background: "#ede9fe", color: "#4c1d95", label: "Violet" },
  { background: "#e4e4e7", color: "#27272a", label: "Neutral" },
];
const FILL_COLORS = [
  "#ffffff",
  "#f4f4f5",
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#ffe4e6",
];

function Palette({
  colors,
  disabled,
  label,
  onChange,
  value,
}: {
  colors: string[];
  disabled: boolean;
  label: string;
  onChange: (color: string) => void;
  value?: string;
}) {
  return (
    <div aria-label={label} className="flex items-center gap-1" role="group">
      {colors.map((color) => (
        <button
          aria-label={`${label}: ${color}`}
          aria-pressed={value === color}
          className="aria-pressed:outline-primary size-6 rounded-full border border-black/20 outline-offset-2 aria-pressed:outline aria-pressed:outline-2"
          disabled={disabled}
          key={color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          type="button"
        />
      ))}
    </div>
  );
}

export function WhiteboardInspector({
  element,
  onStyleChange,
  pending,
}: {
  element: BoardElementRow;
  onStyleChange: (style: Record<string, unknown>) => void;
  pending: boolean;
}) {
  if (element.element_type === "IMAGE") return null;
  const updateStyle = (changes: Record<string, unknown>) =>
    onStyleChange({ ...element.style, ...changes });
  const fontSize =
    typeof element.style.fontSize === "number" ? element.style.fontSize : 18;

  return (
    <div
      aria-label={`${element.element_type.toLowerCase()} formatting`}
      className="bg-background flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-lg border p-1.5 shadow-sm"
      role="toolbar"
    >
      {element.element_type === "TEXT" || element.element_type === "STICKY" ? (
        <label className="text-muted-foreground flex items-center gap-1 text-xs">
          Size
          <select
            aria-label="Font size"
            className="bg-background text-foreground h-8 rounded-md border px-2 text-sm"
            disabled={pending}
            onChange={(event) =>
              updateStyle({ fontSize: Number(event.currentTarget.value) })
            }
            value={Math.min(72, Math.max(12, fontSize))}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {element.element_type === "TEXT" ? (
        <>
          <Palette
            colors={TEXT_COLORS}
            disabled={pending}
            label="Text color"
            onChange={(color) => updateStyle({ color })}
            value={String(element.style.color ?? "#18181b")}
          />
          <div aria-label="Text alignment" className="flex" role="group">
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ] as const
            ).map(([alignment, Icon]) => (
              <Button
                aria-label={`Align ${alignment}`}
                aria-pressed={(element.style.align ?? "left") === alignment}
                disabled={pending}
                key={alignment}
                onClick={() => updateStyle({ align: alignment })}
                size="icon"
                variant="ghost"
              >
                <Icon aria-hidden="true" className="size-4" />
              </Button>
            ))}
          </div>
        </>
      ) : null}
      {element.element_type === "STICKY" ? (
        <div
          aria-label="Sticky color"
          className="flex items-center gap-1"
          role="group"
        >
          {STICKY_COLORS.map((choice) => (
            <button
              aria-label={`${choice.label} sticky`}
              aria-pressed={
                element.style.background === choice.background ||
                (!element.style.background &&
                  element.style.color === choice.background)
              }
              className="aria-pressed:outline-primary size-6 rounded-full border border-black/20 outline-offset-2 aria-pressed:outline aria-pressed:outline-2"
              disabled={pending}
              key={choice.label}
              onClick={() => updateStyle(choice)}
              style={{ backgroundColor: choice.background }}
              type="button"
            />
          ))}
        </div>
      ) : null}
      {element.element_type === "SHAPE" ? (
        <>
          <span className="text-muted-foreground text-xs">Fill</span>
          <Palette
            colors={FILL_COLORS}
            disabled={pending}
            label="Shape fill"
            onChange={(fill) => updateStyle({ fill })}
            value={String(element.style.fill ?? "#f4f4f5")}
          />
          <span className="text-muted-foreground text-xs">Stroke</span>
          <Palette
            colors={TEXT_COLORS}
            disabled={pending}
            label="Shape stroke"
            onChange={(stroke) => updateStyle({ stroke })}
            value={String(element.style.stroke ?? "#71717a")}
          />
        </>
      ) : null}
      {element.element_type === "ARROW" ? (
        <Palette
          colors={TEXT_COLORS}
          disabled={pending}
          label="Arrow color"
          onChange={(color) => updateStyle({ color })}
          value={String(element.style.color ?? "#52525b")}
        />
      ) : null}
    </div>
  );
}
