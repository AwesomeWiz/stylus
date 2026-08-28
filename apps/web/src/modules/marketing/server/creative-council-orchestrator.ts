import "server-only";

import { generateAIStructured } from "@/core/ai/server";
import { getCompanyKnowledge } from "@/core/memory/server";
import type { AIErrorCategory } from "@/modules/ai/errors";
import { normalizeAIError } from "@/modules/ai/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  MarketingCompetitorReelAnalysisRow,
  MarketingCompetitorReelRow,
  MarketingCompetitorRow,
  MarketingReelIdeaRow,
} from "@/lib/supabase/database.types";

import {
  assertCompetitorEvidenceBounded,
  creativeCouncilContextSchema,
  creativeCouncilRunStartSchema,
  projectCompanyCreativeContext,
  projectReelIdea,
  resolveSelectedCompetitorEvidence,
  type CreativeCouncilContext,
  type CreativeCritique,
  type HookStrategy,
  type ReelScript,
} from "../creative-council";
import {
  CREATIVE_COUNCIL_CAPABILITY,
  creativeCouncilAgents,
} from "./creative-council-agents";

type CouncilStage = "HOOK" | "SCRIPT" | "CRITIQUE";

interface CouncilStore {
  complete(input: {
    actorId: string;
    aiRunId: string;
    critique: CreativeCritique;
    organizationId: string;
    runId: string;
  }): Promise<{ briefId: string; runId: string; versionNumber: number }>;
  fail(input: {
    actorId: string;
    aiRunId: string | null;
    category: AIErrorCategory;
    organizationId: string;
    runId: string;
    stage: CouncilStage;
  }): Promise<void>;
  record(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    output: CreativeCritique | HookStrategy | ReelScript;
    runId: string;
    stage: "HOOK" | "SCRIPT";
  }): Promise<void>;
  start(input: {
    actorId: string;
    context: CreativeCouncilContext;
    idempotencyKey: string;
    organizationId: string;
  }): Promise<{ runId: string; shouldExecute: boolean; status: string }>;
}

interface CouncilDependencies {
  generate: typeof generateAIStructured;
  loadContext(input: {
    organizationId: string;
    selectedAnalysisIds: readonly string[];
    sourceReelIdeaId: string;
  }): Promise<CreativeCouncilContext>;
  store: CouncilStore;
}

class SupabaseCreativeCouncilStore implements CouncilStore {
  private readonly service = createServiceSupabaseClient();

  async start(input: {
    actorId: string;
    context: CreativeCouncilContext;
    idempotencyKey: string;
    organizationId: string;
  }) {
    const { data, error } = await this.service.rpc(
      "start_marketing_creative_council_run",
      {
        p_actor_id: input.actorId,
        p_context_snapshot: {
          company: input.context.company,
          reelIdea: input.context.reelIdea,
        },
        p_evidence: input.context.competitorEvidence,
        p_idempotency_key: input.idempotencyKey,
        p_organization_id: input.organizationId,
        p_source_reel_idea_id: input.context.reelIdea.sourceReelIdeaId,
      },
    );
    if (error) throw new Error("council_start_failed");
    return creativeCouncilRunStartSchema.parse(data);
  }

