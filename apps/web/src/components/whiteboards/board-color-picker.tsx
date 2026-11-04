"use client";
import { useId } from "react";
import { Check } from "lucide-react";
import { BoardPopover, useBoardPopup } from "./board-popover";
import { BoardPropertyField } from "./board-property-field";
export const boardInkColors = [
  "#18181b",
  "#52525b",
  "#1d4ed8",
  "#b91c1c",
  "#047857",
  "#7e22ce",
];
export const boardFillColors = [
  "#ffffff",
  "#f4f4f5",
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#ffedd5",
  "#ede9fe",
  "#ffe4e6",
];
export function isBoardHex(value: string) {
  return /^#(?:[a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value);
}
export function BoardColorPicker({
  label,
  value,
  colors = boardInkColors,
  disabled = false,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  colors?: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => Promise<boolean> | boolean | void;
  compact?: boolean;
}) {
  const id = useId();
  const { anchor, host, open, setOpen } = useBoardPopup<HTMLButtonElement>();
  function close(restore: boolean) {
    setOpen(false);
    if (restore) anchor.current?.focus({ preventScroll: true });
  }
  const choose = async (color: string) => (await onChange(color)) !== false;
  return (
    <div className="flex min-h-10 min-w-0 items-center justify-between gap-2 text-xs">
      {!compact ? <span className="text-muted-foreground">{label}</span> : null}
      <button
        ref={anchor}
        type="button"
        aria-label={`${label}: ${value}`}
        title={`${label}: ${value}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-controls={id}
        aria-expanded={open}
        className="hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded disabled:opacity-50 max-md:size-11"
        onClick={() => setOpen(!open)}
      >
        <span
          aria-hidden
          className="size-5 rounded-sm ring-1 ring-black/15 ring-inset"
          style={{ backgroundColor: value }}
        />
      </button>
      <BoardPopover
        host={host}
        open={open && !disabled}
        onClose={close}
        anchor={anchor}
        id={id}
        label={`${label} picker`}
        width={288}
      >
        <div className="space-y-3 p-2">
          <p className="text-xs font-medium">{label}</p>
          <div
            role="group"
            aria-label={`${label} palette`}
            className="grid grid-cols-6 gap-1 max-md:grid-cols-5"
          >
            {colors.map((color, i) => (
              <button
                key={color}
                data-autofocus={i === 0 ? "true" : undefined}
                type="button"
                aria-label={`${label}: ${color}`}
                aria-pressed={color.toLowerCase() === value.toLowerCase()}
                className="hover:bg-muted flex size-10 items-center justify-center rounded max-md:size-11"
                onClick={() => {
                  close(true);
                  void choose(color);
                }}
              >
                <span
                  aria-hidden
                  className="relative flex size-5 items-center justify-center rounded-sm ring-1 ring-black/15 ring-inset"
                  style={{ backgroundColor: color }}
                >
                  {color.toLowerCase() === value.toLowerCase() ? (
                    <Check className="size-3 text-white mix-blend-difference" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <BoardPropertyField
            onEscape={() => close(true)}
            label={`${label} HEX`}
            value={value}
            disabled={disabled}
            validate={(raw) =>
              isBoardHex(String(raw).trim())
                ? null
                : "Enter a HEX color such as #4F5BD5."
            }
            onCommit={async (raw) => {
              close(true);
              return choose(String(raw).trim());
            }}
          />
          <p className="text-muted-foreground text-[11px]">
            HEX, including an optional alpha channel.
          </p>
        </div>
      </BoardPopover>
    </div>
  );
}
