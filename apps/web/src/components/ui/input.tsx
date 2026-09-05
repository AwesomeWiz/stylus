import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/15 h-11 w-full rounded-lg border px-3.5 text-sm transition-[border-color,box-shadow] focus:ring-3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
