"use client";
import { useMemo, type ReactNode } from "react";
import {
  BoardEntityContext,
  BoardEntityTypesContext,
  type BoardEntityType,
  type BoardEntityStore,
} from "./board-entity-store";
import { NativeOpenContext } from "./board-native-card";
import {
  BoardColorPreviewContext,
  type createBoardColorPreview,
} from "./board-color-preview";
export function BoardNativeProviders({
  store,
  beforeOpen,
  colorPreview,
  children,
  types,
}: {
  store: BoardEntityStore;
  beforeOpen: () => boolean;
  colorPreview: ReturnType<typeof createBoardColorPreview>;
  children: ReactNode;
  types: readonly BoardEntityType[];
}) {
  const metadata = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  );
  return (
    <BoardEntityContext.Provider value={store}>
      <NativeOpenContext.Provider value={beforeOpen}>
        <BoardColorPreviewContext.Provider value={colorPreview}>
          <BoardEntityTypesContext.Provider value={metadata}>
            {children}
          </BoardEntityTypesContext.Provider>
        </BoardColorPreviewContext.Provider>
      </NativeOpenContext.Provider>
    </BoardEntityContext.Provider>
  );
}
