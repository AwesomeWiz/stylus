"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBoardEvent } from "./use-board-event";
export function BoardPresentation({
  title,
  index,
  count,
  notice,
  onMove,
  onExit,
}: {
  title: string;
  index: number;
  count: number;
  notice: string | null;
  onMove: (delta: number) => void;
  onExit: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false),
    [error, setError] = useState<string | null>(null),
    owned = useRef(false);
  const exitPresentation = useBoardEvent(onExit);
  useEffect(() => {
    function change() {
      const active =
        !!document.fullscreenElement?.matches("[data-board-shell]");
      setFullscreen(active);
      if (owned.current && !active) {
        owned.current = false;
        exitPresentation();
      }
    }
    document.addEventListener("fullscreenchange", change);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      if (owned.current && document.fullscreenElement) {
        owned.current = false;
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, [exitPresentation]);
  async function exit() {
    if (owned.current && document.fullscreenElement) {
      owned.current = false;
      try {
        await document.exitFullscreen();
      } catch {}
    }
    onExit();
  }
  return (
    <>
      <header
        className="bg-background z-30 flex min-h-14 items-center gap-2 border-b px-3"
        aria-label="Presentation controls"
      >
        <h1
          className="min-w-0 flex-1 truncate text-sm font-semibold"
          title={title}
        >
          {title}
        </h1>
        <span
          className="shrink-0 text-xs tabular-nums"
          aria-label="Presentation progress"
        >
          {index + 1} / {count}
        </span>
        {!fullscreen ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fullscreen presentation"
            title="Fullscreen"
            onClick={async () => {
              const root =
                document.querySelector<HTMLElement>("[data-board-shell]");
              try {
                if (!root?.requestFullscreen) throw Error();
                await root.requestFullscreen();
                owned.current = true;
                setFullscreen(true);
                setError(null);
              } catch {
                setError(
                  "Fullscreen is unavailable. Presentation still works in this window.",
                );
              }
            }}
          >
            <Maximize aria-hidden className="size-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          aria-label="Exit presentation"
          onClick={() => void exit()}
        >
          <X aria-hidden className="size-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </header>
      <nav
        aria-label="Presentation navigation"
        className="bg-background absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded border p-2"
      >
        <Button
          variant="ghost"
          aria-label="Previous Section"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {index + 1} / {count}
        </span>
        <Button
          variant="ghost"
          aria-label="Next Section"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </nav>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {title}. Section {index + 1} of {count}. {notice}
      </p>
      {error || notice ? (
        <p
          role="status"
          className="bg-background absolute top-16 left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded border px-3 py-2 text-xs"
        >
          {error ?? notice}
        </p>
      ) : null}
    </>
  );
}
