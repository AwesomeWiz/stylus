import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBoardEvent } from "./use-board-event";
describe("committed Board event callbacks", () => {
  it("retains identity while respecting the latest role and selected object", () => {
    const mutate = vi.fn();
    const view = renderHook(
      ({ allowed, selected }) =>
        useBoardEvent((value: number) => {
          if (allowed) mutate(selected, value);
          return selected;
        }),
      { initialProps: { allowed: true, selected: "first" } },
    );
    const event = view.result.current;
    expect(mutate).not.toHaveBeenCalled();
    expect(event(1)).toBe("first");
    view.rerender({ allowed: false, selected: "second" });
    expect(view.result.current).toBe(event);
    expect(event(2)).toBe("second");
    expect(mutate).toHaveBeenCalledOnce();
    view.rerender({ allowed: true, selected: "third" });
    event(3);
    expect(mutate).toHaveBeenLastCalledWith("third", 3);
  });
});
