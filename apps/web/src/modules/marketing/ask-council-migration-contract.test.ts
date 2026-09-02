import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825002000_ask_council.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-020 Ask Council migration contract", () => {
  it("creates organization-scoped conversations, turns, messages, specialist results, and typed provenance", () => {
    for (const table of [
      "marketing_ask_council_conversations",
      "marketing_ask_council_messages",
      "marketing_ask_council_turns",
      "marketing_ask_council_specialist_results",
      "marketing_ask_council_context_refs",
    ])
      expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain("foreign key (organization_id, conversation_id)");
    expect(sql).toContain("foreign key (organization_id, research_report_id)");
    expect(sql).toContain(
      "foreign key (organization_id, research_evidence_id)",
    );
    expect(sql).toContain(
      "foreign key (organization_id, performance_learning_id)",
    );
    expect(sql).toContain(
      "foreign key (organization_id, reel_brief_version_id)",
    );
    expect(sql).toContain("foreign key (organization_id, strategic_review_id)");
  });

  it("permits no SYSTEM role and prevents browser-forged assistant or provenance inserts", () => {
    expect(sql).toContain(
      "marketing_ask_council_message_role as enum ('user', 'assistant')",
    );
    expect(sql).not.toMatch(/marketing_ask_council_message_role[^;]*system/);
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(
      /grant (insert|update|delete)[^;]*to authenticated/,
    );
    const authenticatedExecuteGrant = sql.match(
      /grant execute on function\s+public\.set_marketing_ask_council_conversation_archived[\s\S]*?to authenticated;/,
    );
    expect(authenticatedExecuteGrant?.[0]).not.toContain(
      "start_marketing_ask_council_turn",
    );
    expect(sql).not.toMatch(
      /grant execute on function\s+public\.start_marketing_ask_council_turn[^;]*to authenticated;/,
    );
  });

  it("makes messages, context, specialist results, and turn provenance immutable", () => {
    expect(sql).toContain(
      "before update or delete on public.marketing_ask_council_messages",
    );
    expect(sql).toContain(
      "before update or delete on public.marketing_ask_council_specialist_results",
    );
    expect(sql).toContain(
      "before update or delete on public.marketing_ask_council_context_refs",
    );
    expect(sql).toContain("protect_marketing_ask_council_turn_provenance");
    expect(sql).toContain("ask council turn provenance is immutable");
    expect(sql).toContain("archived_at timestamptz");
  });

  it("uses enabled-plugin RBAC, Viewer-read RLS, fixed search paths, and explicit grants", () => {
    expect(sql).toContain("membership.role in ('owner', 'admin', 'member')");
    expect(sql).toContain("membership.removed_at is null");
    expect(sql.match(/enable row level security/g)).toHaveLength(5);
    expect(
      sql.match(/private\.marketing_plugin_available\(organization_id\)/g),
    ).toHaveLength(5);
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("grant select on public.marketing_ask_council");
  });

  it("binds every AI run to the exact Marketing capability, actor, tenant, and balanced tier", () => {
    expect(sql).toContain("ai.organization_id = p_organization_id");
    expect(sql).toContain("ai.actor_id = p_actor_id");
    expect(sql).toContain("ai.plugin_id = 'marketing'");
    expect(sql).toContain("ai.capability = 'marketing.ask-council.execute'");
    expect(sql).toContain("ai.operation = 'generate_structured'");
    expect(sql).toContain("ai.requested_tier = 'balanced'");
  });

  it("enforces bounded specialists, context, idempotency, and one pending turn", () => {
    expect(sql).toContain("cardinality(selected_specialists) between 1 and 3");
    expect(sql).toContain("pg_column_size(context_snapshot) <= 65536");
    expect(sql).toContain("jsonb_array_length(p_context_refs) > 15");
    expect(sql).toContain(
      "unique (organization_id, created_by, idempotency_key)",
    );
    expect(sql).toContain("marketing_ask_council_one_pending_turn_idx");
    expect(sql).toContain("pg_advisory_xact_lock");
  });

  it("creates only Ask Council records, AI provenance, and bounded activity", () => {
    expect(sql).not.toMatch(
      /insert into public\.(marketing_reel_brief_versions|marketing_strategic_council_review_versions|marketing_external_research_runs|marketing_performance_snapshots|marketing_performance_learnings|knowledge_memories|jobs)/,
    );
    expect(sql).toContain("insert into public.activity_events");
    expect(sql).not.toMatch(/pg_net|http_|web_agency|agency_memory/);
  });
});
