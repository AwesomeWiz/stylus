"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, PanelLeftClose, PanelRightClose } from "lucide-react";
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
  tab,
  onTab,
  docked = false,
  side = "right",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  tab?: "INSPECTOR" | "OUTLINE";
  onTab?: (tab: "INSPECTOR" | "OUTLINE") => void;
  docked?: boolean;
  side?: "left" | "right";
}) {
  const desktop = useBoardDesktop();
  if (desktop && docked) {
    const Collapse = side === "left" ? PanelLeftClose : PanelRightClose;
    return (
      <aside
        aria-label={title}
        data-board-panel={side}
        className={`bg-background flex min-h-0 shrink-0 flex-col ${side === "left" ? "w-64 border-r" : "w-72 border-l"}`}
      >
        <header className="flex min-h-12 shrink-0 items-center justify-between border-b px-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button
            aria-label={`Collapse ${title.toLowerCase()}`}
            title={`Collapse ${title}`}
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <Collapse aria-hidden className="size-4" />
          </Button>
        </header>
        <div
          data-board-scroll
          className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {children}
        </div>
      </aside>
    );
  }
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
          aria-describedby={undefined}
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
          {onTab ? (
            <div
              role="tablist"
              aria-label="Board panels"
              className="flex border-b px-2"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  onTab(tab === "OUTLINE" ? "INSPECTOR" : "OUTLINE");
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLElement>(
                        "[role=tab][aria-selected=true]",
                      )
                      ?.focus(),
                  );
                }
              }}
            >
              {(
                [
                  ["OUTLINE", "Layers"],
                  ["INSPECTOR", "Properties"],
                ] as const
              ).map(([value, label]) => (
                <button
                  role="tab"
                  id={`board-tab-${value}`}
                  aria-controls={`board-panel-${value}`}
                  type="button"
                  key={value}
                  aria-selected={tab === value}
                  tabIndex={tab === value ? 0 : -1}
                  className="aria-selected:border-primary aria-selected:text-primary min-h-10 flex-1 border-b-2 px-3 text-sm"
                  onClick={() => onTab(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div
            data-board-scroll
            role={tab ? "tabpanel" : undefined}
            id={tab ? `board-panel-${tab}` : undefined}
            aria-labelledby={tab ? `board-tab-${tab}` : undefined}
            className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
