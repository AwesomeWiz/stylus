"use client";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";
type Navigation = {
  flush: () => Promise<boolean>;
  register: (flush: () => Promise<boolean>) => () => void;
};
const Context = createContext<Navigation | null>(null);
export function OnboardingNavigation({ children }: { children: ReactNode }) {
  const active = useRef<(() => Promise<boolean>) | null>(null),
    register = useCallback((flush: () => Promise<boolean>) => {
      active.current = flush;
      return () => {
        if (active.current === flush) active.current = null;
      };
    }, []),
    flush = useCallback(
      async () => (active.current ? active.current() : true),
      [],
    ),
    value = useMemo(() => ({ register, flush }), [register, flush]);
  return <Context value={value}>{children}</Context>;
}
export function useOnboardingNavigation() {
  return useContext(Context);
}
export function OnboardingLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const nav = useOnboardingNavigation(),
    router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      onClick={async (e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          !nav
        )
          return;
        e.preventDefault();
        if (await nav.flush()) router.push(href as Route);
      }}
    />
  );
}
