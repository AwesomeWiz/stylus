"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface SheetProps {
  children: ReactNode;
  trigger: ReactNode;
  title: string;
}

export function Sheet({ children, trigger, title }: SheetProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content className="bg-sidebar fixed inset-y-0 left-0 z-50 w-[min(19rem,88vw)] border-r shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a destination in the Stylus workspace.
          </Dialog.Description>
          <Dialog.Close className="text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close navigation</span>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
