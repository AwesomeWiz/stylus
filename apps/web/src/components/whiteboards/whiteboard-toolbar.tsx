"use client";

import {
  ArrowRight,
  Hand,
  ImagePlus,
  MousePointer2,
  Shapes,
  StickyNote,
  Type,
  Undo2,
  Redo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BoardElementType } from "@/lib/supabase/database.types";

export type WhiteboardTool = "SELECT" | "PAN" | BoardElementType;

const tools: {
  icon: typeof MousePointer2;
  label: string;
  value: WhiteboardTool;
}[] = [
  { icon: MousePointer2, label: "Select", value: "SELECT" },
  { icon: Hand, label: "Pan", value: "PAN" },
  { icon: Type, label: "Text", value: "TEXT" },
  { icon: StickyNote, label: "Sticky", value: "STICKY" },
  { icon: ImagePlus, label: "Image", value: "IMAGE" },
  { icon: Shapes, label: "Shape", value: "SHAPE" },
  { icon: ArrowRight, label: "Arrow", value: "ARROW" },
];

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
}) {
  return (
    <div
      aria-label="Whiteboard tools"
      className="bg-background flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-lg border p-1 shadow-sm"
      role="toolbar"
    >
      {tools.map(({ icon: Icon, label, value }) => {
        const mutationTool = !["SELECT", "PAN"].includes(value);
        return (
          <Button
            aria-pressed={activeTool === value}
            className={
              activeTool === value ? "bg-muted text-foreground" : undefined
            }
            disabled={(!canMutate && mutationTool) || busy}
            key={value}
            onClick={() =>
              value === "IMAGE" ? onImageRequest() : onToolChange(value)
            }
            size="icon"
            title={label}
            variant="ghost"
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
      <span aria-hidden="true" className="bg-border mx-0.5 w-px" />
      <Button
        aria-label="Undo"
        disabled={!canUndo || busy}
        onClick={onUndo}
        size="icon"
        title="Undo (Ctrl/Cmd+Z)"
        variant="ghost"
      >
        <Undo2 aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Redo"
        disabled={!canRedo || busy}
        onClick={onRedo}
        size="icon"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        variant="ghost"
      >
        <Redo2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
