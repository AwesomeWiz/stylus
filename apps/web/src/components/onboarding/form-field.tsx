import type { ReactNode, SelectHTMLAttributes } from "react";

export function FormField({
  children,
  description,
  error,
  label,
  name,
  required,
}: {
  children: ReactNode;
  description?: string;
  error?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  const descriptionId = description ? `${name}-description` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" htmlFor={name}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {description ? (
        <p
          className="text-muted-foreground text-xs leading-5"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}
      <div
        aria-describedby={
          [descriptionId, errorId].filter(Boolean).join(" ") || undefined
        }
      >
        {children}
      </div>
      {error ? (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="border-input bg-background focus:border-ring h-10 w-full rounded-md border px-3 text-sm focus:outline-none"
      {...props}
    >
      {children}
    </select>
  );
}
