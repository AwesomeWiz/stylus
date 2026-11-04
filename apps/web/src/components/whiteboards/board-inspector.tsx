"use client";
import { Button } from "@/components/ui/button";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  ancestors,
  canMoveObject,
  isObjectLocked,
  objectTitle,
  type Alignment,
} from "@/modules/whiteboards/operations";
import { WhiteboardInspector } from "./whiteboard-inspector";
import { BoardPropertyField } from "./board-property-field";
import { BoardArrangeControls } from "./board-arrange-controls";
import { shapeChoices } from "./whiteboard-toolbar";
import { BoardTypography } from "./board-typography";
export type SelectionAction =
  | "GROUP"
  | "UNGROUP"
  | "SECTION"
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
  onAction: (a: SelectionAction) => void;
  onAlign: (a: Alignment) => void;
  onMembership: (id: string | null) => void;
  onReplace: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const row = selection.length === 1 ? selection[0] : undefined;
  const disabled = !canMutate || busy;
  const locked = !!row && isObjectLocked(row, rows);
  const container = row && ["SECTION", "GROUP"].includes(row.element_type);
  const membership =
    selection.length > 0 &&
    selection.every(
      (r) =>
        r.element_type !== "SECTION" &&
        canMoveObject(r, rows) &&
        ancestors(r, rows)[0]?.element_type !== "GROUP",
    );
  const update = async (patch: Partial<BoardElementRow>) =>
    !!row && !!(await onUpdate(row.id, patch));
  function field(key: string, label: string, multiline = false) {
    if (!row) return null;
    return (
      <BoardPropertyField
        label={label}
        value={String(row.content[key] ?? "")}
        multiline={multiline}
        disabled={disabled || locked}
        onCommit={(value) =>
          update({ content: { ...row.content, [key]: value } })
        }
      />
    );
  }
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-xs">
        {selection.length} selected{!canMutate ? " · Read only" : ""}
      </p>
      {!selection.length ? (
        <p className="text-sm">Select an object to edit its properties.</p>
      ) : null}
      {row ? (
        <>
          <fieldset>
            <legend className="mb-2 text-xs font-medium">Transform</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "x",
                  "y",
                  ...(row.element_type !== "GROUP" ? ["width", "height"] : []),
                  ...(!container ? ["rotation"] : []),
                ] as const
              ).map((key) => (
                <BoardPropertyField
                  key={key}
                  label={
                    (
                      {
                        x: "X",
                        y: "Y",
                        width: "W",
                        height: "H",
                        rotation: "Rotation",
                      } as Record<string, string>
                    )[key]!
                  }
                  value={row[key as "x"]}
                  numeric
                  min={
                    ["width", "height"].includes(key)
                      ? 24
                      : key === "rotation"
                        ? -360
                        : -1000000
                  }
                  max={
                    ["width", "height"].includes(key)
                      ? 10000
                      : key === "rotation"
                        ? 360
                        : 1000000
                  }
                  disabled={disabled || locked}
                  onCommit={(v) => update({ [key]: v })}
                />
              ))}
            </div>
          </fieldset>
          {locked ? (
            <div className="text-sm">
              Locked
              {canMutate ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    const parent = ancestors(row, rows).find((r) => r.locked);
                    if (parent) onSelect(parent.id);
                    else onAction("LOCK");
                  }}
                >
                  {row.locked ? "Unlock" : "Select locked container"}
                </Button>
              ) : null}
            </div>
          ) : null}
          {["TEXT", "STICKY"].includes(row.element_type)
            ? field("text", "Content", true)
            : null}
          {["TEXT", "STICKY"].includes(row.element_type) ? (
            <BoardTypography
              row={row}
              disabled={disabled || locked}
              onChange={(style) => update({ style })}
            />
          ) : null}
          {container ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">
                {row.element_type === "GROUP" ? "Group" : "Section"}
              </legend>
              {field("title", "Name")}
              <p className="text-muted-foreground text-xs">
                {row.element_type === "GROUP"
                  ? "Move and edit several objects together."
                  : "Organize related work inside a named area."}
              </p>
              {canMutate && row.element_type === "GROUP" ? (
                <Button
                  variant="secondary"
                  disabled={busy || locked}
                  onClick={() => onAction("UNGROUP")}
                >
                  Ungroup
                </Button>
              ) : null}
              {canMutate && row.element_type === "SECTION" ? (
                <Button
                  variant="secondary"
                  disabled={busy || locked}
                  onClick={() =>
                    void update({
                      content: {
                        ...row.content,
                        collapsed: !row.content.collapsed,
                      },
                    })
                  }
                >
                  {row.content.collapsed
                    ? "Expand Section"
                    : "Collapse Section"}
                </Button>
              ) : null}
            </fieldset>
          ) : null}
          {row.element_type === "ARROW" ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">Arrow</legend>
              {field("label", "Arrow label")}
              <label className="flex min-h-10 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={row.content.reverse === true}
                  disabled={disabled || locked}
                  onChange={(event) =>
                    void update({
                      content: {
                        ...row.content,
                        reverse: event.target.checked,
                      },
                    })
                  }
                />
                Reverse direction
              </label>
            </fieldset>
          ) : null}
          {row.element_type === "LINK" ? (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium">Link</legend>
              {field("title", "Name")}
              {field("url", "URL")}
              {field("note", "Note", true)}
            </fieldset>
          ) : null}
          {row.element_type === "IMAGE" ? (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium">Image</legend>
              {field("alt", "Image description")}
              {field("caption", "Caption", true)}
              {field("sourceUrl", "Source URL")}
              <label className="block text-xs">
                Fit
                <select
                  aria-label="Image fit"
                  className="bg-background mt-1 h-10 w-full rounded border px-2"
                  value={String(row.style.objectFit ?? "contain")}
                  disabled={disabled || locked}
                  onChange={(e) =>
                    void update({
                      style: { ...row.style, objectFit: e.target.value },
                    })
                  }
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
              <label className="flex min-h-10 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={row.style.aspectLock !== false}
                  disabled={disabled || locked}
                  onChange={(e) =>
                    void update({
                      style: { ...row.style, aspectLock: e.target.checked },
                    })
                  }
                />
                Lock image aspect ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["cropZoom", "cropX", "cropY"] as const).map((key) => (
                  <BoardPropertyField
                    key={key}
                    label={
                      key === "cropZoom"
                        ? "Crop zoom"
                        : key === "cropX"
                          ? "Focus X"
                          : "Focus Y"
                    }
                    value={Number(
                      row.style[key] ?? (key === "cropZoom" ? 1 : 50),
                    )}
                    numeric
                    min={key === "cropZoom" ? 1 : 0}
                    max={key === "cropZoom" ? 4 : 100}
                    disabled={disabled || locked}
                    onCommit={(v) =>
                      update({ style: { ...row.style, [key]: v } })
                    }
                  />
                ))}
              </div>
              {canMutate ? (
                <Button
                  variant="secondary"
                  disabled={busy || locked}
                  onClick={() => onReplace(row.id)}
                >
                  Replace image
                </Button>
              ) : null}
            </fieldset>
          ) : null}
          {row.element_type === "SHAPE" ? (
            <label className="block text-xs">
              Shape
              <select
                aria-label="Shape"
                className="bg-background mt-1 h-10 w-full rounded border px-2"
                value={String(row.content.shape ?? "rectangle")}
                disabled={disabled || locked}
                onChange={(e) =>
                  void update({
                    content: { ...row.content, shape: e.target.value },
                  })
                }
              >
                {shapeChoices
                  .filter(([v]) => !["line", "arrow"].includes(v))
                  .map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                {row.content.shape === "ellipse" ? (
                  <option value="ellipse">Ellipse</option>
                ) : null}
              </select>
            </label>
          ) : null}
          {["TEXT", "STICKY", "SHAPE", "ARROW"].includes(row.element_type) ? (
            <fieldset>
              <legend className="mb-2 text-xs font-medium">Appearance</legend>
              <WhiteboardInspector
                showTypography={false}
                element={row}
                pending={disabled || locked}
                onStyleChange={(style) => void update({ style })}
              />
            </fieldset>
          ) : null}
        </>
      ) : null}
      {canMutate && selection.length ? (
        <>
          <BoardArrangeControls
            rows={rows}
            selection={selection}
            busy={busy}
            onAction={onAction}
            onAlign={onAlign}
          />
          {selection.length >= 2 &&
          selection.every(
            (r) =>
              !["SECTION", "GROUP"].includes(r.element_type) &&
              canMoveObject(r, rows),
          ) ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => onAction("GROUP")}
            >
              Group selection
            </Button>
          ) : null}
          {membership ? (
            <label className="block text-xs font-medium">
              Move to section
              <select
                aria-label="Move to section"
                className="bg-background mt-2 h-10 w-full rounded border px-2"
                disabled={busy}
                value={row?.parent_id ?? ""}
                onChange={(e) => onMembership(e.target.value || null)}
              >
                <option value="">Loose objects</option>
                {rows
                  .filter((r) => r.element_type === "SECTION" && !r.locked)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {objectTitle(r)}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
