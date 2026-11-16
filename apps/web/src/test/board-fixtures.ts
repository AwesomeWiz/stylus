import type { BoardElementRow, BoardRow } from "@/lib/supabase/database.types";
export const board: BoardRow = {
  id: "20000000-0000-4000-8000-000000000001",
  organization_id: "10000000-0000-4000-8000-000000000001",
  title: "Ideas",
  created_by: "50000000-0000-4000-8000-000000000001",
  updated_by: "50000000-0000-4000-8000-000000000001",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  archived_at: null,
};
export function object(
  overrides: Partial<BoardElementRow> = {},
): BoardElementRow {
  return {
    id: crypto.randomUUID(),
    board_id: board.id,
    organization_id: board.organization_id,
    element_type: "STICKY",
    content: { text: "Persisted idea" },
    style: { fontSize: 18 },
    metadata: {},
    parent_id: null,
    locked: false,
    x: 10,
    y: 20,
    width: 200,
    height: 180,
    rotation: 0,
    z_index: 1,
    created_by: board.created_by,
    updated_by: board.updated_by,
    created_at: board.created_at,
    updated_at: board.updated_at,
    archived_at: null,
    ...overrides,
  };
}
