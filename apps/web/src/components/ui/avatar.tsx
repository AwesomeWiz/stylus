import { cn } from "@/lib/utils";

interface AvatarProps {
  fallback: string;
  className?: string;
}

export function Avatar({ fallback, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary/10 text-primary inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        className,
      )}
    >
      {fallback}
    </span>
  );
}
