import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000600_whiteboard_foundation.sql",
  ),
  "utf8",
);

describe("whiteboard migration contract", () => {
  it("stores boards and independently addressable elements with safe geometry", () => {
    expect(migration).toMatch(/create table public\.boards/);
    expect(migration).toMatch(/create table public\.board_elements/);
    expect(migration).toMatch(/board_elements_dimensions_valid/);
    expect(migration).toMatch(/foreign key \(organization_id, board_id\)/);
  });

  it("enforces member reads, collaborator writes, and viewer read-only behavior", () => {
    expect(migration).toMatch(/boards_select_for_members/);
    expect(migration).toMatch(/board_elements_select_for_members/);
    expect(
      migration.match(/array\['OWNER', 'ADMIN', 'MEMBER'\]/g)?.length,
    ).toBeGreaterThanOrEqual(7);
  });

  it("prevents provenance and board reassignment", () => {
    expect(migration).toMatch(/Board creator must be the authenticated user/);
    expect(migration).toMatch(/new\.board_id <> old\.board_id/);
    expect(migration).toMatch(/Board element provenance cannot be changed/);
  });

  it("creates a private, constrained image bucket and organization storage policies", () => {
    expect(migration).toMatch(/'board-images'[\s\S]*false,[\s\S]*10485760/);
    expect(migration).toContain(
      "array['image/png', 'image/jpeg', 'image/webp']",
    );
    expect(migration).toMatch(/board_images_select_for_members/);
    expect(migration).toMatch(/board_images_insert_for_collaborators/);
  });

  it("does not grant destructive table deletes or browser provenance updates", () => {
    expect(migration).not.toMatch(
      /grant delete on public\.(boards|board_elements)/,
    );
    expect(migration).not.toMatch(
      /grant update \([^)]*(organization_id|board_id|created_by)/,
    );
  });
});
