"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DialogProps {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <DialogPrimitive.Content className="bg-background fixed top-1/2 left-1/2 z-50 max-h-[92vh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border shadow-xl focus:outline-none">
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
