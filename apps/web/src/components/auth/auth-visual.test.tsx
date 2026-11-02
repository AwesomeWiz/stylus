import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthVisual } from "./auth-visual";

let allowed = true;
let mediaChanged: () => void;
let queue: Map<number, FrameRequestCallback>;
let clock: number;
let sequence: number;
const visibility = () => vi.spyOn(document, "visibilityState", "get");
function flush() {
  act(() => {
    for (let i = 0; i < 100 && queue.size; i++) {
      const frames = [...queue.values()];
      queue.clear();
      clock += 16;
      frames.forEach((frame) => frame(clock));
    }
  });
}
function pointer(node: Element, type: string, x = 480, y = 160) {
  act(() => {
    node.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));
  });
}
function mount() {
  const result = render(
    <AuthVisual>
      <svg aria-hidden="true" />
    </AuthVisual>,
  );
  const node = result.container.firstElementChild as HTMLElement;
  const geometry = vi
    .spyOn(node, "getBoundingClientRect")
    .mockReturnValue({ left: 0, top: 0, width: 600, height: 400 } as DOMRect);
  return { ...result, node, geometry };
}
beforeEach(() => {
  allowed = true;
  sequence = 0;
  clock = 0;
  queue = new Map();
  visibility().mockReturnValue("visible");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return allowed;
      },
      addEventListener: (_event: string, callback: () => void) => {
        mediaChanged = callback;
      },
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queue.set(++sequence, callback);
      return sequence;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => queue.delete(id)),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("decorative auth interaction lifecycle", () => {
  it("leaves the static artwork intact when media-query support is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { node } = mount();
    pointer(node, "pointerenter");
    expect(queue.size).toBe(0);
    expect(node.querySelector("svg")).toBeInTheDocument();
  });
  it("is inert for reduced-motion, small-screen or coarse-pointer media", () => {
    allowed = false;
    const { node, geometry } = mount();
    pointer(node, "pointerenter");
    pointer(node, "pointermove");
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(geometry).not.toHaveBeenCalled();
    expect(node).toHaveAttribute("aria-hidden", "true");
    expect(node).not.toHaveAttribute("tabindex");
  });
  it("batches normalized movement, reveals locally, then settles without an idle loop", () => {
    const { node, geometry } = mount();
    pointer(node, "pointerenter");
    for (let i = 0; i < 20; i++) pointer(node, "pointermove");
    expect(queue.size).toBe(1);
    flush();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(Number(node.style.getPropertyValue("--auth-x"))).toBeCloseTo(0.6);
    expect(Number(node.style.getPropertyValue("--auth-y"))).toBeCloseTo(-0.2);
    expect(node.style.getPropertyValue("--auth-reveal-x")).toBe("80.00%");
    expect(Number(node.style.getPropertyValue("--auth-reveal"))).toBe(1);
    expect(queue.size).toBe(0);
    pointer(node, "pointerleave");
    flush();
    expect(Number(node.style.getPropertyValue("--auth-x"))).toBe(0);
    expect(Number(node.style.getPropertyValue("--auth-reveal"))).toBe(0);
    expect(queue.size).toBe(0);
  });
  it("does not rerender React children while the pointer moves", () => {
    const draw = vi.fn();
    function Artwork() {
      draw();
      return <svg aria-hidden="true" />;
    }
    const { container } = render(
      <AuthVisual>
        <Artwork />
      </AuthVisual>,
    );
    const node = container.firstElementChild as HTMLElement;
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 400,
    } as DOMRect);
    const initial = draw.mock.calls.length;
    pointer(node, "pointerenter");
    flush();
    pointer(node, "pointerleave");
    flush();
    expect(draw).toHaveBeenCalledTimes(initial);
  });
  it("stops and resets immediately when motion preferences or visibility change", () => {
    const { node } = mount();
    pointer(node, "pointerenter");
    flush();
    allowed = false;
    act(() => mediaChanged());
    expect(node.style.getPropertyValue("--auth-x")).toBe("");
    pointer(node, "pointermove");
    expect(queue.size).toBe(0);
    allowed = true;
    act(() => mediaChanged());
    pointer(node, "pointermove");
    expect(queue.size).toBe(1);
    visibility().mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(queue.size).toBe(0);
    expect(node.style.getPropertyValue("--auth-reveal")).toBe("");
  });
  it("invalidates geometry on resize and cleans up pending frames/listeners", () => {
    const { node, geometry, unmount } = mount();
    pointer(node, "pointerenter");
    flush();
    act(() => window.dispatchEvent(new Event("resize")));
    pointer(node, "pointermove", 900, -10);
    flush();
    expect(geometry).toHaveBeenCalledTimes(2);
    expect(Number(node.style.getPropertyValue("--auth-x"))).toBe(1);
    expect(Number(node.style.getPropertyValue("--auth-y"))).toBe(-1);
    pointer(node, "pointerleave");
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    pointer(node, "pointerenter");
    expect(queue.size).toBe(0);
  });
});
