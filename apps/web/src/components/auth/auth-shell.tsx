import { Layers3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  title: string;
}

export function AuthShell({ children, description, title }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm">
        <Link
          aria-label="Stylus home"
          className="mb-8 inline-flex items-center gap-2.5"
          href="/"
        >
          <span className="bg-primary text-primary-foreground inline-flex size-8 items-center justify-center rounded-md">
            <Layers3
              aria-hidden="true"
              className="size-[18px]"
              strokeWidth={2.2}
            />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Stylus
          </span>
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        </header>

        {children}
      </div>
    </main>
  );
}
