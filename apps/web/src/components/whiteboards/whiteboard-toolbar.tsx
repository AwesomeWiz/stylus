"use client";
import {
  ArrowRight,
  ChevronDown,
  Frame,
  Hand,
  ImagePlus,
  Link2,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Redo2,
  Shapes,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { BoardElementType } from "@/lib/supabase/database.types";
import { useBoardWideTools } from "./board-panel";
export type WhiteboardTool =
  "SELECT" | "PAN" | Exclude<BoardElementType, "GROUP">;
export const shapeChoices = [
  ["rectangle", "Rectangle"],
  ["rounded_rectangle", "Rounded Rectangle"],
  ["circle", "Circle"],
  ["diamond", "Diamond"],
  ["line", "Line"],
  ["arrow", "Arrow"],
] as const;
const tools = [
  { value: "SELECT", label: "Select", icon: MousePointer2, key: "V" },
  { value: "PAN", label: "Pan", icon: Hand, key: "H" },
  { value: "TEXT", label: "Text", icon: Type, key: "T" },
  { value: "STICKY", label: "Sticky", icon: StickyNote, key: "N" },
  { value: "IMAGE", label: "Image", icon: ImagePlus, key: "" },
  { value: "LINK", label: "Link", icon: Link2, key: "" },
  { value: "ARROW", label: "Arrow", icon: ArrowRight, key: "" },
  { value: "SECTION", label: "Section", icon: Frame, key: "F" },
] as const;
export function WhiteboardToolbar({
  activeTool,
  canMutate,
  canRedo,
  canUndo,
  busy,
  onImageRequest,
  onRedo,
  onToolChange,
  onUndo,
  onShapeChange = () => undefined,
  shape = "rectangle",
}: {
  activeTool: WhiteboardTool;
  canMutate: boolean;
  canRedo: boolean;
  canUndo: boolean;
  busy: boolean;
  onImageRequest: () => void;
  onRedo: () => void;
  onToolChange: (tool: WhiteboardTool) => void;
  onUndo: () => void;
  onShapeChange?: (shape: string) => void;
  shape?: string;
}) {
  const wide = useBoardWideTools(),
    ref = useRef<HTMLDivElement>(null);
  const [insertOpen, setInsertOpen] = useState(false),
    [tab, setTab] = useState(0);
  function choose(tool: WhiteboardTool) {
    setInsertOpen(false);
    if (tool === "IMAGE") onImageRequest();
    else {
      onToolChange(tool);
      requestAnimationFrame(() =>
        document.getElementById("board-canvas")?.focus({ preventScroll: true }),
      );
    }
  }
  function pickShape(value: string) {
    onShapeChange(value);
    choose(value === "line" || value === "arrow" ? "ARROW" : "SHAPE");
  }
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      const details = (event.target as Element).closest("details[open]");
      if (details) {
        event.preventDefault();
        event.stopPropagation();
        details.removeAttribute("open");
        details.querySelector("summary")?.focus();
      }
      return;
    }
    if (!(event.target as HTMLElement).hasAttribute("data-board-tool")) return;
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        "[data-board-tool]:not([disabled])",
      ) ?? [],
    );
    const index = buttons.indexOf(event.target as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : ["ArrowDown", "ArrowRight"].includes(event.key)
            ? (index + 1) % buttons.length
            : ["ArrowUp", "ArrowLeft"].includes(event.key)
              ? (index + buttons.length - 1) % buttons.length
              : -1;
    if (next >= 0) {
      event.preventDefault();
      setTab(Number(buttons[next]?.dataset.boardTool));
      buttons[next]?.focus();
    }
  }
  function toolButton(
    tool: (typeof tools)[number],
    index: number,
    inDialog = false,
  ) {
    const disabled =
        (!canMutate || busy) && !["SELECT", "PAN"].includes(tool.value),
      Icon = tool.icon;
    return (
      <span className="group/tool relative" key={tool.value}>
        <button
          aria-label={tool.label}
          aria-pressed={activeTool === tool.value}
          aria-describedby={inDialog ? undefined : `board-tool-${tool.value}`}
          className={`hover:bg-muted inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md p-2 max-md:min-h-11 max-md:min-w-11 ${activeTool === tool.value ? "bg-primary/10 text-primary" : "text-muted-foreground"} ${inDialog ? "w-full justify-start" : ""}`}
          data-board-tool={inDialog ? undefined : index}
          disabled={disabled}
          onClick={() => {
            if (tool.value === "ARROW") onShapeChange("arrow");
            choose(tool.value);
          }}
          tabIndex={inDialog ? 0 : tab === index ? 0 : -1}
          type="button"
        >
          <Icon aria-hidden="true" className="size-4" />
          {inDialog ? tool.label : null}
        </button>
        {!inDialog ? (
          <span
            role="tooltip"
            id={`board-tool-${tool.value}`}
            className="bg-foreground text-background pointer-events-none invisible absolute top-1/2 left-full z-30 ml-3 -translate-y-1/2 rounded px-2 py-1 text-xs whitespace-nowrap group-focus-within/tool:visible group-hover/tool:visible"
          >
            {tool.label}
            {tool.key ? ` (${tool.key})` : ""}
          </span>
        ) : null}
      </span>
    );
  }
  function shapesMenu(index: number) {
    return (
      <details className="group/tool relative" key="shapes">
        <summary
          aria-describedby="board-shapes-tip"
          aria-label="Shapes"
          className={`hover:bg-muted flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-md max-md:min-h-11 max-md:min-w-11 ${activeTool === "SHAPE" ? "bg-primary/10 text-primary" : ""}`}
          data-board-tool={index}
          tabIndex={tab === index ? 0 : -1}
        >
          <Shapes aria-hidden="true" className="size-4" />
          <ChevronDown aria-hidden="true" className="size-3" />
        </summary>
        <span
          role="tooltip"
          id="board-shapes-tip"
          className="bg-foreground text-background pointer-events-none invisible absolute left-full z-30 ml-2 rounded px-2 py-1 text-xs whitespace-nowrap group-focus-within/tool:visible group-hover/tool:visible"
        >
          Shapes
        </span>
        <div
          aria-label="Shapes"
          role="group"
          className="bg-popover absolute top-0 left-full z-30 ml-2 min-w-48 rounded-md border p-1 shadow-sm"
        >
          {shapeChoices.map(([value, label]) => (
            <button
              aria-pressed={shape === value}
              className="hover:bg-muted block min-h-10 w-full px-3 text-left text-sm"
              disabled={!canMutate || busy}
              key={value}
              onClick={(event) => {
                pickShape(value);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </details>
    );
  }
  return (
    <>
      <div
        aria-label="Board tools"
        aria-orientation={wide ? "vertical" : "horizontal"}
        className="bg-background flex gap-1 rounded-lg border p-1 shadow-sm md:flex-col"
        onKeyDown={keys}
        ref={ref}
        role="toolbar"
      >
        {wide ? (
          <>
            {tools.slice(0, 2).map((tool, index) => toolButton(tool, index))}
            <div role="separator" className="my-1 border-t" />
            {tools
              .slice(2, 4)
              .map((tool, index) => toolButton(tool, index + 2))}
            {shapesMenu(4)}
            {[tools[6]!, tools[7]!, tools[4]!, tools[5]!].map((tool, index) =>
              toolButton(tool, index + 5),
            )}
            <div role="separator" className="my-1 border-t" />
          </>
        ) : (
          <>
            {tools.slice(0, 2).map((tool, index) => toolButton(tool, index))}
            <Button
              aria-label="Insert object"
              data-board-tool={2}
              disabled={!canMutate || busy}
              onClick={() => setInsertOpen(true)}
              tabIndex={tab === 2 ? 0 : -1}
              variant="ghost"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add
            </Button>
          </>
        )}
        <details className="group/tool relative">
          <summary
            aria-describedby="board-more-tip"
            aria-label="More tools"
            className="hover:bg-muted flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-md max-md:min-h-11 max-md:min-w-11"
            data-board-tool={wide ? 9 : 3}
            tabIndex={tab === (wide ? 9 : 3) ? 0 : -1}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </summary>
          <span
            role="tooltip"
            id="board-more-tip"
            className="bg-foreground text-background pointer-events-none invisible absolute left-full z-30 ml-2 rounded px-2 py-1 text-xs whitespace-nowrap group-focus-within/tool:visible group-hover/tool:visible"
          >
            More tools
          </span>
          <div
            aria-label="History"
            role="group"
            className="bg-popover absolute top-full left-0 z-30 min-w-44 rounded-md border p-1 shadow-sm md:top-0 md:left-full md:ml-2"
          >
            <Button
              aria-label="Undo"
              className="w-full justify-start"
              disabled={!canMutate || !canUndo || busy}
              onClick={onUndo}
              variant="ghost"
            >
              <Undo2 aria-hidden="true" className="size-4" />
              Undo
            </Button>
            <Button
              aria-label="Redo"
              className="w-full justify-start"
              disabled={!canMutate || !canRedo || busy}
              onClick={onRedo}
              variant="ghost"
            >
              <Redo2 aria-hidden="true" className="size-4" />
              Redo
            </Button>
          </div>
        </details>
      </div>
      <Dialog
        className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
        mobileSheet
        open={insertOpen}
        onOpenChange={setInsertOpen}
        title="Insert on board"
        description="Choose a tool, then tap the canvas or press Enter to insert at its center. Image opens the file picker."
      >
        <div className="grid grid-cols-2 gap-2 p-4">
          {tools.slice(2).map((tool, index) => toolButton(tool, index, true))}
          <div className="col-span-2 border-t pt-3">
            <p className="mb-2 text-sm font-medium">Shapes</p>
            <div className="grid grid-cols-2 gap-1">
              {shapeChoices.map(([value, label]) => (
                <Button
                  key={value}
                  onClick={() => pickShape(value)}
                  variant="ghost"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
