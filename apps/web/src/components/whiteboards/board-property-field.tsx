"use client";
import { useEffect, useRef, useState } from "react";
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
}) {
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
    saving.current = true;
    const ok = await onCommit(next);
    saving.current = false;
    if (ok) setError(null);
    else {
      setDraft(format(value));
      setError("Could not save this value. The saved value is restored.");
    }
  }
  const props = {
    "aria-label": label,
    "aria-invalid": !!error,
    "aria-describedby": error
      ? `${label.replace(/\W/g, "-")}-error`
      : undefined,
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
    onBlur: () => void save(),
    onKeyDown: (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        skip.current = true;
        setDraft(format(value));
        setError(null);
        e.currentTarget.blur();
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
        <Input
          {...props}
          type="text"
          className={`text-foreground h-9 px-2 ${hideLabel ? "" : "mt-1"}`}
        />
      )}
      {error ? (
        <span
          id={`${label.replace(/\W/g, "-")}-error`}
          role="alert"
          className="text-destructive mt-1 block"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
