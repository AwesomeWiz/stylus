"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import styles from "./landing.module.css";

export type WalkthroughStep = {
  id: string;
  label: string;
  title: string;
  icon: ReactNode;
  panel: ReactNode;
};

export function StepNavigation({ steps }: { steps: WalkthroughStep[] }) {
  const root = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const [ready, setReady] = useState(false);
  const manual = useRef(false);
  const [{ active, outgoing }, setSelection] = useState({
    active: steps[0]!.id,
    outgoing: "",
  });
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    function invalidatePendingSelection() {
      revision.current += 1;
    }
    function readFragment() {
      invalidatePendingSelection();
      const hash = location.hash.slice(1);
      const source = hash === "EVID-1";
      const id = steps.find((step) => step.id + "-panel" === hash)?.id;
      manual.current = Boolean(source || id);
      setSelection({ active: id ?? steps[0]!.id, outgoing: "" });
      setHighlight(source);
    }
    // Let the initial document fragment select the server-rendered panel first.
    const frame = requestAnimationFrame(() => {
      readFragment();
      setReady(true);
    });
    window.addEventListener("hashchange", readFragment);
    const container = root.current!;
    // Decode the phone or desktop picture actually selected by the browser.
    const prepare = () => {
      for (const image of container.querySelectorAll("picture img")) {
        if (image instanceof HTMLImageElement) {
          image.loading = "eager";
          void image.decode().catch(() => {});
        }
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prepare();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    const observe = () => observer.observe(container);
    if (document.readyState === "complete") observe();
    else window.addEventListener("load", observe, { once: true });
    return () => {
      invalidatePendingSelection();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("load", observe);
      window.removeEventListener("hashchange", readFragment);
    };
  }, [steps]);

  async function select(id: string, source = false, fromScroll = false) {
    if (!fromScroll) manual.current = true;
    const ticket = ++revision.current;
    const panel = document.getElementById(id + "-panel");
    const image = panel?.querySelector("img");
    if (image) {
      image.loading = "eager";
      // Keep the previous text and image visible during a cold or slow request.
      try {
        await image.decode();
      } catch {
        /* The descriptive alt text remains available. */
      }
    }
    if (ticket !== revision.current) return;
    setHighlight(source);
    if (
      fromScroll &&
      !panel?.contains(document.activeElement) &&
      root.current?.querySelector('[role="tabpanel"] :focus')
    ) {
      document.getElementById(id + "-tab")?.focus({ preventScroll: true });
    }
    setSelection((current) =>
      current.active === id
        ? current
        : { active: id, outgoing: current.active },
    );
  }

  useEffect(() => {
    if (!highlight) return;
    // Focus after the incoming panel has become visible and interactive.
    const frame = requestAnimationFrame(() =>
      document.getElementById("EVID-1")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [highlight]);

  const followScroll = useEffectEvent((index: number) => {
    void select(steps[index]!.id, false, true);
  });

  useEffect(() => {
    const scene = root.current!;
    const layout = matchMedia(
      "(min-width: 960px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)",
    );
    let previous = -1;
    function update() {
      if (!layout.matches || manual.current) return;
      const stage = scene.querySelector<HTMLElement>("[data-stage]");
      if (!stage) return;
      const top = scene.getBoundingClientRect().top;
      const travel = scene.offsetHeight - stage.offsetHeight;
      if (travel <= 0) return;
      const index = Math.min(
        steps.length - 1,
        Math.max(0, Math.round(((32 - top) / travel) * (steps.length - 1))),
      );
      if (index !== previous) {
        previous = index;
        followScroll(index);
      }
    }
    function resume() {
      if (manual.current) {
        manual.current = false;
        previous = -1;
      }
    }
    function scrollKey(event: globalThis.KeyboardEvent) {
      if (
        ["PageUp", "PageDown", "ArrowDown", "ArrowUp", " "].includes(
          event.key,
        ) ||
        (!scene.contains(event.target as Node) &&
          ["Home", "End"].includes(event.key))
      )
        resume();
    }
    function pointerDown(event: PointerEvent) {
      if (!scene.contains(event.target as Node)) resume();
    }
    function settle() {
      ++revision.current;
      previous = -1;
      manual.current = true;
      setSelection((current) => ({ active: current.active, outgoing: "" }));
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        update();
        window.addEventListener("scroll", update, { passive: true });
      } else {
        window.removeEventListener("scroll", update);
      }
    });
    observer.observe(scene);
    window.addEventListener("wheel", resume, { passive: true });
    window.addEventListener("touchmove", resume, { passive: true });
    window.addEventListener("pointerdown", pointerDown);
    window.addEventListener("keydown", scrollKey);
    window.addEventListener("pagehide", settle);
    layout.addEventListener("change", settle);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("wheel", resume);
      window.removeEventListener("touchmove", resume);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("keydown", scrollKey);
      window.removeEventListener("pagehide", settle);
      layout.removeEventListener("change", settle);
    };
  }, [steps]);

  function navigate(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % steps.length,
      ArrowLeft: (index + steps.length - 1) % steps.length,
      Home: 0,
      End: steps.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const id = steps[next]!.id;
    document.getElementById(id + "-tab")?.focus();
    void select(id);
  }

  return (
    <div
      className={styles.steps}
      ref={root}
      data-ready={ready || undefined}
      data-source={highlight || undefined}
      onClick={(event) => {
        if (
          !ready ||
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (
          event.target instanceof Element &&
          event.target.closest('a[href="#EVID-1"]')
        ) {
          event.preventDefault();
          void select("evidence", true);
        }
      }}
    >
      <nav
        className={styles.stepList}
        role={ready ? "tablist" : undefined}
        aria-label="Walkthrough steps"
      >
        {steps.map(({ id, label, icon, title }, i) => (
          <a
            id={id + "-tab"}
            key={id}
            href={"#" + id + "-panel"}
            className={styles.step}
            role={ready ? "tab" : undefined}
            aria-label={label}
            aria-controls={ready ? id + "-panel" : undefined}
            aria-selected={ready ? active === id : undefined}
            tabIndex={ready && active !== id ? -1 : undefined}
            onKeyDown={(event) => navigate(event, i)}
            onClick={(event) => {
              if (
                !ready ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              void select(id);
            }}
          >
            {icon}
            <span>
              {label}
              <small className={styles.chapter} aria-hidden="true">
                {title}
              </small>
            </span>
          </a>
        ))}
      </nav>
      <div className={styles.panels} data-stage>
        {steps.map(({ id, panel }) => (
          <section
            key={id}
            id={id + "-panel"}
            role={ready ? "tabpanel" : undefined}
            aria-labelledby={id + "-tab"}
            tabIndex={-1}
            data-selected={active === id || undefined}
            data-outgoing={outgoing === id || undefined}
            inert={ready && active !== id}
            className={styles.stepPanel}
          >
            {panel}
          </section>
        ))}
      </div>
    </div>
  );
}
