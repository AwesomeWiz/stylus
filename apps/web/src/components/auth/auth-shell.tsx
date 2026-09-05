import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  title: string;
}

export function AuthShell({ children, description, title }: AuthShellProps) {
  return (
    <main className="bg-pastel-lilac relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="bg-primary-subtle absolute inset-x-0 top-0 h-1"
      />
      <div className="bg-background border-pastel-lilac-border w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
        <Link
          aria-label="Stylus home"
          className="mb-8 inline-flex items-center gap-2.5"
          href="/"
        >
          <Image
            alt=""
            className="size-10 object-contain"
            height={40}
            priority
            src="/brand/stylus-mark.png"
            width={40}
          />
          <span className="text-base font-semibold tracking-tight">Stylus</span>
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
