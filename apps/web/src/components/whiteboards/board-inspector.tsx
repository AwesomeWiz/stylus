"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  ancestors,
  canMoveObject,
  isObjectLocked,
  objectTitle,
  type Alignment,
} from "@/modules/whiteboards/operations";
import { WhiteboardInspector } from "./whiteboard-inspector";
import { shapeChoices } from "./whiteboard-toolbar";

export type SelectionAction =
  | "GROUP"
  | "UNGROUP"
  | "DUPLICATE"
  | "ARCHIVE"
  | "LOCK"
  | "WIDTH"
  | "HEIGHT"
  | "DISTRIBUTE_X"
  | "DISTRIBUTE_Y"
  | "BACK"
  | "BACKWARD"
  | "FORWARD"
  | "FRONT";
export function BoardInspector({
  rows,
  selection,
  canMutate,
  busy,
  onUpdate,
  onAction,
  onAlign,
  onMembership,
  onReplace,
  onSelect,
}: {
  rows: BoardElementRow[];
  selection: BoardElementRow[];
  canMutate: boolean;
  busy: boolean;
  onUpdate: (
    id: string,
    patch: Partial<BoardElementRow>,
  ) => Promise<BoardElementRow | null>;
  onAction: (action: SelectionAction) => void;
  onAlign: (alignment: Alignment) => void;
  onMembership: (id: string | null) => void;
  onReplace: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const row = selection.length === 1 ? selection[0] : undefined;
  const unlocked = selection.every((entry) => canMoveObject(entry, rows));
  const disabled = !canMutate || busy;
  return (
    <div className="space-y-5">
      <p className="text-sm font-medium">
        {selection.length} selected{!canMutate ? " · Read only" : ""}
      </p>
      {row ? (
        <ObjectProperties
          key={row.id}
          row={row}
          disabled={disabled || isObjectLocked(row, rows)}
          onUpdate={onUpdate}
        />
      ) : null}
      {row && ancestors(row, rows).some((parent) => parent.locked) ? (
        <p className="text-sm">
          Locked by a container.{" "}
          <Button
            className="px-1"
            onClick={() =>
              onSelect(ancestors(row, rows).find((parent) => parent.locked)!.id)
            }
            variant="ghost"
          >
            Inspect container
          </Button>
        </p>
      ) : null}
      {canMutate ? (
        <>
          {row?.element_type === "IMAGE" ? (
            <Button
              disabled={busy || isObjectLocked(row, rows)}
              onClick={() => onReplace(row.id)}
              variant="secondary"
            >
              Replace image
            </Button>
          ) : null}
          {row?.element_type === "SECTION" ? (
            <Button
              disabled={busy}
              onClick={() =>
                void onUpdate(row.id, {
                  content: {
                    ...row.content,
                    collapsed: !row.content.collapsed,
                  },
                })
              }
              variant="secondary"
            >
              {row.content.collapsed ? "Expand Section" : "Collapse Section"}
            </Button>
          ) : null}
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Object actions"
          >
            <Button
              disabled={disabled}
              onClick={() => onAction("DUPLICATE")}
              variant="secondary"
            >
              Duplicate
            </Button>
            <Button
              disabled={disabled}
              onClick={() => onAction("LOCK")}
              variant="secondary"
            >
              {selection.every((entry) => entry.locked) ? "Unlock" : "Lock"}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => onAction("ARCHIVE")}
              variant="ghost"
            >
              Archive
            </Button>
            <Button
              disabled={
                disabled ||
                selection.length < 2 ||
                !unlocked ||
                selection.some((entry) =>
                  ["SECTION", "GROUP"].includes(entry.element_type),
                )
              }
              onClick={() => onAction("GROUP")}
              variant="secondary"
            >
              Group
            </Button>
            <Button
              disabled={
                disabled ||
                !unlocked ||
                !selection.some((entry) => entry.element_type === "GROUP")
              }
              onClick={() => onAction("UNGROUP")}
              variant="secondary"
            >
              Ungroup
            </Button>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Section membership
            </legend>
            <p className="text-muted-foreground text-xs">
              Explicit membership only. Overlap never reparents an object.
            </p>
            <select
              aria-label="Section membership"
              className="bg-background h-11 w-full rounded-md border px-2 text-sm"
              disabled={
                disabled ||
                !unlocked ||
                selection.some(
                  (entry) =>
                    entry.element_type === "SECTION" ||
                    ancestors(entry, rows)[0]?.element_type === "GROUP",
                )
              }
              value={row?.parent_id ?? ""}
              onChange={(event) => onMembership(event.target.value || null)}
            >
              <option value="">Board root</option>
              {rows
                .filter(
                  (entry) => entry.element_type === "SECTION" && !entry.locked,
                )
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {objectTitle(entry)}
                  </option>
                ))}
            </select>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Align to selection bounds
            </legend>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["left", "Align left"],
                  ["center", "Align horizontal center"],
                  ["right", "Align right"],
                  ["top", "Align top"],
                  ["middle", "Align vertical center"],
                  ["bottom", "Align bottom"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  className="justify-start px-2 text-xs"
                  disabled={disabled || !unlocked || selection.length < 2}
                  key={value}
                  onClick={() => onAlign(value)}
                  variant="ghost"
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
          <div
            className="grid grid-cols-2 gap-1"
            role="group"
            aria-label="Distribute and match size"
          >
            {(
              [
                ["DISTRIBUTE_X", "Distribute horizontally"],
                ["DISTRIBUTE_Y", "Distribute vertically"],
                ["WIDTH", "Same width"],
                ["HEIGHT", "Same height"],
              ] as const
            ).map(([value, label]) => (
              <Button
                className="px-2 text-xs"
                disabled={
                  disabled ||
                  !unlocked ||
                  selection.length < (value.startsWith("DISTRIBUTE") ? 3 : 2) ||
                  (!value.startsWith("DISTRIBUTE") &&
                    selection.some((entry) =>
                      ["SECTION", "GROUP", "ARROW"].includes(
                        entry.element_type,
                      ),
                    ))
                }
                key={value}
                onClick={() => onAction(value)}
                variant="ghost"
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Distribution spaces outer edges evenly. Same size matches the widest
            or tallest selected object.
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Layers</legend>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["BACK", "Send to back"],
                  ["BACKWARD", "Send backward"],
                  ["FORWARD", "Bring forward"],
                  ["FRONT", "Bring to front"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  className="px-2 text-xs"
                  disabled={disabled}
                  key={value}
                  onClick={() => onAction(value)}
                  variant="ghost"
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
    </div>
  );
}

function ObjectProperties({
  row,
  disabled,
  onUpdate,
}: {
  row: BoardElementRow;
  disabled: boolean;
  onUpdate: (
    id: string,
    patch: Partial<BoardElementRow>,
  ) => Promise<BoardElementRow | null>;
}) {
  const [base, setBase] = useState(row),
    [style, setStyle] = useState(row.style);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initial: Record<string, string> = {
    title: String(base.content.title ?? ""),
    text: String(base.content.text ?? ""),
    url: String(base.content.url ?? ""),
    note: String(base.content.note ?? ""),
    alt: String(base.content.alt ?? ""),
    caption: String(base.content.caption ?? ""),
    sourceUrl: String(base.content.sourceUrl ?? ""),
    shape: String(base.content.shape ?? "rectangle"),
    x: String(base.x),
    y: String(base.y),
    width: String(base.width),
    height: String(base.height),
    rotation: String(base.rotation),
    objectFit: String(base.style.objectFit ?? "contain"),
    cropZoom: String(base.style.cropZoom ?? 1),
    cropX: String(base.style.cropX ?? 50),
    cropY: String(base.style.cropY ?? 50),
  };
  const container =
    row.element_type === "SECTION" || row.element_type === "GROUP";
  function text(name: string, label: string, multiline = false) {
    return (
      <label className="block text-sm font-medium">
        {label}
        {multiline ? (
          <Textarea
            className="mt-1.5 min-h-24"
            defaultValue={initial[name]}
            maxLength={5000}
            name={name}
          />
        ) : (
          <Input
            className="mt-1.5"
            defaultValue={initial[name]}
            maxLength={name === "url" || name === "sourceUrl" ? 2048 : 200}
            name={name}
          />
        )}
      </label>
    );
  }
  function number(
    name: string,
    label: string,
    min: number,
    max: number,
    step = "1",
  ) {
    return (
      <label className="block text-xs">
        {label}
        <Input
          className="mt-1"
          defaultValue={initial[name]}
          min={min}
          max={max}
          name={name}
          step={step}
          type="number"
        />
      </label>
    );
  }
  async function save(data: FormData) {
    const patch: Partial<BoardElementRow> = {},
      content = { ...row.content },
      nextStyle = { ...row.style };
    for (const key of [
      "title",
      "text",
      "url",
      "note",
      "alt",
      "caption",
      "sourceUrl",
      "shape",
    ])
      if (data.has(key) && String(data.get(key)) !== initial[key])
        content[key] = String(data.get(key));
    for (const key of ["x", "y", "width", "height", "rotation"] as const)
      if (data.has(key) && String(data.get(key)) !== initial[key])
        patch[key] = Number(data.get(key));
    for (const key of ["objectFit", "cropZoom", "cropX", "cropY"])
      if (data.has(key) && String(data.get(key)) !== initial[key])
        nextStyle[key] =
          key === "objectFit" ? String(data.get(key)) : Number(data.get(key));
    for (const key of Object.keys(style))
      if (style[key] !== base.style[key]) nextStyle[key] = style[key];
    if (row.element_type === "IMAGE")
      nextStyle.aspectLock = data.has("aspectLock");
    patch.content = content;
    patch.style = nextStyle;
    const saved = await onUpdate(row.id, patch);
    if (saved) {
      setSaveError(null);
      setBase(saved);
      setStyle(saved.style);
    } else
      setSaveError(
        "The object was not saved. Check its fields. If saving failed, close Inspector and retry from the board header.",
      );
  }
  return (
    <form action={save} className="space-y-4" key={base.updated_at}>
      {saveError ? (
        <p role="alert" className="text-destructive text-sm">
          {saveError}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {row.element_type.toLowerCase()} · Position {Math.round(row.x)},{" "}
        {Math.round(row.y)}
      </p>
      {row.updated_at !== base.updated_at ? (
        <div className="text-sm">
          <p>This object changed. Your field edits are kept.</p>
          <Button
            onClick={() => {
              setBase(row);
              setStyle(row.style);
            }}
            variant="ghost"
          >
            Reset fields to latest
          </Button>
        </div>
      ) : null}
      <fieldset className="space-y-4" disabled={disabled}>
        {container || row.element_type === "LINK"
          ? text("title", "Name")
          : null}
        {row.element_type === "TEXT" || row.element_type === "STICKY"
          ? text("text", "Content", true)
          : null}
        {row.element_type === "LINK" ? (
          <>
            {text("url", "URL")}
            {text("note", "Note", true)}
            <p className="text-muted-foreground text-xs">
              Manual link only. No external preview is fetched.
            </p>
          </>
        ) : null}
        {row.element_type === "IMAGE" ? (
          <>
            {text("alt", "Image description")}
            {text("caption", "Caption", true)}
            {text("sourceUrl", "Source URL (metadata only)")}
            <label className="block text-sm">
              Fit
              <select
                className="bg-background mt-1.5 h-11 w-full rounded-md border px-2"
                defaultValue={initial.objectFit}
                name="objectFit"
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                defaultChecked={base.style.aspectLock !== false}
                name="aspectLock"
                type="checkbox"
              />
              Lock image aspect ratio
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Non-destructive crop
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {number("cropZoom", "Zoom", 1, 4, "0.1")}
                {number("cropX", "Focus X (%)", 0, 100)}
                {number("cropY", "Focus Y (%)", 0, 100)}
              </div>
            </fieldset>
            <p className="text-muted-foreground text-xs">
              The original private asset is retained. Replace preserves this
              object and its comments.
            </p>
          </>
        ) : null}
        {row.element_type === "SHAPE" ? (
          <label className="block text-sm">
            Shape
            <select
              className="bg-background mt-1 h-11 w-full rounded-md border px-2"
              defaultValue={initial.shape}
              name="shape"
            >
              {shapeChoices
                .filter(([value]) => !["line", "arrow"].includes(value))
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              {initial.shape === "ellipse" ? (
                <option value="ellipse">Ellipse (existing)</option>
              ) : null}
            </select>
          </label>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Bounds</legend>
          <div className="grid grid-cols-2 gap-2">
            {number("x", "X", -1000000, 1000000)}
            {number("y", "Y", -1000000, 1000000)}
            {row.element_type !== "GROUP" ? (
              <>
                {number("width", "Width", 24, 10000)}
                {number("height", "Height", 24, 10000)}
              </>
            ) : null}
            {!container ? number("rotation", "Rotation", -360, 360) : null}
          </div>
        </fieldset>
        {row.element_type === "SECTION" ? (
          <p className="text-muted-foreground text-xs">
            Resizing changes bounds without scaling children. A position-only
            change moves its children together.
          </p>
        ) : null}
        {!container && row.element_type !== "LINK" ? (
          <WhiteboardInspector
            element={{ ...row, style }}
            onStyleChange={setStyle}
            pending={disabled}
          />
        ) : null}
        {!disabled ? (
          <Button className="w-full" type="submit">
            Save object
          </Button>
        ) : null}
      </fieldset>
    </form>
  );
}
