"use client";

import Link, { useLinkStatus } from "next/link";
import type { Route } from "next";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span role="status" className="ml-auto inline-flex items-center">
      <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      <span className="sr-only">Loading destination</span>
    </span>
  ) : null;
}

export function NavigationLink({
  href,
  children,
  className,
  current,
  onNavigate,
  label,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  current?: boolean;
  onNavigate?: () => void;
  label?: string;
}) {
  return (
    <Link
      href={href as Route}
      className={className}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      onNavigate={onNavigate}
    >
      {children}
      <Pending />
    </Link>
  );
}
