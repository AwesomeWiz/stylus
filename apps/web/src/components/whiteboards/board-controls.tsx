"use client";
import { useState } from "react";
import { Maximize, Minus, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { safeBoardUrl } from "@/modules/whiteboards/schemas";
import type { CollaborationConnectionState } from "@/modules/whiteboards/realtime";
export function BoardMenu({
  onOutline,
  onHelp,
  shortcuts,
  onShortcuts,
  minimap,
  onMinimap,
  connection,
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
  return (
    <details className="relative">
      <summary
        aria-label="View menu"
        className="hover:bg-muted flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center gap-1 rounded px-2 max-md:min-h-11 max-md:min-w-11"
      >
        <span className="text-xs">View</span>
        <ChevronDown aria-hidden="true" className="size-3" />
      </summary>
      <div className="bg-popover absolute top-full right-0 z-40 w-56 rounded border p-1 shadow-sm">
        <p className="px-3 py-2 text-xs font-semibold">View</p>
        {onToggleSidebars ? (
          <Button
            className="w-full justify-start"
            variant="ghost"
            onClick={onToggleSidebars}
          >
            {sidebarsVisible ? "Hide sidebars" : "Show sidebars"}
          </Button>
        ) : null}
        {onSnapObjects ? (
          <label className="flex min-h-11 items-center gap-2 px-3 text-sm">
            <input
              type="checkbox"
              checked={snapObjects}
              onChange={onSnapObjects}
            />
            Snap to objects
          </label>
        ) : null}
        {onSnapGrid ? (
          <label className="flex min-h-11 items-center gap-2 px-3 text-sm">
            <input type="checkbox" checked={snapGrid} onChange={onSnapGrid} />
            Snap to grid
          </label>
        ) : null}
        <Button
          className="w-full justify-start"
          onClick={() => onOutline()}
          variant="ghost"
        >
          Layers
        </Button>
        <Button
          className="w-full justify-start"
          onClick={() => onHelp()}
          variant="ghost"
        >
          Keyboard shortcuts
        </Button>
        <label className="flex min-h-11 items-center gap-2 px-3 text-sm">
          <input
            checked={shortcuts}
            onChange={(event) => onShortcuts(event.target.checked)}
            type="checkbox"
          />
          Single-key shortcuts
        </label>
        <Button
          className="w-full justify-start"
          onClick={() => onMinimap()}
          variant="ghost"
        >
          {minimap ? "Hide" : "Show"} minimap
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onGrid}
        >
          {grid ? "Hide" : "Show"} dot grid
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onFit}
        >
          Fit board
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onFitSelection}
        >
          Fit selection
        </Button>
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Collaboration: {connection.toLowerCase()}. Saving is reported
          separately. Undo and clipboard stay local to this board. Failed saves
          restore saved state; offline work is not durable.
        </p>
      </div>
    </details>
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
            url = safeBoardUrl.safeParse(data.get("url"));
          if (!url.success) {
            setError("Enter an http or https URL without credentials.");
            return;
          }
          setError(null);
          void onCreate({
            title: String(data.get("title")),
            url: url.data,
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
            type="url"
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
