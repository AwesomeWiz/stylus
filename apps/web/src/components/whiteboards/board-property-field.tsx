"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  BoardPopover,
  useBoardPopup,
  moveBoardOptionFocus,
} from "./board-popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export function BoardPropertyField({
  label,
  value,
  numeric = false,
  min = -1000000,
  max = 1000000,
  multiline = false,
  disabled = false,
  hideLabel = false,
  onCommit,
  presets,
  validate,
  onEscape,
}: {
  label: string;
  value: string | number;
  numeric?: boolean;
  min?: number;
  max?: number;
  multiline?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  onCommit: (value: string | number) => Promise<boolean>;
  presets?: readonly number[];
  validate?: (value: string | number) => string | null;
  onEscape?: () => void;
}) {
  const id = useId();
  const { anchor, host, open, setOpen } = useBoardPopup<HTMLDivElement>();
  const format = (v: string | number) =>
    typeof v === "number" ? String(Math.round(v * 100) / 100) : v;
  const [draft, setDraft] = useState(() => format(value)),
    [error, setError] = useState<string | null>(null);
  const editing = useRef(false),
    skip = useRef(false),
    saving = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(format(value));
  }, [value]);
  async function save() {
    editing.current = false;
    if (skip.current) {
      skip.current = false;
      return;
    }
    if (saving.current || draft === format(value)) return;
    let next: string | number = draft;
    if (numeric) {
      if (
        !draft.trim() ||
        !/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(draft.trim()) ||
        !Number.isFinite(Number(draft)) ||
        Number(draft) < min ||
        Number(draft) > max
      ) {
        setError(`Enter a value from ${min} to ${max}.`);
        return;
      }
      next = Number(draft);
    }
    const validation = validate?.(next);
    if (validation) {
      setError(validation);
      return;
    }
    saving.current = true;
    try {
      const ok = await onCommit(next);
      if (ok) setError(null);
      else {
        setDraft(format(value));
        setError("Could not save this value. The saved value is restored.");
      }
    } catch {
      setDraft(format(value));
      setError("Could not save this value. The saved value is restored.");
    } finally {
      saving.current = false;
    }
  }
  const props = {
    "aria-label": label,
    "aria-invalid": !!error,
    "aria-describedby": error ? id + "-error" : undefined,
    value: draft,
    disabled,
    inputMode: numeric ? ("decimal" as const) : undefined,
    onFocus: () => {
      editing.current = true;
    },
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setDraft(e.target.value);
      setError(null);
    },
    onBlur: (
      event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (
        presets &&
        document.getElementById(id)?.contains(event.relatedTarget as Node)
      )
        return;
      void save();
    },
    onKeyDown: (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        skip.current = true;
        setDraft(format(value));
        setError(null);
        setOpen(false);
        e.currentTarget.blur();
        onEscape?.();
      } else if (presets && e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
  return (
    <label className="text-muted-foreground block min-w-0 text-xs">
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      {multiline ? (
        <Textarea {...props} className="text-foreground mt-1 min-h-20" />
      ) : (
        <div ref={anchor} className={`relative ${hideLabel ? "" : "mt-1"}`}>
          <Input
            {...props}
            type="text"
            role={presets ? "combobox" : undefined}
            aria-expanded={presets ? open : undefined}
            aria-controls={presets ? id : undefined}
            aria-haspopup={presets ? "listbox" : undefined}
            className={`text-foreground h-10 px-2 max-md:h-11 ${presets ? "pr-9" : ""}`}
          />
          {presets ? (
            <button
              type="button"
              aria-label={`${label} presets`}
              aria-haspopup="listbox"
              aria-expanded={open}
              disabled={disabled}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(!open)}
            >
              <ChevronDown aria-hidden className="size-3.5" />
            </button>
          ) : null}
          {presets ? (
            <BoardPopover
              host={host}
              open={open && !disabled}
              anchor={anchor}
              id={id}
              label={`${label} presets`}
              role="listbox"
              width={160}
              onClose={(restore) => {
                setOpen(false);
                if (restore) {
                  setDraft(format(value));
                  setError(null);
                  anchor.current
                    ?.querySelector<HTMLInputElement>("input")
                    ?.focus();
                } else void save();
              }}
            >
              <div onKeyDown={moveBoardOptionFocus}>
                {presets.map((preset) => (
                  <button
                    key={preset}
                    role="option"
                    aria-selected={Number(value) === preset}
                    tabIndex={-1}
                    data-autofocus={
                      Number(value) === preset ||
                      (!presets.includes(Number(value)) &&
                        preset === presets[0])
                        ? "true"
                        : undefined
                    }
                    type="button"
                    className="hover:bg-muted focus:bg-muted flex min-h-10 w-full items-center justify-between rounded px-2 text-left text-xs"
                    onClick={async () => {
                      if (saving.current) return;
                      setOpen(false);
                      editing.current = false;
                      saving.current = true;
                      try {
                        const ok = await onCommit(preset);
                        setDraft(format(ok ? preset : value));
                        setError(
                          ok
                            ? null
                            : "Could not save this value. The saved value is restored.",
                        );
                      } catch {
                        setDraft(format(value));
                        setError(
                          "Could not save this value. The saved value is restored.",
                        );
                      } finally {
                        saving.current = false;
                        anchor.current
                          ?.querySelector<HTMLInputElement>("input")
                          ?.focus({ preventScroll: true });
                      }
                    }}
                  >
                    {preset}
                    {Number(value) === preset ? (
                      <Check aria-hidden className="size-3.5" />
                    ) : null}
                  </button>
                ))}
              </div>
            </BoardPopover>
          ) : null}
        </div>
      )}
      {error ? (
        <span
          id={id + "-error"}
          role="alert"
          className="text-destructive mt-1 block"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
