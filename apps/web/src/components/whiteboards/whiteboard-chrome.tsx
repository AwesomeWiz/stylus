"use client";

import {
  Archive,
  ArrowDownToLine,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpToLine,
  ArrowUpWideNarrow,
  Check,
  CloudAlert,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardElementRow } from "@/lib/supabase/database.types";

export type WhiteboardSaveState = "SAVED" | "SAVING" | "ERROR";

export function WhiteboardHeader({
  canMutate,
  onRename,
  onRenamingChange,
  onRetry,
  renaming,
  saveState,
  setTitle,
  title,
}: {
  canMutate: boolean;
  onRename: () => void;
  onRenamingChange: (renaming: boolean) => void;
  onRetry?: () => void;
  renaming: boolean;
  saveState: WhiteboardSaveState;
  setTitle: (title: string) => void;
  title: string;
}) {
  return (
    <header className="bg-background flex min-h-14 items-center gap-3 border-b px-3 sm:px-4">
      <Link
        aria-label="Back to whiteboards"
        className="focus-visible:ring-ring rounded-md p-2 focus-visible:ring-2"
        href={"/whiteboards" as Route}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
      </Link>
      {renaming && canMutate ? (
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.querySelector("input")?.blur();
          }}
        >
          <Input
            aria-label="Board name"
            autoFocus
            className="h-9 max-w-md"
            maxLength={120}
            onBlur={onRename}
            onChange={(event) => setTitle(event.currentTarget.value)}
            value={title}
          />
        </form>
      ) : (
        <button
          className="min-w-0 truncate text-left text-sm font-semibold disabled:cursor-default"
          disabled={!canMutate}
          onClick={() => onRenamingChange(true)}
          title={canMutate ? "Rename board" : undefined}
        >
          {title}
        </button>
      )}
      <div
        aria-live="polite"
        className={`ml-auto flex items-center gap-1.5 text-xs ${saveState === "ERROR" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {saveState === "SAVING" ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : saveState === "ERROR" ? (
          <CloudAlert aria-hidden="true" className="size-3.5" />
        ) : (
          <Check aria-hidden="true" className="size-3.5" />
        )}
        {saveState === "SAVING"
          ? "Saving"
          : saveState === "ERROR"
            ? "Not saved"
            : "Saved"}
        {saveState === "ERROR" && onRetry ? (
          <Button className="ml-1 h-8" onClick={onRetry} variant="secondary">
            <RotateCcw aria-hidden="true" className="size-3.5" /> Retry
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export function SelectionToolbar({
  element,
  onLayerChange,
  onRemove,
  onShapeChange,
  pending,
}: {
  element?: BoardElementRow;
  onLayerChange: (direction: "BACKWARD" | "FORWARD" | "FRONT" | "BACK") => void;
  onRemove: () => void;
  onShapeChange: (shape: "rectangle" | "ellipse") => void;
  pending: boolean;
}) {
  return (
    <div
      aria-label="Selected element actions"
      className="bg-background absolute top-3 right-3 z-10 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-lg border p-1 shadow-sm"
      role="toolbar"
    >
      <Button
        aria-label="Send to back"
        onClick={() => onLayerChange("BACK")}
        size="icon"
        title="Send to back"
        variant="ghost"
      >
        <ArrowDownToLine aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Send backward"
        onClick={() => onLayerChange("BACKWARD")}
        size="icon"
        title="Send backward"
        variant="ghost"
      >
        <ArrowDownWideNarrow aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Bring forward"
        onClick={() => onLayerChange("FORWARD")}
        size="icon"
        title="Bring forward"
        variant="ghost"
      >
        <ArrowUpWideNarrow aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Bring to front"
        onClick={() => onLayerChange("FRONT")}
        size="icon"
        title="Bring to front"
        variant="ghost"
      >
        <ArrowUpToLine aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Delete selected element"
        disabled={pending}
        onClick={onRemove}
        size="icon"
        title="Delete"
        variant="ghost"
      >
        <Archive aria-hidden="true" className="size-4" />
      </Button>
      {element?.element_type === "SHAPE" ? (
        <>
          <Button
            aria-pressed={element.content.shape !== "ellipse"}
            onClick={() => onShapeChange("rectangle")}
            title="Rectangle"
            variant="ghost"
          >
            Rectangle
          </Button>
          <Button
            aria-pressed={element.content.shape === "ellipse"}
            onClick={() => onShapeChange("ellipse")}
            title="Ellipse"
            variant="ghost"
          >
            Ellipse
          </Button>
        </>
      ) : null}
    </div>
  );
}
