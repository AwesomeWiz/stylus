"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./auth-visual.module.css";

/** Decorative, finite local animation. Pointer coordinates never leave this effect. */
export function AuthVisual({ children }: { children: ReactNode }) {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = surface.current;
    if (!node || !window.matchMedia) return;
    const preference = window.matchMedia(
      "(min-width: 1200px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const tiles = [
      ...node.querySelectorAll<HTMLElement>("[data-auth-tile]"),
    ].map((element) => ({
      element,
      x: 0,
      y: 0,
      lift: 0,
      tx: 0,
      ty: 0,
      target: 0,
    }));
    let frame = 0,
      previousTime = 0;
    let bounds: DOMRect | null = null;
    let enabled = false;
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      bounds = null;
      for (const tile of tiles) {
        Object.assign(tile, { x: 0, y: 0, lift: 0, tx: 0, ty: 0, target: 0 });
        for (const key of ["--tile-x", "--tile-y", "--tile-lift"])
          tile.element.style.removeProperty(key);
      }
    }
    function step(time: number) {
      const delta = previousTime ? Math.min(time - previousTime, 48) : 16;
      previousTime = time;
      const ease = 1 - Math.exp(-delta / 100);
      let moving = false;
      for (const tile of tiles) {
        for (const [current, target] of [
          ["x", "tx"],
          ["y", "ty"],
          ["lift", "target"],
        ] as const) {
          tile[current] += (tile[target] - tile[current]) * ease;
          if (Math.abs(tile[target] - tile[current]) > 0.001) moving = true;
          else tile[current] = tile[target];
        }
        tile.element.style.setProperty("--tile-x", tile.x.toFixed(4));
        tile.element.style.setProperty("--tile-y", tile.y.toFixed(4));
        tile.element.style.setProperty("--tile-lift", tile.lift.toFixed(4));
      }
      frame = moving ? requestAnimationFrame(step) : 0;
      if (!frame) previousTime = 0;
    }
    function animate() {
      if (!frame) frame = requestAnimationFrame(step);
    }
    function move(event: PointerEvent) {
      if (!enabled || event.pointerType === "touch") return;
      bounds ??= node!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - bounds.left) / bounds.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - bounds.top) / bounds.height),
      );
      for (const tile of tiles) {
        const dx = x * 6 - (Number(tile.element.dataset.column) + 0.5);
        const dy =
          ((y - (Number(tile.element.dataset.row) + 0.5) / 8) * bounds.height) /
          (bounds.width / 6);
        const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / 2.2) ** 2;
        tile.target = falloff;
        tile.tx = Math.max(-1, Math.min(1, dx)) * falloff;
        tile.ty = Math.max(-1, Math.min(1, dy)) * falloff;
      }
      animate();
    }
    function leave() {
      bounds = null;
      for (const tile of tiles)
        Object.assign(tile, { tx: 0, ty: 0, target: 0 });
      if (enabled) animate();
    }
    function sync() {
      enabled = preference.matches && document.visibilityState === "visible";
      stop();
    }
    node.addEventListener("pointerenter", move, { passive: true });
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", leave, { passive: true });
    window.addEventListener("resize", leave, { passive: true });
    window.addEventListener("scroll", leave, { passive: true, capture: true });
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      stop();
      node.removeEventListener("pointerenter", move);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", leave);
      window.removeEventListener("scroll", leave, true);
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
