import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardPlacement } from "./board-placement";
import { creationGeometry } from "@/modules/whiteboards/creation-geometry";
import type { WhiteboardTool } from "./whiteboard-toolbar";

beforeEach(() => {
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId = 1;
    },
  );
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => true;
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(tool: WhiteboardTool = "SHAPE", zoom = 1, shape = "rectangle") {
  const place = vi.fn(),
    cancel = vi.fn();
  const props = {
    tool,
    shape,
    viewport: { x: 50, y: 20, zoom },
    toWorld: (p: { x: number; y: number }) => ({
      x: (p.x - 50) / zoom,
      y: (p.y - 20) / zoom,
    }),
    getRows: () => [],
    snap: false,
    grid: false,
    onPlace: place,
    onCancel: cancel,
    onContext: vi.fn(),
  };
  const view = render(<BoardPlacement {...props} />);
  return {
    ...view,
    props,
    place,
    cancel,
    surface: view.container.querySelector<HTMLElement>(
      "[data-board-placement]",
    )!,
  };
}
const point = (x: number, y: number, shiftKey = false) => ({
  clientX: x,
  clientY: y,
  button: 0,
  shiftKey,
});
describe("ephemeral Board placement", () => {
  it.each([0.1, 1, 4])(
    "draws once in world coordinates at zoom %s, with zero movement commits",
    (zoom) => {
      const { surface, place, container } = setup("SHAPE", zoom);
      fireEvent.pointerMove(surface, point(100, 100));
      const cursor = container.querySelector("[data-placement-cursor]")!;
      expect(cursor.getAttribute("width")).toBe("20");
      expect(surface).toHaveStyle({ cursor: "none" });
      expect(container.querySelector("[data-placement-ghost]")).not.toBeNull();
      fireEvent.pointerDown(surface, point(100, 100));
      for (let i = 1; i <= 10; i++)
        fireEvent.pointerMove(surface, point(100 + i * 10, 100 + i * 5));
      expect(place).not.toHaveBeenCalled();
      expect(
        container.querySelector("[data-placement-drawing]"),
      ).not.toBeNull();
      expect(container.querySelector("[data-placement-ghost]")).toBeNull();
      expect(container.querySelector("[data-placement-cursor]")).toBe(cursor);
      expect(
        [...cursor.querySelectorAll("path")].map((path) =>
          path.getAttribute("stroke"),
        ),
      ).toEqual(["#ffffff", "#191a1d"]);
      fireEvent.pointerUp(surface, point(200, 150));
      expect(place).toHaveBeenCalledExactlyOnceWith(
        { x: 50 / zoom, y: 80 / zoom },
        {
          x: 50 / zoom,
          y: 80 / zoom,
          width: Math.max(24, 100 / zoom),
          height: Math.max(24, 50 / zoom),
        },
      );
    },
  );
  it("keeps click fallback, constrains Shift and handles reverse drawing", () => {
    const { surface, place } = setup();
    fireEvent.pointerDown(surface, point(100, 100));
    fireEvent.pointerUp(surface, point(102, 101));
    expect(place).toHaveBeenLastCalledWith({ x: 50, y: 80 }, undefined);
    fireEvent.pointerDown(surface, point(200, 200));
    fireEvent.pointerUp(surface, point(100, 150, true));
    expect(place).toHaveBeenLastCalledWith(
      { x: 150, y: 180 },
      { x: 50, y: 80, width: 100, height: 100 },
    );
  });
  it.each(["SECTION", "ARROW"] as const)(
    "uses bounded existing %s geometry",
    (tool) => {
      const { surface, place } = setup(tool);
      fireEvent.pointerDown(surface, point(100, 100));
      fireEvent.pointerMove(surface, point(250, 230));
      expect(place).not.toHaveBeenCalled();
      fireEvent.pointerUp(surface, point(250, 230));
      expect(place).toHaveBeenCalledOnce();
      if (tool === "ARROW") {
        const b = place.mock.calls[0]![1],
          a = (b.rotation * Math.PI) / 180;
        const endpoint = (localX: number) => ({
          x: b.x + b.width / 2 + (localX - b.width / 2) * Math.cos(a),
          y: b.y + 12 + (localX - b.width / 2) * Math.sin(a),
        });
        expect(endpoint(2).x).toBeCloseTo(50);
        expect(endpoint(2).y).toBeCloseTo(80);
        expect(endpoint(b.width - 8).x).toBeCloseTo(200);
        expect(endpoint(b.width - 8).y).toBeCloseTo(210);
      }
    },
  );
  it("uses the local image thumbnail, falls back on decode error and cancels without placement", () => {
    const { props, rerender, surface, container, cancel, place } =
      setup("IMAGE");
    rerender(<BoardPlacement {...props} image="blob:local-preview" />);
    fireEvent.pointerMove(surface, point(100, 100));
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("blob:local-preview");
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    fireEvent.pointerDown(surface, point(100, 100));
    fireEvent.pointerCancel(surface);
    expect(cancel).toHaveBeenCalledOnce();
    expect(place).not.toHaveBeenCalled();
    rerender(<BoardPlacement key="text" {...props} tool="TEXT" />);
    expect(container.querySelector("[data-placement-ghost]")).toBeNull();
    expect(container.querySelector("[data-placement-cursor]")).toBeNull();
    expect(container.firstElementChild).toHaveStyle({ cursor: "none" });
  });
  it("shares grid snapping and constrains arrow angles", () => {
    const { props, rerender, surface, place } = setup();
    rerender(<BoardPlacement {...props} grid />);
    fireEvent.pointerDown(surface, point(101, 101));
    fireEvent.pointerUp(surface, point(203, 179));
    expect(place).toHaveBeenLastCalledWith(
      { x: 48, y: 72 },
      { x: 48, y: 72, width: 96, height: 96 },
    );
    expect(
      creationGeometry({ x: 0, y: 0 }, { x: 100, y: 90 }, true, true).rotation,
    ).toBeCloseTo(45);
  });
});
