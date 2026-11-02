"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { focusBoardCanvas } from "./board-navigation";
const desktopSnapshot = () =>
  Boolean(window.matchMedia?.("(min-width: 1200px)").matches);
const tabletSnapshot = () =>
  Boolean(window.matchMedia?.("(min-width: 768px)").matches);
const serverSnapshot = () => false;
function subscribe(listener: () => void) {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}
export function useBoardDesktop() {
  return useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
}
export function useBoardWideTools() {
  return useSyncExternalStore(subscribe, tabletSnapshot, serverSnapshot);
}
export function BoardPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const desktop = useBoardDesktop();
  return (
    <Dialog.Root
      open
      modal={!desktop}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        {!desktop ? (
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        ) : null}
        <Dialog.Content
          aria-modal={!desktop}
          className="bg-background fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-md focus:outline-none min-[1200px]:top-12 min-[1200px]:z-30 md:w-80 max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
          onInteractOutside={(event) => {
            if (desktop) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(focusBoardCanvas);
          }}
        >
          <header className="flex items-center justify-between gap-2 border-b p-4">
            <div>
              <Dialog.Title className="font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-xs">
                Board context. Close to return to the canvas.
              </Dialog.Description>
            </div>
            <Button
              aria-label={`Close ${title.toLowerCase()}`}
              onClick={onClose}
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
