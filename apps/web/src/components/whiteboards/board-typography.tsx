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
import {
  boardFonts,
  boardFontOptions,
  boardTypography,
  nearestBoardWeight,
} from "@/modules/whiteboards/typography";
import { boardPaint } from "@/modules/whiteboards/elements";
import { BoardPropertyField } from "./board-property-field";
import { BoardSelect } from "./board-select";
import { BoardColorPicker } from "./board-color-picker";
export const boardFontSizes = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96,
];
export const boardLineHeights = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2];
export const boardLetterSpacings = [-2, -1, 0, 0.5, 1, 2, 4];
const weightLabels: Record<number, string> = {
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
};
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
    (await onChange({
      ...row.style,
      ...(row.element_type === "STICKY" &&
      !row.style.background &&
      patch.color !== undefined
        ? { background: boardPaint(row.style.color, "#fef3c7") }
        : {}),
      ...patch,
    })) !== false;
  return (
    <fieldset
      disabled={disabled}
      aria-label="Typography"
      className={
        compact ? "flex shrink-0 items-center gap-2" : "space-y-3 border-t pt-4"
      }
    >
      {!compact ? (
        <legend className="text-foreground mb-2 text-xs font-medium">
          Typography
        </legend>
      ) : null}
      <div className={compact ? "w-36 min-w-0" : "w-full"}>
        <BoardSelect
          label="Font family"
          hideLabel={compact}
          value={text.family}
          searchable
          disabled={disabled}
          options={boardFontOptions}
          onChange={(family) => {
            const next = boardFonts.find((f) => f.id === family)!;
            void update({
              family,
              weight: nearestBoardWeight(family, text.weight),
              italic: next.italic && text.italic,
            });
          }}
        />
      </div>
      <div className={compact ? "w-20" : "grid grid-cols-2 items-start gap-3"}>
        {!compact ? (
          <BoardSelect
            label="Font weight"
            value={String(text.weight)}
            disabled={disabled}
            options={font.weights.map((weight) => ({
              value: String(weight),
              label: weightLabels[weight]!,
            }))}
            onChange={(weight) => void update({ weight: Number(weight) })}
          />
        ) : null}
        <BoardPropertyField
          label="Font size"
          hideLabel={compact}
          value={text.fontSize}
          numeric
          min={8}
          max={256}
          presets={boardFontSizes}
          disabled={disabled}
          onCommit={(value) => update({ fontSize: value })}
        />
      </div>
      {!compact ? (
        <div className="grid grid-cols-2 items-start gap-3">
          <BoardPropertyField
            label="Line height"
            value={text.lineHeight}
            numeric
            min={0.8}
            max={3}
            presets={boardLineHeights}
            disabled={disabled}
            onCommit={(value) => update({ lineHeight: value })}
          />
          <BoardPropertyField
            label="Letter spacing"
            value={text.letterSpacing}
            numeric
            min={-5}
            max={20}
            presets={boardLetterSpacings}
            disabled={disabled}
            onCommit={(value) => update({ letterSpacing: value })}
          />
        </div>
      ) : null}
      <div className="flex gap-1" role="group" aria-label="Text alignment">
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const
        ).map(([align, Icon]) => (
          <button
            key={align}
            type="button"
            title={`Align ${align}`}
            aria-label={`Align ${align}`}
            aria-pressed={text.align === align}
            className="hover:bg-muted aria-pressed:bg-primary-subtle flex size-10 items-center justify-center rounded"
            onClick={() => void update({ align })}
          >
            <Icon aria-hidden className="size-4" />
          </button>
        ))}
      </div>
      {!compact ? (
        <div className="flex gap-1" role="group" aria-label="Text style">
          {(
            [
              ["weight", "Bold", Bold],
              ["italic", "Italic", Italic],
              ["underline", "Underline", Underline],
              ["strikethrough", "Strikethrough", Strikethrough],
            ] as const
          )
            .filter(([key]) => key !== "italic" || font.italic)
            .map(([key, label, Icon]) => {
              const active =
                key === "weight" ? text.weight === 700 : !!text[key];
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  disabled={
                    disabled || (key === "weight" && font.weights.length === 1)
                  }
                  className="hover:bg-muted aria-pressed:bg-primary-subtle flex size-10 items-center justify-center rounded disabled:opacity-50"
                  onClick={() =>
                    void update({
                      [key]:
                        key === "weight"
                          ? nearestBoardWeight(text.family, active ? 400 : 700)
                          : !active,
                    })
                  }
                >
                  <Icon aria-hidden className="size-4" />
                </button>
              );
            })}
        </div>
      ) : null}
      <BoardColorPicker
        label="Text color"
        compact={compact}
        value={
          row.element_type === "STICKY" && !row.style.background
            ? "#713f12"
            : boardPaint(row.style.color, "#18181b")
        }
        disabled={disabled}
        onChange={(color) => update({ color })}
      />
      {!compact ? (
        <div className="grid grid-cols-2 items-start gap-3">
          <BoardSelect
            label="Vertical alignment"
            value={text.verticalAlign}
            disabled={disabled}
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
            onChange={(verticalAlign) => void update({ verticalAlign })}
          />
          <BoardSelect
            label="Text sizing"
            value={text.sizing}
            disabled={disabled}
            options={[
              { value: "fixed", label: "Fixed box" },
              { value: "auto", label: "Auto height" },
            ]}
            onChange={(sizing) => void update({ sizing })}
          />
        </div>
      ) : null}
    </fieldset>
  );
}
