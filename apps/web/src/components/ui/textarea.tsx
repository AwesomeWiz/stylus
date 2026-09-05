import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/15 min-h-28 w-full resize-y rounded-lg border px-3.5 py-3 text-[15px] leading-6 transition-[border-color,box-shadow] focus:ring-3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
