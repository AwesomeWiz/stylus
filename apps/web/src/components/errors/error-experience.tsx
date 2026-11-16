import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import styles from "./error-experience.module.css";

/** Public fallback: no session, tenant reads, raw error text or remote artwork. */
export function ErrorExperience({
  kind,
  reset,
}: {
  kind: "missing" | "unexpected";
  reset?: () => void;
}) {
  const missing = kind === "missing";
  return (
    <div className={styles.page}>
      <a href="#error-main" className={styles.skip} tabIndex={0}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/" aria-label="Stylus home" className={styles.brand}>
          <BrandLogo mark />
          <span>Stylus</span>
        </Link>
      </header>
      <main id="error-main" className={styles.main} tabIndex={-1}>
        <div className={styles.art} aria-hidden="true" data-kind={kind}>
          <svg viewBox="0 0 360 200" fill="none">
            <path d="M54 68H170V136H260" className={styles.connector} />
            <rect
              x="36"
              y="40"
              width="92"
              height="58"
              rx="6"
              className={styles.card}
            />
            <path d="M51 58H99M51 70H82" className={styles.noteLines} />
            <rect
              x="230"
              y="113"
              width="50"
              height="50"
              rx="6"
              className={styles.outline}
            />
            <g className={styles.displaced}>
              <rect
                x="180"
                y="26"
                width="90"
                height="76"
                rx="4"
                className={styles.sticky}
              />
              <path
                d="M196 46H249M196 58H235M196 70H243"
                className={styles.noteLines}
              />
            </g>
            <circle cx="170" cy="136" r="4" className={styles.point} />
          </svg>
        </div>
        <p className={styles.eyebrow}>
          {missing ? "404 · Page not found" : "Unexpected error"}
        </p>
        <h1>
          {missing
            ? "This page isn’t on the board."
            : "Something slipped out of place."}
        </h1>
        <p className={styles.description}>
          {missing
            ? "The link may have moved, or the address may be incomplete. Head home to find your workspace."
            : "We couldn’t load this view. Try again, or return home and reopen your work."}
        </p>
        <div className={styles.actions}>
          {reset ? (
            <Button onClick={reset} className={styles.primary}>
              <RotateCcw aria-hidden="true" size={16} /> Try again
            </Button>
          ) : null}
          <Link href="/" className={reset ? styles.secondary : styles.primary}>
            {reset ? <ArrowLeft aria-hidden="true" size={16} /> : null}
            Go home
            {!reset ? <ArrowRight aria-hidden="true" size={16} /> : null}
          </Link>
        </div>
        <p className={styles.footer}>From evidence to execution.</p>
      </main>
    </div>
  );
}
