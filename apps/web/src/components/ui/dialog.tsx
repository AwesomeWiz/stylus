"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  mobileSheet?: boolean;
  className?: string;
}

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title,
  mobileSheet = false,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <DialogPrimitive.Content
          className={cn(
            "bg-background fixed z-50 max-h-[92dvh] overflow-y-auto border shadow-xl focus:outline-none",
            mobileSheet
              ? "inset-x-0 bottom-0 w-full rounded-t-xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[min(42rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl"
              : "top-1/2 left-1/2 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl",
            className,
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-inherit px-5 py-5 sm:px-6">
            <div>
              <DialogPrimitive.Title className="font-semibold tracking-tight">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground mt-1 text-sm">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md">
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
