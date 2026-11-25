"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function RevealFigure({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const figure = ref.current!;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        figure.dataset.revealed = "true";
      },
      { threshold: 0.12 },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  return <figure ref={ref}>{children}</figure>;
}
