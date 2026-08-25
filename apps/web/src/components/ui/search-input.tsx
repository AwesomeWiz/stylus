import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">Search</span>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        className="border-input bg-background placeholder:text-muted-foreground focus:border-ring h-9 w-full rounded-md border pr-3 pl-9 text-sm transition-colors focus:outline-none"
        placeholder="Search Stylus"
        type="search"
        {...props}
      />
    </label>
  );
}
