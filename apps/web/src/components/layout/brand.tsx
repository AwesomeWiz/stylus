import { Layers3 } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link
      className="flex h-16 items-center gap-2.5 px-4"
      href="/"
      aria-label="Stylus home"
    >
      <span className="bg-primary text-primary-foreground inline-flex size-8 items-center justify-center rounded-md">
        <Layers3 aria-hidden="true" className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="text-sidebar-foreground text-[15px] font-semibold tracking-tight">
        Stylus
      </span>
    </Link>
  );
}
