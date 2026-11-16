"use client";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, LayoutTemplate } from "lucide-react";
import { readBoardPreviewAction } from "@/modules/whiteboards/read-actions";
import { boardPaint } from "@/modules/whiteboards/elements";
export function BoardPreview({
  boardId,
  organizationId,
}: {
  boardId: string;
  organizationId: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<
    | Extract<
        Awaited<ReturnType<typeof readBoardPreviewAction>>,
        { status: "success" }
      >["rows"]
    | null
  >(null);
  useEffect(() => {
    let active = true,
      started = false;
    const load = () => {
      if (started) return;
      started = true;
      void readBoardPreviewAction({ boardId, organizationId })
        .then((r) => {
          if (active) setRows(r.status === "success" ? r.rows : []);
        })
        .catch(() => {
          if (active) setRows([]);
        });
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                load();
                observer?.disconnect();
              }
            },
            { rootMargin: "120px" },
          );
    if (observer && root.current) observer.observe(root.current);
    else load();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [boardId, organizationId]);
  if (!rows?.length)
    return (
      <div
        ref={root}
        aria-hidden
        className="bg-muted/40 flex h-40 items-center justify-center border-b [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]"
      >
        <LayoutTemplate className="text-muted-foreground size-7" />
      </div>
    );
  const boxes = rows.map((r) => ({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
    })),
    x = Math.min(...boxes.map((r) => r.x)) - 24,
    y = Math.min(...boxes.map((r) => r.y)) - 24,
    w = Math.max(...boxes.map((r) => r.x + r.width)) - x + 24,
    h = Math.max(...boxes.map((r) => r.y + r.height)) - y + 24;
  return (
    <div
      aria-hidden
      className="bg-background h-40 overflow-hidden border-b p-3"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${x} ${y} ${Math.max(100, w)} ${Math.max(100, h)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {rows.map((r) => (
          <g
            key={r.id}
            transform={`rotate(${r.rotation} ${r.x + r.width / 2} ${r.y + r.height / 2})`}
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              rx={
                r.element_type === "SHAPE" &&
                ["circle", "ellipse"].includes(String(r.content.shape))
                  ? Math.min(r.width, r.height) / 2
                  : 3
              }
              fill={
                r.element_type === "STICKY"
                  ? boardPaint(r.style.background, "#fef3c7")
                  : r.element_type === "SHAPE"
                    ? boardPaint(r.style.fill, "#e4e4e7")
                    : r.element_type === "SECTION" || r.element_type === "GROUP"
                      ? "none"
                      : "var(--muted)"
              }
              stroke="var(--muted-foreground)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {r.element_type === "IMAGE" ? (
              <ImageIcon
                x={r.x + r.width * 0.3}
                y={r.y + r.height * 0.3}
                width={r.width * 0.4}
                height={r.height * 0.4}
                color="var(--muted-foreground)"
              />
            ) : (
              <text
                x={r.x + 8}
                y={r.y + 22}
                fontSize="14"
                fill="var(--foreground)"
              >
                {String(
                  r.content.title ?? r.content.text ?? r.content.note ?? "",
                ).slice(0, 35)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
