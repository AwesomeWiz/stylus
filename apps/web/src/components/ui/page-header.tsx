import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow = "Workspace",
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-primary mb-1.5 text-xs font-semibold tracking-[0.12em] uppercase">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
