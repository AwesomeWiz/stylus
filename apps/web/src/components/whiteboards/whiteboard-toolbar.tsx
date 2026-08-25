"use client";

import {
  ArrowRight,
  Hand,
  ImagePlus,
  MousePointer2,
  Shapes,
  StickyNote,
  Type,
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
  onToolChange,
}: {
  activeTool: WhiteboardTool;
  canMutate: boolean;
  onToolChange: (tool: WhiteboardTool) => void;
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
            disabled={!canMutate && mutationTool}
            key={value}
            onClick={() => onToolChange(value)}
            size="icon"
            title={label}
            variant="ghost"
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
