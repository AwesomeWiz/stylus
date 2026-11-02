"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./auth-visual.module.css";

/** Decorative only. No account, application state, persistence or network input. */
export function AuthVisual({ children }: { children: ReactNode }) {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = surface.current;
    if (!node || !window.matchMedia) return;
    const preference = window.matchMedia(
      "(min-width: 1200px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    let previousTime = 0;
    let bounds: DOMRect | null = null;
    let inside = false;
    let enabled = false;
    let revealX = 50;
    let revealY = 40;
    const current = { x: 0, y: 0, reveal: 0 };
    const target = { x: 0, y: 0, reveal: 0 };

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      bounds = null;
      inside = false;
      Object.assign(current, { x: 0, y: 0, reveal: 0 });
      Object.assign(target, current);
      node!.style.removeProperty("--auth-x");
      node!.style.removeProperty("--auth-y");
      node!.style.removeProperty("--auth-reveal");
      node!.style.removeProperty("--auth-reveal-x");
      node!.style.removeProperty("--auth-reveal-y");
    }
    function step(time: number) {
      const delta = previousTime ? Math.min(time - previousTime, 48) : 16;
      previousTime = time;
      const smoothing = 1 - Math.exp(-delta / 85);
      let moving = false;
      for (const key of ["x", "y", "reveal"] as const) {
        current[key] += (target[key] - current[key]) * smoothing;
        if (Math.abs(target[key] - current[key]) > 0.001) moving = true;
        else current[key] = target[key];
      }
      node!.style.setProperty("--auth-x", current.x.toFixed(4));
      node!.style.setProperty("--auth-y", current.y.toFixed(4));
      node!.style.setProperty("--auth-reveal", current.reveal.toFixed(4));
      node!.style.setProperty("--auth-reveal-x", `${revealX.toFixed(2)}%`);
      node!.style.setProperty("--auth-reveal-y", `${revealY.toFixed(2)}%`);
      frame = moving ? requestAnimationFrame(step) : 0;
      if (!frame) previousTime = 0;
    }
    function animate() {
      if (!frame) frame = requestAnimationFrame(step);
    }
    function move(event: PointerEvent) {
      if (!enabled || event.pointerType === "touch") return;
      // Read geometry on entry/after a viewport change, never in the frame loop.
      bounds ??= node!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      inside = true;
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - bounds.left) / bounds.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - bounds.top) / bounds.height),
      );
      target.x = x * 2 - 1;
      target.y = y * 2 - 1;
      target.reveal = 1;
      revealX = x * 100;
      revealY = y * 100;
      animate();
    }
    function leave() {
      inside = false;
      bounds = null;
      Object.assign(target, { x: 0, y: 0, reveal: 0 });
      if (enabled) animate();
    }
    function invalidateBounds() {
      bounds = null;
      if (inside) leave();
    }
    function sync() {
      enabled = preference.matches && document.visibilityState === "visible";
      stop();
    }
    node.addEventListener("pointerenter", move, { passive: true });
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", leave, { passive: true });
    window.addEventListener("resize", invalidateBounds, { passive: true });
    window.addEventListener("scroll", invalidateBounds, {
      passive: true,
      capture: true,
    });
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      stop();
      node.removeEventListener("pointerenter", move);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", invalidateBounds);
      window.removeEventListener("scroll", invalidateBounds, true);
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <div aria-hidden="true" className={styles.artwork} ref={surface}>
      {children}
    </div>
  );
}
