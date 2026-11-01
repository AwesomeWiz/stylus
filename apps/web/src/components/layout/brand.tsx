import Image from "next/image";
import Link from "next/link";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      className={
        collapsed
          ? "flex h-12 shrink-0 items-center justify-center"
          : "flex h-12 shrink-0 items-center gap-2.5 px-4"
      }
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
      <span
        className={
          collapsed
            ? "sr-only"
            : "text-sidebar-foreground text-[15px] font-semibold tracking-tight"
        }
      >
        Stylus
      </span>
    </Link>
  );
}
