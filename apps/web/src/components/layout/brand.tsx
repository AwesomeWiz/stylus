import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link
      className="flex h-16 items-center gap-2.5 px-4"
      href="/"
      aria-label="Stylus home"
    >
      <Image
        alt=""
        className="size-8 object-contain"
        height={32}
        priority
        src="/brand/stylus-mark.png"
        width={32}
      />
      <span className="text-sidebar-foreground text-[15px] font-semibold tracking-tight">
        Stylus
      </span>
    </Link>
  );
}
