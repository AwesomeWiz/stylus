"use client";
import { useState } from "react";
export const defaultBoardPanels = { layers: true, properties: true };
export function useBoardPanels(userId: string) {
  const key = `stylus-board-panels:${userId}`;
  const [panels, setPanels] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      return typeof value?.layers === "boolean" &&
        typeof value?.properties === "boolean"
        ? (value as typeof defaultBoardPanels)
        : defaultBoardPanels;
    } catch {
      return defaultBoardPanels;
    }
  });
  function change(next: typeof defaultBoardPanels) {
    setPanels(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Device preference is optional. */
    }
  }
  return {
    ...panels,
    hide: () => change({ layers: false, properties: false }),
    toggle: (name: keyof typeof defaultBoardPanels) =>
      change({ ...panels, [name]: !panels[name] }),
    show: (name: keyof typeof defaultBoardPanels) =>
      change({ ...panels, [name]: true }),
    toggleBoth: () =>
      change({
        layers: !(panels.layers || panels.properties),
        properties: !(panels.layers || panels.properties),
      }),
  };
}
