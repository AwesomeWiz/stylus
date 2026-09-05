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
const collaborationMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000710_whiteboard_collaboration.sql",
  ),
  "utf8",
);
const collaborationEnums = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825000700_extend_collaboration_enums.sql",
  ),
  "utf8",
);
const productionPolishMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825002010_final_production_polish.sql",
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

describe("whiteboard collaboration migration contract", () => {
  it("extends notification and activity enums in a separate committed migration", () => {
    expect(collaborationEnums).toMatch(/notification_type[\s\S]*BOARD_MENTION/);
    expect(collaborationEnums).toMatch(/notification_entity_type[\s\S]*BOARD/);
    expect(collaborationEnums).toMatch(
      /activity_event_type[\s\S]*BOARD_COMMENTED/,
    );
  });

  it("stores scoped comments, shallow replies, and structural mentions", () => {
    expect(collaborationMigration).toMatch(
      /create table public\.board_comments/,
    );
    expect(collaborationMigration).toMatch(
      /create table public\.board_comment_mentions/,
    );
    expect(collaborationMigration).toMatch(
      /Replies may have only one thread level/,
    );
    expect(collaborationMigration).toMatch(
      /Mentioned user must belong to organization/,
    );
  });

  it("keeps writes behind permission-checking RPCs", () => {
    expect(collaborationMigration).toMatch(
      /security definer[\s\S]*set search_path = ''/,
    );
    expect(collaborationMigration).toMatch(
      /Board collaboration permission required/,
    );
    expect(collaborationMigration).toMatch(
      /Comment removal permission required/,
    );
    expect(collaborationMigration).not.toMatch(
      /grant (insert|update|delete) on table public\.board_comments/,
    );
  });

  it("publishes scoped board rows and restricts private presence", () => {
    expect(collaborationMigration).toMatch(
      /alter publication supabase_realtime add table public\.board_elements/,
    );
    expect(collaborationMigration).toMatch(
      /alter publication supabase_realtime add table public\.board_comments/,
    );
    expect(collaborationMigration).toMatch(
      /realtime\.messages\.extension = 'presence'/,
    );
    expect(collaborationMigration).toMatch(
      /'board:' \|\| board_record\.id::text/,
    );
  });

  it("qualifies private presence topics by organization and board", () => {
    expect(productionPolishMigration).toMatch(
      /'board:' \|\| board_record\.organization_id::text \|\| ':' \|\| board_record\.id::text/,
    );
    expect(productionPolishMigration).toMatch(
      /private\.is_organization_member\(board_record\.organization_id\)/,
    );
    expect(productionPolishMigration).toMatch(
      /realtime\.messages\.payload ->> 'userId' = \(select auth\.uid\(\)\)::text/,
    );
  });
});
