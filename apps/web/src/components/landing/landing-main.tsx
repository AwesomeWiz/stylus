"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingMain({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const main = ref.current!;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const hero = main.querySelector<HTMLElement>(`.${styles.heroCopy}`)!;
    const words = Array.from(
      hero.querySelectorAll<HTMLElement>(`.${styles.headlineWord}`),
    );

    // Read the browser's actual line breaks. The same selectable heading is
    // rendered on the server, with ordinary spaces between the words.
    function measureLines() {
      const lines = [...new Set(words.map((word) => word.offsetTop))];
      for (const word of words) {
        word.style.setProperty(
          "--line-delay",
          40 + lines.indexOf(word.offsetTop) * 45 + "ms",
        );
      }
      hero.style.setProperty("--after-title", 75 + lines.length * 45 + "ms");
    }
    function finishHero() {
      delete hero.dataset.enter;
    }
    if (!preference.matches) {
      measureLines();
      hero.dataset.enter = "true";
    }
    // A reflow during the short entrance settles straight to the final layout.
    window.addEventListener("resize", finishHero);
    window.addEventListener("pagehide", finishHero);
    document.fonts.addEventListener("loadingdone", finishHero);
    preference.addEventListener("change", finishHero);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!preference.matches) entry.target.setAttribute("data-arrive", "");
          observer.unobserve(entry.target);
        }
      }
    });
    main.querySelectorAll("h2").forEach((heading) => observer.observe(heading));
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", finishHero);
      window.removeEventListener("pagehide", finishHero);
      document.fonts.removeEventListener("loadingdone", finishHero);
      preference.removeEventListener("change", finishHero);
      finishHero();
    };
  }, []);
  return (
    <main ref={ref} id="content" tabIndex={-1}>
      {children}
    </main>
  );
}
