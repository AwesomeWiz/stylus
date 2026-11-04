"use client";
import { useId, useState, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  BoardPopover,
  useBoardPopup,
  moveBoardOptionFocus,
} from "./board-popover";
export type BoardOption = {
  value: string;
  label: string;
  group?: string;
  preview?: string;
};
export const boardControlClass =
  "bg-background text-foreground flex h-10 max-md:h-11 w-full min-w-0 items-center justify-between gap-2 rounded border px-2 text-left text-xs hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50";
export function BoardSelect({
  label,
  value,
  options,
  disabled = false,
  onChange,
  searchable = false,
  hideLabel = false,
}: {
  label: string;
  value: string;
  options: readonly BoardOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  searchable?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  const { anchor, host, open, setOpen } = useBoardPopup<HTMLButtonElement>();
  const [query, setQuery] = useState("");
  const [available, setAvailable] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !searchable || !document.fonts) return;
    function update() {
      setAvailable(
        options
          .filter((o) => {
            try {
              return o.preview && document.fonts.check(`400 12px ${o.preview}`);
            } catch {
              return false;
            }
          })
          .map((o) => o.value),
      );
    }
    update();
    document.fonts.addEventListener?.("loadingdone", update);
    return () => document.fonts.removeEventListener?.("loadingdone", update);
  }, [open, searchable, options]);
  const filtered = options.filter((o) =>
    o.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const groups = [...new Set(filtered.map((o) => o.group ?? ""))];
  function close(restore: boolean) {
    setOpen(false);
    setQuery("");
    if (restore) anchor.current?.focus({ preventScroll: true });
  }
  return (
    <div className="min-w-0 space-y-1 text-xs">
      <span
        className={hideLabel ? "sr-only" : "text-muted-foreground block"}
        id={id + "-label"}
      >
        {label}
      </span>
      <button
        ref={anchor}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id + (searchable ? "-list" : "-popup")}
        disabled={disabled}
        className={boardControlClass}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="truncate">
          {options.find((o) => o.value === value)?.label ?? value}
        </span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0" />
      </button>
      <BoardPopover
        host={host}
        open={open && !disabled}
        onClose={close}
        anchor={anchor}
        label={label}
        id={id + "-popup"}
        role={searchable ? "dialog" : "listbox"}
        width={searchable ? 288 : 240}
      >
        {searchable ? (
          <div className="bg-popover sticky top-0 z-10 flex items-center gap-2 border-b p-2">
            <Search aria-hidden className="size-3.5" />
            <input
              data-autofocus="true"
              aria-label="Search fonts"
              placeholder="Search fonts…"
              maxLength={80}
              value={query}
              className="bg-background h-9 min-w-0 flex-1 rounded border px-2 text-xs"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={moveBoardOptionFocus}
            />
          </div>
        ) : null}
        <div
          id={id + "-list"}
          role={searchable ? "listbox" : "presentation"}
          aria-label={searchable ? label : undefined}
          onKeyDown={moveBoardOptionFocus}
        >
          {groups.map((group) => (
            <div
              key={group}
              role={group ? "group" : "presentation"}
              aria-label={group || undefined}
            >
              {group ? (
                <p
                  aria-hidden
                  className="text-muted-foreground px-2 pt-3 pb-1 text-[11px] font-medium tracking-wide uppercase"
                >
                  {group}
                </p>
              ) : null}
              {filtered
                .filter((o) => (o.group ?? "") === group)
                .map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={value === o.value}
                    data-autofocus={
                      !searchable && value === o.value ? "true" : undefined
                    }
                    tabIndex={-1}
                    className="hover:bg-muted focus:bg-muted flex min-h-10 w-full items-center justify-between gap-2 rounded px-2 text-left text-xs outline-offset-[-2px]"
                    style={
                      available.includes(o.value)
                        ? { fontFamily: o.preview }
                        : undefined
                    }
                    onClick={() => {
                      close(true);
                      onChange(o.value);
                    }}
                  >
                    <span>{o.label}</span>
                    {value === o.value ? (
                      <Check aria-hidden className="size-3.5" />
                    ) : null}
                  </button>
                ))}
            </div>
          ))}
          {!filtered.length ? (
            <p role="status" className="text-muted-foreground p-3 text-xs">
              No matching fonts.
            </p>
          ) : null}
        </div>
      </BoardPopover>
    </div>
  );
}
