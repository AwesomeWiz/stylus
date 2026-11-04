"use client";
import "./board-color-picker.css";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { Check, Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BoardPopover, useBoardPopup } from "./board-popover";
import { BoardColorPreviewContext } from "./board-color-preview";
import {
  hexToHSV,
  hsvToHex,
  isBoardHex,
  sampleColorSquare,
  type BoardHSV,
} from "@/modules/whiteboards/color";
import { useBoardEvent } from "./use-board-event";
export { isBoardHex } from "@/modules/whiteboards/color";
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
type Eyedropper = {
  open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>;
};
export function BoardColorPicker({
  label,
  value,
  colors = boardInkColors,
  disabled = false,
  onChange,
  compact = false,
  elementId,
  styleKey,
  previewExtras,
  allowNone = false,
}: {
  label: string;
  value: string;
  colors?: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => Promise<boolean> | boolean | void;
  compact?: boolean;
  elementId?: string;
  styleKey?: "color" | "background" | "fill" | "stroke";
  previewExtras?: Record<string, unknown>;
  allowNone?: boolean;
}) {
  const id = useId(),
    { anchor, host, open, setOpen } = useBoardPopup<HTMLButtonElement>(),
    previews = useContext(BoardColorPreviewContext);
  const initial = isBoardHex(value) ? value : "#000000";
  const [draft, setDraft] = useState(initial),
    [hsv, setHSV] = useState(() => hexToHSV(initial)),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const confirmed = useRef(initial),
    latest = useRef(initial),
    color = useRef(hsv),
    dirty = useRef(false),
    saving = useRef(false),
    gesture = useRef<number | null>(null),
    eyedropper = useRef<AbortController | null>(null);
  const preview = useBoardEvent((hex: string) => {
    if (elementId && styleKey)
      previews?.set(elementId, id, { ...previewExtras, [styleKey]: hex });
  });
  const clear = useBoardEvent(() => {
    if (elementId) previews?.clear(elementId, id);
  });
  function reset(hex: string) {
    const next = hexToHSV(hex, color.current.h);
    latest.current = hex;
    color.current = next;
    setDraft(hex);
    setHSV(next);
    dirty.current = false;
    setError(null);
  }
  const receive = useBoardEvent(() => {
    if (!dirty.current && !saving.current) {
      confirmed.current = isBoardHex(value) ? value : "#000000";
      reset(confirmed.current);
    }
  });
  useEffect(() => receive(), [value, receive]);
  useEffect(
    () => () => {
      eyedropper.current?.abort();
      clear();
    },
    [clear],
  );
  function focus() {
    anchor.current?.focus({ preventScroll: true });
  }
  function cancel(restore = true) {
    gesture.current = null;
    eyedropper.current?.abort();
    reset(confirmed.current);
    clear();
    setOpen(false);
    if (restore) focus();
  }
  const commit = useBoardEvent(
    async (hex: string = latest.current, close: boolean = false) => {
      if (!isBoardHex(hex)) {
        setError("Enter a HEX color such as #4F5BD5.");
        return false;
      }
      if (saving.current) return false;
      const previous = confirmed.current;
      if (hex === previous) {
        dirty.current = false;
        clear();
        if (close) {
          setOpen(false);
          focus();
        }
        return true;
      }
      saving.current = true;
      setPending(true);
      preview(hex);
      setError(null);
      try {
        const ok = (await onChange(hex)) !== false;
        if (ok) {
          confirmed.current = hex;
          reset(hex);
        } else {
          reset(previous);
          setError("Color could not save. The confirmed color is restored.");
        }
        return ok;
      } catch {
        reset(previous);
        setError("Color could not save. The confirmed color is restored.");
        return false;
      } finally {
        saving.current = false;
        setPending(false);
        clear();
        if (close) {
          setOpen(false);
          focus();
        }
      }
    },
  );
  function update(next: BoardHSV) {
    color.current = next;
    const hex = hsvToHex(next);
    latest.current = hex;
    dirty.current = hex !== confirmed.current;
    setHSV(next);
    setDraft(hex);
    setError(null);
    preview(hex);
  }
  function sample(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    update(
      sampleColorSquare(
        color.current,
        event.clientX - box.left,
        event.clientY - box.top,
        box.width,
        box.height,
      ),
    );
  }
  const EyeDropper =
    typeof window !== "undefined"
      ? (window as unknown as { EyeDropper?: new () => Eyedropper }).EyeDropper
      : undefined;
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
        onClick={() => {
          if (open) {
            void commit();
            setOpen(false);
          } else {
            confirmed.current = initial;
            reset(initial);
            setOpen(true);
          }
        }}
      >
        <span
          aria-hidden
          className="board-color-checker size-5 rounded-sm ring-1 ring-black/15 ring-inset"
        >
          <span
            className="block size-full rounded-sm"
            style={{ backgroundColor: value }}
          />
        </span>
      </button>
      <BoardPopover
        host={host}
        open={open && (!disabled || pending)}
        onClose={(restore) => {
          if (restore) cancel();
          else {
            if (dirty.current && isBoardHex(latest.current)) void commit();
            else clear();
            setOpen(false);
          }
        }}
        anchor={anchor}
        id={id}
        label={`${label} picker`}
        width={288}
        placement="color"
        maxHeight={600}
      >
        <div
          data-color-picker={id}
          className="space-y-3 p-2"
          onKeyDownCapture={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              cancel();
            }
          }}
        >
          <p className="text-xs font-medium">{label} · Custom</p>
          <div
            role="group"
            aria-label={`${label} palette`}
            className="grid grid-cols-6 gap-1 max-md:grid-cols-5"
          >
            {colors.map((hex, i) => (
              <button
                key={hex}
                data-autofocus={i === 0 ? "true" : undefined}
                type="button"
                aria-label={`${label}: ${hex}`}
                aria-pressed={hex.toLowerCase() === draft.toLowerCase()}
                disabled={pending}
                className="hover:bg-muted flex size-10 items-center justify-center rounded max-md:size-11"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  reset(hex);
                  void commit(hex, true);
                }}
              >
                <span
                  aria-hidden
                  className="relative flex size-5 items-center justify-center rounded-sm ring-1 ring-black/15 ring-inset"
                  style={{ backgroundColor: hex }}
                >
                  {hex.toLowerCase() === draft.toLowerCase() ? (
                    <Check className="size-3 text-white mix-blend-difference" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <div
            tabIndex={pending ? -1 : 0}
            role="group"
            aria-label={`Saturation and brightness: ${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
            aria-describedby={id + "-keys"}
            className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded border focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: `hsl(${hsv.h} 100% 50%)`,
              backgroundImage:
                "linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent)",
            }}
            onPointerDown={(event) => {
              if (pending) return;
              event.preventDefault();
              event.currentTarget.focus();
              gesture.current = event.pointerId;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              sample(event);
            }}
            onPointerMove={(event) => {
              if (gesture.current === event.pointerId && !pending)
                sample(event);
            }}
            onPointerUp={(event) => {
              if (gesture.current !== event.pointerId) return;
              gesture.current = null;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
              void commit();
            }}
            onPointerCancel={() => {
              gesture.current = null;
              reset(confirmed.current);
              clear();
            }}
            onKeyDown={(event) => {
              if (pending) return;
              const step = event.shiftKey ? 0.1 : 0.01;
              let next = color.current;
              if (event.key === "ArrowLeft")
                next = { ...next, s: Math.max(0, next.s - step) };
              else if (event.key === "ArrowRight")
                next = { ...next, s: Math.min(1, next.s + step) };
              else if (event.key === "ArrowUp")
                next = { ...next, v: Math.min(1, next.v + step) };
              else if (event.key === "ArrowDown")
                next = { ...next, v: Math.max(0, next.v - step) };
              else return;
              event.preventDefault();
              update(next);
            }}
            onKeyUp={(event) => {
              if (event.key.startsWith("Arrow")) void commit();
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#000]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>
          <p id={id + "-keys"} className="sr-only">
            Arrow left/right changes saturation. Arrow up/down changes
            brightness. Hold Shift for larger steps.
          </p>
          <label className="block space-y-1 text-xs">
            Hue
            <input
              type="range"
              aria-label="Hue"
              className="board-color-slider"
              min={0}
              max={360}
              step={1}
              value={hsv.h}
              disabled={pending}
              aria-valuetext={`${Math.round(hsv.h)} degrees`}
              style={{
                background:
                  "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
              }}
              onChange={(e) =>
                update({ ...color.current, h: Number(e.target.value) })
              }
              onPointerUp={() => void commit()}
              onKeyUp={(e) => {
                if (
                  e.key.startsWith("Arrow") ||
                  ["Home", "End", "PageUp", "PageDown"].includes(e.key)
                )
                  void commit();
              }}
              onBlur={() => {
                if (dirty.current) void commit();
              }}
            />
          </label>
          <label className="block space-y-1 text-xs">
            Opacity
            <input
              type="range"
              aria-label="Opacity"
              className="board-color-slider board-color-checker"
              min={0}
              max={100}
              step={1}
              value={Math.round(hsv.a * 100)}
              disabled={pending}
              aria-valuetext={`${Math.round(hsv.a * 100)} percent`}
              style={{
                backgroundImage: `linear-gradient(to right,transparent,${hsvToHex({ ...hsv, a: 1 })}),linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)`,
                backgroundSize: "100% 100%,8px 8px,8px 8px,8px 8px,8px 8px",
              }}
              onChange={(e) =>
                update({ ...color.current, a: Number(e.target.value) / 100 })
              }
              onPointerUp={() => void commit()}
              onKeyUp={(e) => {
                if (
                  e.key.startsWith("Arrow") ||
                  ["Home", "End", "PageUp", "PageDown"].includes(e.key)
                )
                  void commit();
              }}
              onBlur={() => {
                if (dirty.current) void commit();
              }}
            />
          </label>
          <label className="block space-y-1 text-xs">
            HEX
            <Input
              aria-label={`${label} HEX`}
              aria-invalid={!!error}
              aria-describedby={error ? id + "-error" : undefined}
              value={draft}
              disabled={pending}
              maxLength={9}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft(raw);
                latest.current = raw;
                setError(null);
                dirty.current = raw !== confirmed.current;
                if (isBoardHex(raw)) {
                  const next = hexToHSV(raw, color.current.h);
                  color.current = next;
                  setHSV(next);
                  preview(raw);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commit(latest.current, true);
                }
              }}
              onBlur={(e) => {
                if (
                  !(e.relatedTarget as Element | null)?.closest(
                    "[data-color-picker]",
                  )
                )
                  void commit();
              }}
            />
          </label>
          {error ? (
            <p
              id={id + "-error"}
              role="alert"
              className="text-destructive text-xs"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {allowNone ? (
              <button
                type="button"
                disabled={pending}
                className="hover:bg-muted min-h-10 rounded border px-3 text-xs"
                onClick={() => void commit("#00000000", true)}
              >
                None
              </button>
            ) : null}
            {EyeDropper ? (
              <button
                type="button"
                disabled={pending}
                className="hover:bg-muted flex min-h-10 items-center gap-2 rounded border px-3 text-xs"
                onClick={async () => {
                  eyedropper.current = new AbortController();
                  try {
                    const result = await new EyeDropper().open({
                      signal: eyedropper.current.signal,
                    });
                    if (isBoardHex(result.sRGBHex)) {
                      const hex = hsvToHex({
                        ...hexToHSV(result.sRGBHex),
                        a: color.current.a,
                      });
                      reset(hex);
                      await commit(hex, true);
                    }
                  } catch (caught) {
                    if (!(
                      caught instanceof DOMException &&
                      caught.name === "AbortError"
                    ))
                      setError(
                        "Eyedropper is unavailable. Use the color controls or HEX.",
                      );
                  }
                }}
              >
                <Pipette aria-hidden className="size-3.5" />
                Eyedropper
              </button>
            ) : null}
            <span className="text-muted-foreground text-[11px]">
              {pending ? "Saving color…" : "HEX supports alpha."}
            </span>
          </div>
        </div>
      </BoardPopover>
    </div>
  );
}