  async record(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    output: HookStrategy | ReelScript;
    runId: string;
    stage: "HOOK" | "SCRIPT";
  }) {
    const { error } = await this.service.rpc(
      "record_marketing_creative_council_stage",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: input.aiRunId,
        p_organization_id: input.organizationId,
        p_run_id: input.runId,
        p_stage: input.stage,
        p_structured_output: input.output,
      },
    );
    if (error) throw new Error("council_stage_persistence_failed");
  }

  async complete(input: {
    actorId: string;
    aiRunId: string;
    critique: CreativeCritique;
    organizationId: string;
    runId: string;
  }) {
    const { data, error } = await this.service.rpc(
      "complete_marketing_creative_council_run",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: input.aiRunId,
        p_critique: input.critique,
        p_organization_id: input.organizationId,
        p_run_id: input.runId,
      },
    );
    if (error) throw new Error("council_completion_failed");
    return data as {
      briefId: string;
      runId: string;
      versionNumber: number;
    };
  }

  async fail(input: {
    actorId: string;
    aiRunId: string | null;
    category: AIErrorCategory;
    organizationId: string;
    runId: string;
    stage: CouncilStage;
  }) {
    let aiRunId: string | null = null;
    if (input.aiRunId) {
      const { data } = await this.service
        .from("ai_runs")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("id", input.aiRunId)
        .maybeSingle();
      aiRunId = data?.id ?? null;
    }
    const { error } = await this.service.rpc(
      "fail_marketing_creative_council_run",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: aiRunId,
        p_failure_category: input.category,
        p_organization_id: input.organizationId,
        p_run_id: input.runId,
        p_stage: input.stage,
      },
    );
    if (error) throw new Error("council_failure_persistence_failed");
  }
}

async function loadCreativeCouncilContext(input: {
  organizationId: string;
  selectedAnalysisIds: readonly string[];
  sourceReelIdeaId: string;
}): Promise<CreativeCouncilContext> {
  const db = await createServerSupabaseClient();
  const [{ data: idea, error: ideaError }, companyKnowledge] =
    await Promise.all([
      db
        .from("marketing_reel_ideas")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("id", input.sourceReelIdeaId)
        .is("archived_at", null)
        .maybeSingle(),
      getCompanyKnowledge(input.organizationId),
    ]);
  if (ideaError || !idea) throw new Error("reel_idea_ineligible");

  const evidence = await loadSelectedEvidence(
    db,
    input.organizationId,
    input.selectedAnalysisIds,
  );
  assertCompetitorEvidenceBounded(evidence);
  return creativeCouncilContextSchema.parse({
    company: projectCompanyCreativeContext(companyKnowledge),
    competitorEvidence: evidence,
    reelIdea: projectReelIdea(idea as MarketingReelIdeaRow),
  });
}

