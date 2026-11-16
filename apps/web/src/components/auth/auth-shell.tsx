import { BrandLogo } from "@/components/layout/brand-logo";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AuthVisual } from "./auth-visual";
import { AuthVisualAccent, AuthVisualArtwork } from "./auth-visual-artwork";
import styles from "./auth-visual.module.css";

interface AuthShellProps {
  children: ReactNode;
  description?: string;
  title: string;
  showcase?: boolean;
}
export function AuthShell({
  children,
  description,
  title,
  showcase = false,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "bg-background min-h-dvh",
        styles.shell,
        showcase ? styles.showcase : "flex items-center justify-center",
      )}
    >
      {showcase ? (
        <aside aria-label="Stylus identity" className={styles.visual}>
          <AuthVisual>
            <AuthVisualArtwork />
          </AuthVisual>
          <div className={styles.caption}>
            <p className={styles.eyebrow}>A workspace for startup work</p>
            <h2 className={styles.headline}>
              Think clearly.
              <br />
              Build together.
            </h2>
            <p className={styles.support}>
              Bring your ideas, your people and your next move together.
            </p>
          </div>
        </aside>
      ) : null}
      <div className="flex min-h-dvh min-w-0 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[25rem]">
          <div className="mb-10 flex items-center gap-4">
            <Link
              href="/"
              aria-label="Stylus home"
              className="inline-flex min-h-10 items-center gap-2.5"
            >
              <BrandLogo />
            </Link>
            {showcase ? <AuthVisualAccent /> : null}
          </div>
          <header className="mb-7">
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {description}
              </p>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
