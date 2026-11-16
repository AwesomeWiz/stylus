import {
  boardTemplates,
  type BoardTemplate,
} from "@/modules/whiteboards/templates";

function TemplatePreview({ template }: { template: BoardTemplate }) {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground h-12 w-full"
      viewBox="0 0 180 60"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="178"
        height="58"
        rx="3"
        fill="var(--background)"
        stroke="var(--border)"
      />
      {template.sections.map((name, i) => (
        <g key={name}>
          <rect
            x={8 + (i % 3) * 56}
            y={6 + Math.floor(i / 3) * 26}
            width="50"
            height="22"
            rx="1"
            fill={
              i === 0
                ? "var(--primary-subtle)"
                : i === 1
                  ? "var(--pastel-coral)"
                  : "var(--muted)"
            }
            stroke="currentColor"
            strokeWidth=".5"
          />
          <path
            d={`M${13 + (i % 3) * 56} ${12 + Math.floor(i / 3) * 26}h20`}
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  );
}
export function BoardTemplateChooser() {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Starting template</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {boardTemplates.map((template) => (
          <label
            className="has-checked:border-primary has-checked:bg-primary/5 cursor-pointer rounded-md border p-3"
            key={template.key}
          >
            <div className="mb-2 flex items-center gap-2">
              <input
                defaultChecked={template.key === "blank"}
                name="template"
                type="radio"
                value={template.key}
              />
              <span className="text-sm font-medium">{template.name}</span>
            </div>
            <TemplatePreview template={template} />
            <span className="text-muted-foreground mt-2 block text-xs leading-5">
              {template.purpose}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