async function loadSelectedEvidence(
  db: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  selectedAnalysisIds: readonly string[],
) {
  if (!selectedAnalysisIds.length) return [];
  const { data: analyses, error } = await db
    .from("marketing_competitor_reel_analyses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "ANALYZED")
    .not("completed_at", "is", null)
    .in("id", [...selectedAnalysisIds]);
  if (error || analyses?.length !== selectedAnalysisIds.length)
    throw new Error("competitor_analysis_ineligible");

  const typedAnalyses = analyses as MarketingCompetitorReelAnalysisRow[];
  const reelIds = [
    ...new Set(typedAnalyses.map((item) => item.competitor_reel_id)),
  ];
  const { data: reels, error: reelsError } = await db
    .from("marketing_competitor_reels")
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .in("id", reelIds);
  if (reelsError || reels?.length !== reelIds.length)
    throw new Error("competitor_analysis_ineligible");
  const competitorIds = [
    ...new Set(
      (reels as MarketingCompetitorReelRow[]).map(
        (reel) => reel.marketing_competitor_id,
      ),
    ),
  ];
  const { data: competitors, error: competitorsError } = await db
    .from("marketing_competitors")
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .in("id", competitorIds);
  if (competitorsError || competitors?.length !== competitorIds.length)
    throw new Error("competitor_analysis_ineligible");

  return resolveSelectedCompetitorEvidence({
    analyses: typedAnalyses,
    competitors: competitors as MarketingCompetitorRow[],
    organizationId,
    reels: reels as MarketingCompetitorReelRow[],
    selectedAnalysisIds,
  });
}

export async function runCreativeCouncil(
  input: {
    actorId: string;
    idempotencyKey: string;
    organizationId: string;
    selectedAnalysisIds: readonly string[];
    sourceReelIdeaId: string;
  },
  providedDependencies?: CouncilDependencies,
) {
  const dependencies = providedDependencies ?? {
    generate: generateAIStructured,
    loadContext: loadCreativeCouncilContext,
    store: new SupabaseCreativeCouncilStore(),
  };
  const context = await dependencies.loadContext(input);
  const started = await dependencies.store.start({
    actorId: input.actorId,
    context,
    idempotencyKey: input.idempotencyKey,
    organizationId: input.organizationId,
  });
  if (!started.shouldExecute)
    return {
      duplicate: true,
      runId: started.runId,
      status: started.status,
    } as const;

  let stage: CouncilStage = "HOOK";
  let aiRunId: string | null = null;
  try {
    const hookAgent = creativeCouncilAgents.HOOK;
    aiRunId = null;
    const hookResult = await dependencies.generate({
      capability: CREATIVE_COUNCIL_CAPABILITY,
      options: {
        maxOutputTokens: hookAgent.maxOutputTokens,
        messages: [
          { role: "system", content: hookAgent.systemInstruction },
          { role: "user", content: JSON.stringify(context) },
        ],
        temperature: 0.35,
        tier: hookAgent.tier,
        timeoutMs: hookAgent.timeoutMs,
      },
      pluginId: "marketing",
      schema: hookAgent.schema,
      schemaName: hookAgent.schemaName,
    });
    aiRunId = hookResult.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: hookResult.runId,
      organizationId: input.organizationId,
      output: hookResult.data,
      runId: started.runId,
      stage,
    });

    stage = "SCRIPT";
    const scriptAgent = creativeCouncilAgents.SCRIPT;
    aiRunId = null;
    const scriptResult = await dependencies.generate({
      capability: CREATIVE_COUNCIL_CAPABILITY,
      options: {
        maxOutputTokens: scriptAgent.maxOutputTokens,
        messages: [
          { role: "system", content: scriptAgent.systemInstruction },
          {
            role: "user",
            content: JSON.stringify({
              company: context.company,
              competitorEvidence: context.competitorEvidence,
              hookStrategy: hookResult.data,
              reelIdea: context.reelIdea,
            }),
          },
        ],
        temperature: 0.4,
        tier: scriptAgent.tier,
        timeoutMs: scriptAgent.timeoutMs,
      },
      parentRunId: hookResult.runId,
      pluginId: "marketing",
      schema: scriptAgent.schema,
      schemaName: scriptAgent.schemaName,
    });
    aiRunId = scriptResult.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: scriptResult.runId,
      organizationId: input.organizationId,
      output: scriptResult.data,
      runId: started.runId,
      stage,
    });

    stage = "CRITIQUE";
    const criticAgent = creativeCouncilAgents.CRITIQUE;
    aiRunId = null;
    const critiqueResult = await dependencies.generate({
      capability: CREATIVE_COUNCIL_CAPABILITY,
      options: {
        maxOutputTokens: criticAgent.maxOutputTokens,
        messages: [
          { role: "system", content: criticAgent.systemInstruction },
          {
            role: "user",
            content: JSON.stringify({
              company: context.company,
              competitorEvidence: context.competitorEvidence,
              hookStrategy: hookResult.data,
              reelIdea: context.reelIdea,
              script: scriptResult.data,
            }),
          },
        ],
        temperature: 0.2,
        tier: criticAgent.tier,
        timeoutMs: criticAgent.timeoutMs,
      },
      parentRunId: scriptResult.runId,
      pluginId: "marketing",
      schema: criticAgent.schema,
      schemaName: criticAgent.schemaName,
    });
    aiRunId = critiqueResult.runId;
    const brief = await dependencies.store.complete({
      actorId: input.actorId,
      aiRunId: critiqueResult.runId,
      critique: critiqueResult.data,
      organizationId: input.organizationId,
      runId: started.runId,
    });
    return { ...brief, duplicate: false, status: "SUCCEEDED" } as const;
  } catch (error) {
    const category = normalizeAIError(error).category;
    try {
      await dependencies.store.fail({
        actorId: input.actorId,
        aiRunId,
        category,
        organizationId: input.organizationId,
        runId: started.runId,
        stage,
      });
    } catch {
      // The original safe failure remains authoritative; no sensitive detail is surfaced.
    }
    throw normalizeAIError(error);
  }
}

export type { CouncilDependencies };
