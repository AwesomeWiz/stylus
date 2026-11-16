"use client";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Check } from "lucide-react";
import { focusBoardCanvas } from "./board-navigation";
export type BoardCommand = {
  label: string;
  run?: () => void;
  children?: BoardCommand[];
  danger?: boolean;
  checked?: boolean;
};
type Position = { x: number; y: number };

function MenuLevel({
  commands,
  position,
  anchor,
  keyboard,
  label,
  close,
  back,
  host,
}: {
  commands: BoardCommand[];
  position: Position;
  anchor?: HTMLElement;
  keyboard: boolean;
  label: string;
  close: (restore?: boolean) => void;
  back?: () => void;
  host: HTMLElement;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [active, setActive] = useState<number | null>(null),
    [child, setChild] = useState<{
      index: number;
      anchor: HTMLElement;
      keyboard: boolean;
    } | null>(null);
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    function place() {
      if (!menu) return;
      const inset = 8,
        topInset = Math.min(56, window.innerHeight / 4);
      menu.style.width = `${Math.min(256, window.innerWidth - inset * 2)}px`;
      menu.style.maxHeight = `${Math.max(40, window.innerHeight - topInset - inset)}px`;
      menu.style.left = "0px";
      menu.style.top = "0px";
      const origin = menu.getBoundingClientRect();
      const box = menu.getBoundingClientRect(),
        parent = anchor?.getBoundingClientRect();
      const right = parent ? parent.right + 4 : position.x;
      const left =
        parent && right + box.width > window.innerWidth - inset
          ? parent.left - box.width - 4
          : right;
      menu.style.left = `${Math.max(inset, Math.min(left, window.innerWidth - box.width - inset)) - origin.left}px`;
      menu.style.top = `${Math.max(topInset, Math.min(parent?.top ?? position.y, window.innerHeight - box.height - inset)) - origin.top}px`;
      menu.style.visibility = "visible";
      menu.dataset.side = parent && left < parent.left ? "left" : "right";
    }
    place();
    if (keyboard)
      menu
        .querySelector<HTMLElement>("[role=menuitem]")
        ?.focus({ preventScroll: true });
    else if (!anchor) menu.focus({ preventScroll: true });
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(menu);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, keyboard, position.x, position.y]);
  useEffect(() => {
    function escape(event: globalThis.KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        !ref.current?.contains(event.target as Node)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (back) back();
      else close(true);
    }
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [back, close]);
  function enter(index: number, target: HTMLElement, fromKeyboard: boolean) {
    setActive(index);
    setChild(
      commands[index]?.children
        ? { index, anchor: target, keyboard: fromKeyboard }
        : null,
    );
  }
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      data-board-context-menu
      className="bg-popover text-popover-foreground fixed z-[90] overflow-y-auto rounded-md border p-1 shadow-md outline-none"
      style={{ visibility: "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        e.stopPropagation();
        const buttons = [
            ...ref.current!.querySelectorAll<HTMLButtonElement>(
              ":scope > button",
            ),
          ],
          index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          setChild(null);
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : index < 0
                  ? e.key === "ArrowUp"
                    ? buttons.length - 1
                    : 0
                  : (index +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                    buttons.length;
          setActive(next);
          buttons[next]?.focus();
          buttons[next]?.scrollIntoView?.({ block: "nearest" });
        } else if (e.key === "ArrowRight" && commands[index]?.children) {
          e.preventDefault();
          enter(index, buttons[index]!, true);
        } else if ((e.key === "ArrowLeft" || e.key === "Escape") && back) {
          e.preventDefault();
          back();
        } else if (e.key === "Escape" || e.key === "Tab") {
          if (e.key === "Escape") e.preventDefault();
          close(true);
        }
      }}
    >
      {commands.map((command, index) => (
        <button
          key={command.label}
          role="menuitem"
          type="button"
          tabIndex={-1}
          aria-haspopup={command.children ? "menu" : undefined}
          aria-expanded={command.children ? child?.index === index : undefined}
          data-active={active === index ? "true" : undefined}
          className={`data-[active=true]:bg-muted flex min-h-10 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm break-words outline-offset-[-2px] max-md:min-h-11 ${command.danger ? "text-destructive" : ""}`}
          onFocus={() => setActive(index)}
          onPointerMove={(e) => {
            if (e.pointerType !== "touch") enter(index, e.currentTarget, false);
          }}
          onClick={(e) => {
            if (command.children) enter(index, e.currentTarget, e.detail === 0);
            else {
              close(false);
              command.run?.();
              focusBoardCanvas();
            }
          }}
        >
          <span>{command.label}</span>
          {command.children ? (
            <ChevronRight aria-hidden className="size-4 shrink-0" />
          ) : command.checked ? (
            <Check aria-hidden className="size-3 shrink-0" />
          ) : null}
        </button>
      ))}
      {child && commands[child.index]?.children ? (
        <MenuLevel
          key={child.index}
          commands={commands[child.index]!.children!}
          position={position}
          anchor={child.anchor}
          keyboard={child.keyboard}
          label={commands[child.index]!.label}
          close={close}
          host={host}
          back={() => {
            const parent = child.anchor;
            setChild(null);
            parent.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </div>,
    host,
  );
}
export function BoardContextMenu({
  position,
  commands,
  onClose,
  keyboard = false,
}: {
  position: Position;
  commands: BoardCommand[] | (() => BoardCommand[]);
  onClose: () => void;
  keyboard?: boolean;
}) {
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [host] = useState(
    () =>
      document.activeElement?.closest<HTMLElement>("[role=dialog]") ??
      document.body,
  );
  function close(restore = false) {
    onClose();
    if (restore) {
      if (opener?.isConnected && opener !== document.body)
        opener.focus({ preventScroll: true });
      else focusBoardCanvas();
    }
  }
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!(e.target as Element).closest("[data-board-context-menu]"))
        onClose();
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [onClose]);
  return (
    <MenuLevel
      commands={typeof commands === "function" ? commands() : commands}
      position={position}
      keyboard={keyboard}
      label="Board actions"
      close={close}
      host={host}
    />
  );
}
