"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./landing.module.css";
export function HeroPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const figure = ref.current!;
    const image = Array.from(figure.querySelectorAll("img")).find(
      (image) => image.getClientRects().length,
    );
    let mounted = true;
    image?.decode().then(
      () => {
        if (mounted) figure.dataset.enter = "true";
      },
      () => {},
    );
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <figure className={styles.heroFigure} ref={ref}>
      {children}
    </figure>
  );
}
