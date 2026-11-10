"use client";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { useOnboardingDraft, useOnboardingErrors } from "./draft-context";

export function FormField({
  children,
  description,
  error: providedError,
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
  const errors = useOnboardingErrors(),
    error = providedError ?? errors?.[name]?.[0];
  const descriptionId = description ? `${name}-description` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const draft = useOnboardingDraft();
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        "aria-describedby":
          [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": !!error || undefined,
        "aria-required": required || undefined,
        ...(draft?.[name] && !("value" in children.props)
          ? { defaultValue: draft[name][0] ?? "" }
          : {}),
      })
    : children;
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
        {control}
      </div>
      {error ? (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Select } from "@/components/ui/select";
