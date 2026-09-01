import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260825001800_performance_learning.sql",
  ),
  "utf8",
).toLowerCase();

describe("TASK-018 performance migration contract", () => {
  it("creates normalized organization-scoped publication, snapshot, learning, and evidence tables", () => {
    for (const table of [
      "marketing_published_content",
      "marketing_performance_snapshots",
      "marketing_performance_learnings",
      "marketing_performance_learning_evidence",
    ])
      expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain(
      "references public.marketing_reel_brief_versions(organization_id, id)",
    );
    expect(sql).toContain(
      "foreign key (organization_id, published_content_id)",
    );
    expect(sql).toContain(
      "foreign key (organization_id, published_content_id, snapshot_id)",
    );
  });

  it("reuses the exact controlled opportunity taxonomy and allows it to remain unavailable", () => {
    for (const value of [
      "relatable_pain",
      "educational",
      "myth_busting",
      "debate",
      "trend_explainer",
      "buying_objection",
      "identity_aspiration",
      "question_answer",
      "brand_trust",
      "product_context",
    ])
      expect(sql).toContain(`'${value}'`);
    expect(sql).toContain("content_opportunity_type text check");
    expect(sql).not.toContain("content_opportunity_type text not null");
  });

  it("preserves unavailable metrics and rejects invalid raw values", () => {
    expect(sql).toContain(
      "views bigint check (views between 0 and 9000000000000000)",
    );
    expect(sql).not.toContain("views bigint not null");
    expect(sql).toContain("completion_rate between 0 and 1");
    expect(sql).toContain("num_nonnulls(");
    expect(sql).toContain("observation cannot precede publication");
  });

  it("makes snapshots, learnings, and evidence immutable at the database boundary", () => {
    expect(
      sql.match(/reject_marketing_performance_history_mutation/g)?.length,
    ).toBeGreaterThanOrEqual(4);
    expect(sql).toContain(
      "before update or delete on public.marketing_performance_snapshots",
    );
    expect(sql).toContain(
      "before update or delete on public.marketing_performance_learnings",
    );
    expect(sql).not.toMatch(
      /grant (?:insert|update|delete).*marketing_performance_/,
    );
  });

  it("enforces enabled-plugin RBAC, RLS, same-org provenance, and service-only derivation", () => {
    expect(sql).toContain("membership.role in ('owner', 'admin', 'member')");
    expect(sql).toContain("membership.removed_at is null");
    expect(sql.match(/enable row level security/g)).toHaveLength(4);
    expect(
      sql.match(/private\.marketing_plugin_available\(organization_id\)/g),
    ).toHaveLength(4);
    expect(sql).toContain("create_marketing_performance_learning");
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(
      /grant execute on function[\s\S]*create_marketing_performance_learning[\s\S]*to authenticated/,
    );
  });

  it("persists conservative sample counts, exact evidence, and algorithm version idempotently", () => {
    expect(sql).toContain(
      "baseline_sample_count integer not null check (baseline_sample_count between 5 and 100)",
    );
    expect(sql).toContain(
      "sample_count integer not null check (sample_count between 3 and 100)",
    );
    expect(sql).toContain("marketing-performance-learning-v1");
    expect(sql).toContain("unique (organization_id, generation_key)");
    expect(sql).toContain(
      "on conflict (organization_id, generation_key) do nothing",
    );
    expect(sql).toContain(
      "row_number() over (order by snapshot.saves::numeric / snapshot.reach::numeric)",
    );
    expect(sql).toContain("select avg(ordered.rate) into v_baseline");
  });

  it("has no AI, research, Council, memory, job, worker, or network side effect", () => {
    expect(sql).not.toMatch(
      /ai_runs|knowledge_memories|strategic_review|creative_council|external_research|insert into public\.jobs|pg_net|http_/,
    );
  });
});
