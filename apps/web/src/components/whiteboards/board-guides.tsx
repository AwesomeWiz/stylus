import type { SmartGuide } from "@/modules/whiteboards/guides";
export function BoardGuides({
  guides,
  viewport,
  spacing,
}: {
  guides: SmartGuide[];
  viewport: { x: number; y: number; zoom: number };
  spacing: { x: number; y: number; gap: number } | null;
}) {
  return (
    <svg
      aria-hidden
      data-board-guides
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-hidden"
    >
      <g
        transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
        stroke="var(--primary)"
        fill="var(--primary)"
      >
        {guides.map((g, i) => (
          <line
            key={i}
            x1={g.axis === "x" ? g.value : g.from}
            x2={g.axis === "x" ? g.value : g.to}
            y1={g.axis === "y" ? g.value : g.from}
            y2={g.axis === "y" ? g.value : g.to}
            strokeWidth={1 / viewport.zoom}
          />
        ))}
        {spacing ? (
          <text
            x={spacing.x}
            y={spacing.y}
            fontSize={12 / viewport.zoom}
            stroke="none"
            textAnchor="middle"
          >
            {Math.round(spacing.gap)} · equal gaps
          </text>
        ) : null}
      </g>
    </svg>
  );
}
