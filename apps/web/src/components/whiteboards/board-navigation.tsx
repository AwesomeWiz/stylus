"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import type {
  ShellIdentity,
  ShellOrganization,
} from "@/components/layout/app-shell";
import type { NavigationGroup } from "@/components/layout/navigation";
export interface BoardNavigationState {
  identity: ShellIdentity;
  organization: ShellOrganization;
  navigationGroups: NavigationGroup[];
  logoutAction: () => Promise<void>;
}
export function focusBoardCanvas() {
  document.getElementById("board-canvas")?.focus({ preventScroll: true });
}
export function BoardNavigation({
  state,
  beforeLeave,
}: {
  state: BoardNavigationState;
  beforeLeave: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button aria-label="Open main navigation" size="icon" variant="ghost">
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content
          className="bg-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col border-r focus:outline-none max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(focusBoardCanvas);
          }}
          onClickCapture={(event) => {
            if (
              (event.target as Element).closest("a[href]") &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !beforeLeave()
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onSubmitCapture={(event) => {
            if (!beforeLeave()) event.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a workspace destination. Closing returns to the canvas.
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              aria-label="Close navigation"
              className="absolute top-3 right-3 z-10"
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </Dialog.Close>
          <Sidebar
            {...state}
            activePath="/whiteboards"
            onNavigate={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
