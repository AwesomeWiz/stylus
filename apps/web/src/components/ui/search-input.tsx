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
        className="border-input bg-card placeholder:text-muted-foreground focus:border-ring focus:ring-ring/15 h-10 w-full rounded-full border pr-4 pl-10 text-sm shadow-sm transition-[border-color,box-shadow] focus:ring-3 focus:outline-none"
        placeholder="Search Stylus"
        type="search"
        {...props}
      />
    </label>
  );
}
