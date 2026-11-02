"use client";
import { useState } from "react";
import { Maximize, Minus, MoreHorizontal, Plus } from "lucide-react";
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
}: {
  onOutline: () => void;
  onHelp: () => void;
  shortcuts: boolean;
  onShortcuts: (value: boolean) => void;
  minimap: boolean;
  onMinimap: () => void;
  connection: CollaborationConnectionState;
}) {
  return (
    <details className="relative">
      <summary
        aria-label="Board menu"
        className="hover:bg-muted flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded max-md:min-h-11 max-md:min-w-11"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </summary>
      <div className="bg-popover absolute top-full right-0 z-40 w-56 rounded border p-1 shadow-sm">
        <Button
          className="w-full justify-start"
          onClick={() => onOutline()}
          variant="ghost"
        >
          Object outline
        </Button>
        <Button
          className="w-full justify-start"
          onClick={() => onHelp()}
          variant="ghost"
        >
          Tools and keyboard help
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
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Collaboration: {connection.toLowerCase()}. Saving is reported
          separately.
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
  onOpenChange: (value: boolean) => void;
}) {
  return (
    <Dialog
      className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
      open={open}
      onOpenChange={onOpenChange}
      title="Board tools and keyboard"
      description="Core editing works without AI. New tools insert once and return to Select."
    >
      <div className="space-y-4 p-5 text-sm leading-6">
        <p>
          Focus the canvas first. V Select, H Pan, T Text, N Sticky, F Section.
          Choose a creation tool and press Enter to insert at the center. Shapes
          offers six named choices. Hold Space to pan temporarily.
        </p>
        <p>
          Shift-select or drag a selection rectangle. Enter opens the Inspector.
          Arrow keys move by 1 unit; Shift moves by 10. Ctrl/Cmd+D duplicates;
          Ctrl/Cmd+G groups; Ctrl/Cmd+Shift+G ungroups; Ctrl/Cmd+Z undoes;
          Shift+Z or Ctrl+Y redoes. Delete archives only when the canvas itself
          is focused.
        </p>
        <p>
          Escape returns to Select or closes a panel. Tab leaves the canvas
          normally. The Object outline and Inspector provide alternatives to
          dragging. Single-key shortcuts can be disabled in the Board menu.
        </p>
        <p>
          Section membership is explicit in the Inspector. A Section move
          carries its children; resizing changes only its bounds. Locked objects
          remain inspectable. Images stay private; a source URL is metadata
          only.
        </p>
        <p>
          Saving and collaboration connection are separate. There is no offline
          durability guarantee. Retry a failed save before leaving. Undo is
          local and may be invalidated when another person changes the same
          object.
        </p>
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
