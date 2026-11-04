"use client";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from "lucide-react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import { boardFonts, boardTypography } from "@/modules/whiteboards/typography";
import { boardPaint } from "@/modules/whiteboards/elements";
import { BoardPropertyField } from "./board-property-field";
export function BoardTypography({
  row,
  disabled = false,
  compact = false,
  onChange,
}: {
  row: BoardElementRow;
  disabled?: boolean;
  compact?: boolean;
  onChange: (style: Record<string, unknown>) => Promise<boolean> | void;
}) {
  const text = boardTypography(row.style),
    font = boardFonts.find((f) => f.id === text.family)!;
  const update = async (patch: Record<string, unknown>) =>
    (await onChange({ ...row.style, ...patch })) !== false;
  const selectClass =
    "bg-background text-foreground h-9 min-w-0 rounded border px-2 text-xs";
  return (
    <fieldset
      disabled={disabled}
      className={compact ? "flex shrink-0 items-center gap-1" : "space-y-3"}
      aria-label="Typography"
    >
      {!compact ? (
        <legend className="mb-2 text-xs font-medium">Typography</legend>
      ) : null}
      <div className="flex min-w-0 gap-2">
        <label
          className={
            compact ? "w-28 shrink-0 text-xs" : "min-w-0 flex-1 text-xs"
          }
        >
          {!compact ? "Family" : null}
          <select
            aria-label="Font family"
            value={text.family}
            className={`${selectClass} w-full`}
            onChange={(e) =>
              void update({
                family: e.target.value,
                italic: e.target.value === "lora" ? text.italic : false,
              })
            }
          >
            {boardFonts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        {!compact ? (
          <label className="text-xs">
            {!compact ? "Weight" : null}
            <select
              aria-label="Font weight"
              value={text.weight}
              className={selectClass}
              onChange={(e) => void update({ weight: Number(e.target.value) })}
            >
              {[
                [400, "Regular"],
                [500, "Medium"],
                [600, "Semibold"],
                [700, "Bold"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className={compact ? "w-16" : "grid grid-cols-2 gap-2"}>
        <BoardPropertyField
          label="Font size"
          hideLabel={compact}
          numeric
          min={8}
          max={256}
          value={text.fontSize}
          disabled={disabled}
          onCommit={(value) => update({ fontSize: value })}
        />
        {!compact ? (
          <BoardPropertyField
            label="Line height"
            numeric
            min={0.8}
            max={3}
            value={text.lineHeight}
            disabled={disabled}
            onCommit={(value) => update({ lineHeight: value })}
          />
        ) : null}
      </div>
      {!compact ? (
        <BoardPropertyField
          label="Letter spacing"
          numeric
          min={-5}
          max={20}
          value={text.letterSpacing}
          disabled={disabled}
          onCommit={(value) => update({ letterSpacing: value })}
        />
      ) : null}
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Text alignment"
      >
        {[
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
        ].map(([align, Icon]) => {
          const Glyph = Icon as typeof AlignLeft;
          return (
            <button
              key={String(align)}
              type="button"
              title={`Align ${align}`}
              aria-label={`Align ${align}`}
              aria-pressed={text.align === align}
              className="aria-pressed:bg-primary-subtle flex size-9 items-center justify-center rounded"
              onClick={() => void update({ align })}
            >
              <Glyph aria-hidden className="size-4" />
            </button>
          );
        })}
      </div>
      {!compact ? (
        <div className="flex gap-1" role="group" aria-label="Text style">
          {[
            ["weight", "Bold", Bold],
            ["italic", "Italic", Italic],
            ["underline", "Underline", Underline],
            ["strikethrough", "Strikethrough", Strikethrough],
          ]
            .filter(([key]) => key !== "italic" || font.italic)
            .map(([key, label, Icon]) => {
              const Glyph = Icon as typeof Bold,
                k = key as "weight" | "italic" | "underline" | "strikethrough",
                active = k === "weight" ? text.weight === 700 : !!text[k];
              return (
                <button
                  key={k}
                  type="button"
                  title={String(label)}
                  aria-label={String(label)}
                  aria-pressed={active}
                  className="aria-pressed:bg-primary-subtle flex size-9 items-center justify-center rounded"
                  onClick={() =>
                    void update({
                      [k]: k === "weight" ? (active ? 400 : 700) : !active,
                    })
                  }
                >
                  <Glyph aria-hidden className="size-4" />
                </button>
              );
            })}
        </div>
      ) : null}
      <label className="flex min-h-10 items-center justify-between gap-2 text-xs">
        {compact ? null : "Text color"}
        <input
          aria-label="Text color picker"
          type="color"
          defaultValue={boardPaint(row.style.color, "#18181b")}
          onBlur={(e) => void update({ color: e.target.value })}
          className="bg-background size-8 rounded border"
        />
      </label>
      {!compact ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Vertical alignment
            <select
              aria-label="Vertical alignment"
              value={text.verticalAlign}
              className={`${selectClass} w-full`}
              onChange={(e) => void update({ verticalAlign: e.target.value })}
            >
              {["top", "middle", "bottom"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Sizing
            <select
              aria-label="Text sizing"
              value={text.sizing}
              className={`${selectClass} w-full`}
              onChange={(e) => void update({ sizing: e.target.value })}
            >
              <option value="fixed">Fixed box</option>
              <option value="auto">Auto height</option>
            </select>
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
