import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  ArrowLeftRight,
  ArrowUpDown,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import {
  canMoveObject,
  type Alignment,
} from "@/modules/whiteboards/operations";
import type { SelectionAction } from "./board-inspector";
export const alignmentCommands: readonly [Alignment, string, LucideIcon][] = [
  ["left", "Align left", AlignHorizontalJustifyStart],
  ["center", "Align horizontal center", AlignHorizontalJustifyCenter],
  ["right", "Align right", AlignHorizontalJustifyEnd],
  ["top", "Align top", AlignVerticalJustifyStart],
  ["middle", "Align vertical center", AlignVerticalJustifyCenter],
  ["bottom", "Align bottom", AlignVerticalJustifyEnd],
];
export const layerCommands: readonly [SelectionAction, string, LucideIcon][] = [
  ["BACK", "Send to back", SendToBack],
  ["BACKWARD", "Send backward", ArrowDown],
  ["FORWARD", "Bring forward", ArrowUp],
  ["FRONT", "Bring to front", BringToFront],
];
function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <span className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className="hover:bg-muted flex size-10 items-center justify-center rounded disabled:opacity-50"
      >
        <Icon aria-hidden className="size-4" />
      </button>
      <span
        aria-hidden
        className="bg-popover pointer-events-none absolute right-0 bottom-full z-50 hidden rounded border px-2 py-1 text-xs whitespace-nowrap group-focus-within:block group-hover:block"
      >
        {label}
      </span>
    </span>
  );
}
export function BoardArrangeControls({
  rows,
  selection,
  busy,
  onAction,
  onAlign,
}: {
  rows: BoardElementRow[];
  selection: BoardElementRow[];
  busy: boolean;
  onAction: (a: SelectionAction) => void;
  onAlign: (a: Alignment) => void;
}) {
  const movable = selection.filter((r) => canMoveObject(r, rows));
  const sizing =
    selection.length >= 2 &&
    selection.every(
      (r) =>
        canMoveObject(r, rows) &&
        !["SECTION", "GROUP", "ARROW"].includes(r.element_type),
    );
  return (
    <div className="space-y-3">
      {selection.length >= 2 && movable.length > 0 ? (
        <fieldset>
          <legend className="mb-1 text-xs font-medium">Alignment</legend>
          <div className="flex flex-wrap" role="group" aria-label="Alignment">
            {alignmentCommands.map(([value, label, icon]) => (
              <IconAction
                key={value}
                {...{ label, icon }}
                disabled={busy}
                onClick={() => onAlign(value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      {movable.length === selection.length && selection.length >= 3 ? (
        <div className="flex" role="group" aria-label="Distribution">
          {(
            [
              [
                "DISTRIBUTE_X",
                "Distribute horizontally",
                AlignHorizontalDistributeCenter,
              ],
              [
                "DISTRIBUTE_Y",
                "Distribute vertically",
                AlignVerticalDistributeCenter,
              ],
            ] as const
          ).map(([value, label, icon]) => (
            <IconAction
              key={value}
              {...{ label, icon }}
              disabled={busy}
              onClick={() => onAction(value)}
            />
          ))}
        </div>
      ) : null}
      {sizing ? (
        <div className="flex" role="group" aria-label="Match size">
          {(
            [
              ["WIDTH", "Same width", ArrowLeftRight],
              ["HEIGHT", "Same height", ArrowUpDown],
            ] as const
          ).map(([value, label, icon]) => (
            <IconAction
              key={value}
              {...{ label, icon }}
              disabled={busy}
              onClick={() => onAction(value)}
            />
          ))}
        </div>
      ) : null}
      <fieldset>
        <legend className="mb-1 text-xs font-medium">Arrange</legend>
        <div className="flex" role="group" aria-label="Arrange">
          {layerCommands.map(([value, label, icon]) => (
            <IconAction
              key={value}
              {...{ label, icon }}
              disabled={busy}
              onClick={() => onAction(value)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
