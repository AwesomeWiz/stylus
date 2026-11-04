"use client";
import {
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useBoardEvent } from "./use-board-event";

/** Capture the portal boundary in the opening event, without cascading effects. */
export function useBoardPopup<T extends HTMLElement>() {
  const anchor = useRef<T | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpenState] = useState(false);
  const setOpen = useCallback((value: boolean) => {
    if (value)
      setHost(
        anchor.current?.closest<HTMLElement>("[role=dialog]") ?? document.body,
      );
    setOpenState(value);
  }, []);
  return { anchor, host, open, setOpen };
}

/** Board-local overlay: portals stay inside an enclosing modal's focus scope. */
export function BoardPopover({
  open,
  onClose,
  anchor,
  children,
  label,
  id,
  role = "dialog",
  width = 256,
  host,
  placement = "anchor",
  maxHeight = 360,
}: {
  open: boolean;
  onClose: (restoreFocus: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  children: ReactNode;
  label: string;
  id: string;
  role?: "dialog" | "listbox" | "menu";
  width?: number;
  host: HTMLElement | null;
  placement?: "anchor" | "color";
  maxHeight?: number;
}) {
  const popup = useRef<HTMLDivElement>(null);
  const close = useBoardEvent(onClose);
  useLayoutEffect(() => {
    const element = popup.current;
    if (!open || !element) return;
    function position() {
      const box = anchor.current?.getBoundingClientRect();
      if (!box || !element) return;
      const available = window.innerHeight - 16;
      element.style.width = `${Math.min(width, window.innerWidth - 16)}px`;
      element.style.maxHeight = `${Math.min(maxHeight, available)}px`;
      const height = element.getBoundingClientRect().height;
      const below = window.innerHeight - box.bottom - 8;
      let top =
        below >= height || below >= box.top - 8
          ? box.bottom + 4
          : Math.max(8, box.top - height - 4);
      let left = Math.max(
        8,
        Math.min(box.left, window.innerWidth - element.offsetWidth - 8),
      );
      if (placement === "color") {
        const panel = anchor.current
          ?.closest<HTMLElement>('[data-board-panel="right"],[role="dialog"]')
          ?.getBoundingClientRect();
        if (
          window.innerWidth >= 768 &&
          panel &&
          panel.left >= element.offsetWidth + 16
        ) {
          left = panel.left - element.offsetWidth - 8;
          top = Math.max(
            8,
            Math.min(box.top - 8, window.innerHeight - height - 8),
          );
        } else if (window.innerWidth < 768) {
          left = Math.max(8, (window.innerWidth - element.offsetWidth) / 2);
          top = Math.max(8, window.innerHeight - height - 8);
        }
      }
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.maxHeight = `${Math.max(80, Math.min(maxHeight, window.innerHeight - top - 8))}px`;
      element.style.visibility = "visible";
    }
    position();
    const focus =
      element.querySelector<HTMLElement>("[data-autofocus=true]") ??
      element.querySelector<HTMLElement>(
        "[role=option],[role=menuitem],[role=menuitemcheckbox]",
      ) ??
      element;
    focus.focus({ preventScroll: true });
    function outside(event: Event) {
      const target = event.target as Node;
      if (!element?.contains(target) && !anchor.current?.contains(target)) {
        // Finish a custom field's blur before unmounting its popup.
        const focused = document.activeElement as HTMLElement | null;
        if (
          event.type === "pointerdown" &&
          focused &&
          element?.contains(focused) &&
          ["INPUT", "TEXTAREA"].includes(focused.tagName)
        )
          focused.blur();
        close(false);
      }
    }
    function scroll(event: Event) {
      if (!element?.contains(event.target as Node)) position();
    }
    function another(event: Event) {
      if ((event as CustomEvent).detail !== id) close(false);
    }
    document.dispatchEvent(
      new CustomEvent("stylus-board-popup", { detail: id }),
    );
    document.addEventListener("stylus-board-popup", another);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("stylus-board-popup", another);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, host, anchor, width, close, id, placement, maxHeight]);
  if (!open || !host) return null;
  return createPortal(
    <div
      ref={popup}
      id={id}
      role={role}
      aria-label={label}
      tabIndex={-1}
      data-board-popup
      className="bg-popover text-popover-foreground fixed z-[80] overflow-y-auto rounded-md border p-1 shadow-md outline-none max-md:[&_button]:min-h-11"
      style={{ visibility: "hidden" }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Tab") {
          const tabbable = (root: ParentNode) =>
            [
              ...root.querySelectorAll<HTMLElement>(
                "button,input,textarea,select,a[href],summary,[tabindex]",
              ),
            ].filter(
              (node) =>
                node.tabIndex >= 0 &&
                !node.matches(":disabled") &&
                !node.closest("[hidden]"),
            );
          const controls = popup.current ? tabbable(popup.current) : [];
          const active = document.activeElement as HTMLElement | null;
          const boundary =
            role !== "dialog" ||
            active?.getAttribute("role") === "option" ||
            active === (event.shiftKey ? controls[0] : controls.at(-1));
          if (boundary && anchor.current) {
            event.preventDefault();
            if (active && ["INPUT", "TEXTAREA"].includes(active.tagName))
              active.blur();
            close(false);
            const trigger = anchor.current;
            const scope =
              trigger.closest<HTMLElement>(
                "[data-board-panel],[role=dialog],header",
              ) ?? trigger.parentElement;
            const outside = scope
              ? tabbable(scope).filter(
                  (node) => !node.closest("[data-board-popup]"),
                )
              : [];
            const own = outside.filter(
              (node) => trigger === node || trigger.contains(node),
            );
            const index = outside.indexOf(
              (event.shiftKey ? own[0] : own.at(-1))!,
            );
            const sibling = event.shiftKey
              ? scope?.previousElementSibling
              : scope?.nextElementSibling;
            const next =
              outside[index + (event.shiftKey ? -1 : 1)] ??
              (sibling?.matches("button,input,a[href],[tabindex='0']")
                ? (sibling as HTMLElement)
                : sibling?.querySelector<HTMLElement>(
                    "button:not(:disabled),[tabindex='0']",
                  )) ??
              document.getElementById("board-canvas") ??
              trigger;
            next.focus({ preventScroll: true });
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
        }
      }}
    >
      {children}
    </div>,
    host,
  );
}

export function moveBoardOptionFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const root =
    event.currentTarget.closest("[data-board-popup]") ?? event.currentTarget;
  const options = [
    ...root.querySelectorAll<HTMLButtonElement>("button"),
  ].filter(
    (button) =>
      !button.disabled &&
      ["option", "menuitem", "menuitemcheckbox"].includes(
        button.getAttribute("role") ?? "",
      ),
  );
  if (!options.length) return;
  event.preventDefault();
  const at = options.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : at < 0
          ? event.key === "ArrowDown"
            ? 0
            : options.length - 1
          : (at + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length;
  options[next]?.focus({ preventScroll: true });
  options[next]?.scrollIntoView?.({ block: "nearest" });
}
