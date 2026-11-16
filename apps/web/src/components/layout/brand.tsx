import { BrandLogo } from "./brand-logo";
import Link from "next/link";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      className={
        collapsed
          ? "flex h-12 shrink-0 items-center justify-center"
          : "flex h-12 shrink-0 items-center gap-2.5 px-4 [&_.brand-wordmark]:w-28"
      }
      href="/"
      aria-label="Stylus home"
    >
      <BrandLogo mark={collapsed} />
      <span className="sr-only">Stylus</span>
    </Link>
  );
}
