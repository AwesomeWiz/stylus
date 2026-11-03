"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { focusBoardCanvas } from "./board-navigation";
export type BoardCommand = {
  label: string;
  run?: () => void;
  children?: BoardCommand[];
  danger?: boolean;
  checked?: boolean;
};
export function BoardContextMenu({
  position,
  commands,
  onClose,
}: {
  position: { x: number; y: number };
  commands: BoardCommand[] | (() => BoardCommand[]);
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [path, setPath] = useState<BoardCommand[]>([]);
  const list =
    path.at(-1)?.children ??
    (typeof commands === "function" ? commands() : commands);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [path]);
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={path.at(-1)?.label ?? "Board actions"}
      className="bg-popover fixed z-[80] max-h-[min(80dvh,36rem)] w-64 overflow-y-auto rounded-md border p-1 shadow-md"
      style={{
        left: Math.max(8, Math.min(position.x, window.innerWidth - 264)),
        top: Math.max(8, Math.min(position.y, window.innerHeight - 420)),
      }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        const buttons = [
            ...ref.current!.querySelectorAll<HTMLElement>("[role=menuitem]"),
          ],
          i = buttons.indexOf(document.activeElement as HTMLElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          buttons[
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) %
                  buttons.length
          ]?.focus();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          focusBoardCanvas();
        } else if (e.key === "ArrowLeft" && path.length) {
          e.preventDefault();
          setPath((p) => p.slice(0, -1));
        } else if (
          e.key === "ArrowRight" &&
          list[i - (path.length ? 1 : 0)]?.children
        ) {
          e.preventDefault();
          setPath((p) => [...p, list[i - (path.length ? 1 : 0)]!]);
        }
      }}
    >
      {path.length ? (
        <button
          role="menuitem"
          type="button"
          className="flex min-h-10 w-full items-center gap-2 border-b px-3 text-sm"
          onClick={() => setPath((p) => p.slice(0, -1))}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back
        </button>
      ) : null}
      {list.map((command) => (
        <button
          key={command.label}
          role="menuitem"
          aria-haspopup={command.children ? "menu" : undefined}
          type="button"
          className={`hover:bg-muted focus:bg-muted flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm ${command.danger ? "text-destructive" : ""}`}
          onClick={() => {
            if (command.children) setPath((p) => [...p, command]);
            else {
              onClose();
              command.run?.();
              focusBoardCanvas();
            }
          }}
        >
          {command.label}
          {command.children ? (
            <ChevronRight aria-hidden className="size-4" />
          ) : command.checked !== undefined ? (
            <span aria-hidden>
              {command.checked ? <Check className="size-3" /> : null}
            </span>
          ) : null}
        </button>
      ))}
    </div>,
    document.body,
  );
}
