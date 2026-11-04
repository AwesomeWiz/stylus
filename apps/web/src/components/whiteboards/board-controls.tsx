"use client";
import { useId, useState } from "react";
import { Maximize, Minus, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  normalizeBoardLinkInput,
  boardLinkInputError,
} from "@/modules/whiteboards/link-input";
import {
  BoardPopover,
  useBoardPopup,
  moveBoardOptionFocus,
} from "./board-popover";
import type { CollaborationConnectionState } from "@/modules/whiteboards/realtime";
export function BoardMenu({
  onOutline,
  onHelp,
  shortcuts,
  onShortcuts,
  minimap,
  onMinimap,
  grid = true,
  onGrid = () => {},
  onFit = () => {},
  onFitSelection = () => {},
  onToggleSidebars,
  sidebarsVisible,
  snapObjects,
  onSnapObjects,
  snapGrid,
  onSnapGrid,
}: {
  onOutline: () => void;
  onHelp: () => void;
  shortcuts: boolean;
  onShortcuts: (value: boolean) => void;
  minimap: boolean;
  onMinimap: () => void;
  connection: CollaborationConnectionState;
  grid?: boolean;
  onGrid?: () => void;
  onFit?: () => void;
  onFitSelection?: () => void;
  onToggleSidebars?: () => void;
  sidebarsVisible?: boolean;
  snapObjects?: boolean;
  onSnapObjects?: () => void;
  snapGrid?: boolean;
  onSnapGrid?: () => void;
}) {
  const id = useId();
  const { anchor, host, open, setOpen } = useBoardPopup<HTMLButtonElement>();
  function close(restore: boolean) {
    setOpen(false);
    if (restore) anchor.current?.focus({ preventScroll: true });
  }
  function item(label: string, action: () => void, checked?: boolean) {
    return (
      <button
        type="button"
        role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
        aria-checked={checked}
        className="hover:bg-muted focus:bg-muted flex min-h-10 w-full items-center gap-2 rounded px-2 text-left text-xs"
        onClick={() => {
          close(true);
          action();
        }}
      >
        <span className="flex size-4 items-center justify-center">
          {checked ? <Check aria-hidden className="size-3.5" /> : null}
        </span>
        {label}
      </button>
    );
  }
  const heading = (title: string) => (
    <p className="text-muted-foreground px-2 pt-3 pb-1 text-[11px] font-medium">
      {title}
    </p>
  );
  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label="View menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        className="hover:bg-muted flex min-h-10 min-w-10 items-center justify-center gap-1 rounded px-2 max-md:min-h-11"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="text-xs">View</span>
        <ChevronDown aria-hidden className="size-3" />
      </button>
      <BoardPopover
        host={host}
        open={open}
        anchor={anchor}
        onClose={close}
        label="View"
        id={id}
        role="menu"
        width={232}
      >
        <div onKeyDown={moveBoardOptionFocus}>
          {heading("Sidebars")}
          {onToggleSidebars
            ? item(
                sidebarsVisible ? "Hide sidebars" : "Show sidebars",
                onToggleSidebars,
              )
            : null}
          {item("Layers", onOutline)}
          {heading("Canvas")}
          {item("Dot grid", onGrid, grid)}
          {onSnapObjects
            ? item("Snap to objects", onSnapObjects, !!snapObjects)
            : null}
          {onSnapGrid ? item("Snap to grid", onSnapGrid, !!snapGrid) : null}
          {item("Minimap", onMinimap, minimap)}
          {heading("Navigation")}
          {item("Fit board", onFit)}
          {item("Fit selection", onFitSelection)}
          {heading("Input")}
          {item(
            "Single-key shortcuts",
            () => onShortcuts(!shortcuts),
            shortcuts,
          )}
          {heading("Help")}
          {item("Keyboard shortcuts", onHelp)}
        </div>
      </BoardPopover>
    </>
  );
}
export function BoardCanvasNavigation({
  zoom,
  hasSelection,
  onZoomOut,
  onZoomIn,
  onFit,
  onFitSelection,
}: {
  zoom: number;
  hasSelection: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onFitSelection: () => void;
}) {
  return (
    <div
      aria-label="Canvas navigation"
      className="bg-background absolute right-[max(.5rem,env(safe-area-inset-right))] bottom-[max(.5rem,env(safe-area-inset-bottom))] z-20 flex items-center rounded-md border p-1 shadow-sm"
      role="group"
    >
      <Button
        aria-label="Zoom out"
        onClick={onZoomOut}
        size="icon"
        variant="ghost"
      >
        <Minus aria-hidden="true" className="size-4" />
      </Button>
      <span
        aria-label="Zoom level"
        className="min-w-12 text-center text-xs tabular-nums"
      >
        {Math.round(zoom * 100)}%
      </span>
      <Button
        aria-label="Zoom in"
        onClick={onZoomIn}
        size="icon"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Fit board"
        onClick={onFit}
        size="icon"
        title="Fit board"
        variant="ghost"
      >
        <Maximize aria-hidden="true" className="size-4" />
      </Button>
      <Button
        className="px-2 text-xs"
        disabled={!hasSelection}
        onClick={onFitSelection}
        variant="ghost"
      >
        Fit selection
      </Button>
    </div>
  );
}
export function BoardHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const groups = [
    [
      "Tools",
      [
        ["V", "Select"],
        ["H / Space", "Pan"],
        ["T", "Text"],
        ["N", "Sticky"],
        ["F", "Section"],
      ],
    ],
    [
      "Selection",
      [
        ["Shift + click", "Add / remove"],
        ["Drag", "Marquee"],
        ["⌘ / Ctrl + A", "Select all"],
        ["Esc", "Clear selection"],
        ["Shift + F10", "Context menu"],
        ["F2 (Layers)", "Rename layer"],
      ],
    ],
    [
      "Edit",
      [
        ["⌘ / Ctrl + C / X", "Copy / Cut"],
        ["⌘ / Ctrl + V", "Paste"],
        ["⌘ / Ctrl + D", "Duplicate"],
        ["Alt / Option + drag", "Drag a copy"],
        ["⌘ / Ctrl + G", "Group"],
        ["⌘ / Ctrl + Shift + G", "Ungroup"],
        ["Delete", "Delete"],
      ],
    ],
    [
      "Arrange & history",
      [
        ["⌘ / Ctrl + [ / ]", "Backward / Forward"],
        ["⌘ / Ctrl + Shift + [ / ]", "Back / Front"],
        ["⌘ / Ctrl + Z", "Undo"],
        ["⌘ / Ctrl + Shift + Z", "Redo"],
        ["⌘ / Ctrl while dragging", "Bypass snapping"],
        ["⌘ / Ctrl + Shift + \\", "Toggle sidebars"],
      ],
    ],
  ] as const;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Focus the canvas to use shortcuts. Sticky: Enter saves, Shift+Enter adds a line. Text: Ctrl/⌘+Enter saves. Escape cancels text editing."
    >
      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <p className="text-muted-foreground text-sm sm:col-span-2">
          Wheel or two-finger scroll pans the canvas; Ctrl/Cmd + wheel or pinch
          zooms. Double-click a Group child to select it, then double-click
          again to edit text. Enter on a selected Group enters its first child;
          Escape returns to the Group. History and the internal clipboard stay
          local to this board; failed saves restore confirmed state, and offline
          work is not durable.
        </p>
        {groups.map(([title, shortcuts]) => (
          <section key={title}>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              {title}
            </h3>
            <dl className="space-y-2">
              {shortcuts.map(([keys, label]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <dt>{label}</dt>
                  <dd>
                    <kbd className="bg-muted rounded border px-2 py-1 font-sans">
                      {keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
export function BoardLinkDialog({
  open,
  onClose,
  busy,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onCreate: (content: Record<string, string>) => Promise<boolean>;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          setError(null);
        }
      }}
      title="Add link"
      description="Enter a title and an http or https URL. No preview or source is fetched."
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget),
            rawUrl = String(data.get("url") ?? ""),
            invalid = boardLinkInputError(rawUrl);
          if (invalid) {
            setError(invalid);
            return;
          }
          setError(null);
          void onCreate({
            title: String(data.get("title")),
            url: normalizeBoardLinkInput(rawUrl),
            note: String(data.get("note")),
          }).then((saved) => {
            if (!saved)
              setError(
                "The link could not be saved. Check access and retry the board save.",
              );
          });
        }}
      >
        <label className="block text-sm">
          Title
          <Input className="mt-1" maxLength={200} name="title" required />
        </label>
        <label className="block text-sm">
          URL
          <Input
            className="mt-1"
            maxLength={2048}
            name="url"
            required
            type="text"
            inputMode="url"
            placeholder="stybay.com"
          />
        </label>
        <label className="block text-sm">
          Note
          <Input className="mt-1" maxLength={5000} name="note" />
        </label>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy} type="submit">
          Add link
        </Button>
      </form>
    </Dialog>
  );
}
