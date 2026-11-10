"use client";
import type { ComponentProps } from "react";
import { Popover } from "@/components/ui/popover";
export {
  usePopup as useBoardPopup,
  moveOptionFocus as moveBoardOptionFocus,
} from "@/components/ui/popover";
export function BoardPopover(props: ComponentProps<typeof Popover>) {
  return (
    <Popover
      {...props}
      scopeSelector="[data-board-panel],[role=dialog],header"
      sidePanelSelector='[data-board-panel="right"],[role="dialog"]'
      fallbackFocusId="board-canvas"
    />
  );
}
