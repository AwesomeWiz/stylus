"use client";
import { useCallback, useLayoutEffect, useRef } from "react";

/** Stable event identity with the latest committed closure, never render-time reads. */
export function useBoardEvent<Args extends unknown[], Result>(
  handler: (...args: Args) => Result,
) {
  const current = useRef(handler);
  useLayoutEffect(() => {
    current.current = handler;
  }, [handler]);
  return useCallback((...args: Args) => current.current(...args), []);
}
