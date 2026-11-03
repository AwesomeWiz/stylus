import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthVisual } from "./auth-visual";
import { AuthVisualArtwork } from "./auth-visual-artwork";

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
      <AuthVisualArtwork />
    </AuthVisual>,
  );
  const node = result.container.firstElementChild as HTMLElement;
  const geometry = vi
    .spyOn(node, "getBoundingClientRect")
    .mockReturnValue({ left: 0, top: 0, width: 600, height: 400 } as DOMRect);
  const tile = node.querySelector<HTMLElement>(
    '[data-column="4"][data-row="3"]',
  )!;
  return { ...result, node, tile, geometry };
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
    expect(node.querySelector("[data-auth-tile]")).toBeInTheDocument();
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
  it("batches local depth and directional response, then settles without an idle loop", () => {
    const { node, tile, geometry } = mount();
    pointer(node, "pointerenter");
    for (let i = 0; i < 20; i++) pointer(node, "pointermove");
    expect(queue.size).toBe(1);
    flush();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(Number(tile.style.getPropertyValue("--tile-lift"))).toBeGreaterThan(
      0.5,
    );
    expect(Number(tile.style.getPropertyValue("--tile-x"))).toBeGreaterThan(0);
    expect(Number(tile.style.getPropertyValue("--tile-y"))).toBeLessThan(0);
    const distant = node.querySelector<HTMLElement>(
      '[data-column="0"][data-row="7"]',
    )!;
    expect(Number(distant.style.getPropertyValue("--tile-lift"))).toBe(0);
    expect(queue.size).toBe(0);
    pointer(node, "pointerleave");
    flush();
    expect(Number(tile.style.getPropertyValue("--tile-x"))).toBe(0);
    expect(Number(tile.style.getPropertyValue("--tile-lift"))).toBe(0);
    expect(queue.size).toBe(0);
  });
  it("does not rerender React children while the pointer moves", () => {
    const draw = vi.fn();
    function Artwork() {
      draw();
      return <AuthVisualArtwork />;
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
    const { node, tile } = mount();
    pointer(node, "pointerenter");
    flush();
    allowed = false;
    act(() => mediaChanged());
    expect(tile.style.getPropertyValue("--tile-x")).toBe("");
    pointer(node, "pointermove");
    expect(queue.size).toBe(0);
    allowed = true;
    act(() => mediaChanged());
    pointer(node, "pointermove");
    expect(queue.size).toBe(1);
    visibility().mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(queue.size).toBe(0);
    expect(tile.style.getPropertyValue("--tile-lift")).toBe("");
  });
  it("invalidates geometry on resize and cleans up pending frames/listeners", () => {
    const { node, geometry, unmount } = mount();
    pointer(node, "pointerenter");
    flush();
    act(() => window.dispatchEvent(new Event("resize")));
    pointer(node, "pointermove", 900, -10);
    flush();
    expect(geometry).toHaveBeenCalledTimes(2);
    expect(
      [...node.querySelectorAll<HTMLElement>("[data-auth-tile]")].every(
        (tile) =>
          Math.abs(Number(tile.style.getPropertyValue("--tile-x"))) <= 1,
      ),
    ).toBe(true);
    pointer(node, "pointerleave");
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    pointer(node, "pointerenter");
    expect(queue.size).toBe(0);
  });
});
