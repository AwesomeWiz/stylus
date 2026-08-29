import "server-only";

import { generateAIStructured } from "@/core/ai/server";
import { getCompanyKnowledge } from "@/core/memory/server";
import type {
  MarketingReelBriefVersionRow,
  MarketingStrategicReviewStage,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { AIError, type AIErrorCategory } from "@/modules/ai/errors";
import { normalizeAIError } from "@/modules/ai/errors";

import { projectCompanyCreativeContext } from "../creative-council";
import {
  createStrategicCouncilReviewSchema,
  creativeJudgeInputSchema,
  judgeAddressesEveryChallenge,
  MAX_STRATEGIC_REVIEW_CONTEXT_CHARS,
  projectReelBrief,
  strategicReviewContextSchema,
  strategicReviewRunStartSchema,
  STRATEGIC_REVIEW_DEADLINE_MS,
  type AudienceResearch,
  type BrandReview,
  type ChallengeReview,
  type ContentStrategy,
  type StrategicCouncilReview,
  type StrategicReviewContext,
} from "../strategic-review";
import {
  CREATIVE_COUNCIL_CAPABILITY,
  strategicReviewAgents,
} from "./creative-council-agents";

type ReviewStage = Exclude<MarketingStrategicReviewStage, "COMPLETE">;
type ReviewOutput =
  AudienceResearch | BrandReview | ContentStrategy | ChallengeReview;

interface StrategicReviewStore {
  complete(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    review: StrategicCouncilReview;
    runId: string;
  }): Promise<{ reviewId: string; runId: string; versionNumber: number }>;
  fail(input: {
    actorId: string;
    aiRunId: string | null;
    category: AIErrorCategory;
    organizationId: string;
    runId: string;
    stage: ReviewStage;
  }): Promise<void>;
  record(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    output: ReviewOutput;
    runId: string;
    stage: Exclude<ReviewStage, "JUDGE">;
  }): Promise<void>;
  start(input: {
    actorId: string;
    context: StrategicReviewContext;
    idempotencyKey: string;
    organizationId: string;
  }): Promise<{ runId: string; shouldExecute: boolean; status: string }>;
}

export interface StrategicReviewDependencies {
  generate: typeof generateAIStructured;
  loadContext(input: {
    organizationId: string;
    sourceReelBriefVersionId: string;
  }): Promise<StrategicReviewContext>;
  store: StrategicReviewStore;
}

class SupabaseStrategicReviewStore implements StrategicReviewStore {
  private readonly service = createServiceSupabaseClient();

  async start(input: {
    actorId: string;
    context: StrategicReviewContext;
    idempotencyKey: string;
    organizationId: string;
  }) {
    const { data, error } = await this.service.rpc(
      "start_marketing_strategic_review",
      {
        p_actor_id: input.actorId,
        p_context_snapshot: input.context,
        p_idempotency_key: input.idempotencyKey,
        p_organization_id: input.organizationId,
        p_source_reel_brief_version_id:
          input.context.reelBrief.sourceReelBriefVersionId,
      },
    );
    if (error) throw new Error("strategic_review_start_failed");
    return strategicReviewRunStartSchema.parse(data);
  }

  async record(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    output: ReviewOutput;
    runId: string;
    stage: Exclude<ReviewStage, "JUDGE">;
  }) {
    const { error } = await this.service.rpc(
      "record_marketing_strategic_review_stage",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: input.aiRunId,
        p_organization_id: input.organizationId,
        p_run_id: input.runId,
        p_stage: input.stage,
        p_structured_output: input.output,
      },
    );
    if (error) throw new Error("strategic_review_stage_persistence_failed");
  }

  async complete(input: {
    actorId: string;
    aiRunId: string;
    organizationId: string;
    review: StrategicCouncilReview;
    runId: string;
  }) {
    const { data, error } = await this.service.rpc(
      "complete_marketing_strategic_review",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: input.aiRunId,
        p_organization_id: input.organizationId,
        p_review: input.review,
        p_run_id: input.runId,
      },
    );
    if (error) throw new Error("strategic_review_completion_failed");
    return data as {
      reviewId: string;
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
    stage: ReviewStage;
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
      "fail_marketing_strategic_review",
      {
        p_actor_id: input.actorId,
        p_ai_run_id: aiRunId,
        p_failure_category: input.category,
        p_organization_id: input.organizationId,
        p_run_id: input.runId,
        p_stage: input.stage,
      },
    );
    if (error) throw new Error("strategic_review_failure_persistence_failed");
  }
}

async function loadStrategicReviewContext(input: {
  organizationId: string;
  sourceReelBriefVersionId: string;
}) {
  const db = await createServerSupabaseClient();
  const [{ data: brief, error }, companyKnowledge] = await Promise.all([
    db
      .from("marketing_reel_brief_versions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("id", input.sourceReelBriefVersionId)
      .maybeSingle(),
    getCompanyKnowledge(input.organizationId),
  ]);
  if (error || !brief) throw new Error("reel_brief_ineligible");
  const context = strategicReviewContextSchema.parse({
    company: projectCompanyCreativeContext(companyKnowledge),
    reelBrief: projectReelBrief(brief as MarketingReelBriefVersionRow),
  });
  if (JSON.stringify(context).length > MAX_STRATEGIC_REVIEW_CONTEXT_CHARS)
    throw new Error("strategic_review_context_too_large");
  return context;
}

function generationInput<T>(
  agent: {
    maxOutputTokens: number;
    schema: Parameters<typeof generateAIStructured<T>>[0]["schema"];
    schemaName: string;
    systemInstruction: string;
    tier: "fast" | "balanced" | "reasoning";
    timeoutMs: number;
  },
  content: unknown,
  signal: AbortSignal,
  parentRunId?: string,
) {
  return {
    capability: CREATIVE_COUNCIL_CAPABILITY,
    options: {
      maxOutputTokens: agent.maxOutputTokens,
      messages: [
        { role: "system" as const, content: agent.systemInstruction },
        { role: "user" as const, content: JSON.stringify(content) },
      ],
      signal,
      temperature: 0.2,
      tier: agent.tier,
      timeoutMs: agent.timeoutMs,
    },
    parentRunId,
    pluginId: "marketing",
    schema: agent.schema,
    schemaName: agent.schemaName,
  };
}

export async function runStrategicReview(
  input: {
    actorId: string;
    idempotencyKey: string;
    organizationId: string;
    sourceReelBriefVersionId: string;
  },
  providedDependencies?: StrategicReviewDependencies,
) {
  const dependencies = providedDependencies ?? {
    generate: generateAIStructured,
    loadContext: loadStrategicReviewContext,
    store: new SupabaseStrategicReviewStore(),
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

  const deadline = new AbortController();
  const deadlineTimer = setTimeout(
    () => deadline.abort(new AIError("timeout")),
    STRATEGIC_REVIEW_DEADLINE_MS,
  );
  let stage: ReviewStage = "AUDIENCE";
  let aiRunId: string | null = null;
  try {
    const audienceAgent = strategicReviewAgents.AUDIENCE;
    const audience = await dependencies.generate(
      generationInput<AudienceResearch>(
        audienceAgent,
        context,
        deadline.signal,
      ),
    );
    aiRunId = audience.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: audience.runId,
      organizationId: input.organizationId,
      output: audience.data,
      runId: started.runId,
      stage,
    });

    stage = "BRAND";
    aiRunId = null;
    const brandAgent = strategicReviewAgents.BRAND;
    const brandInput = {
      company: context.company,
      reelBrief: context.reelBrief,
    };
    const brand = await dependencies.generate(
      generationInput<BrandReview>(
        brandAgent,
        brandInput,
        deadline.signal,
        audience.runId,
      ),
    );
    aiRunId = brand.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: brand.runId,
      organizationId: input.organizationId,
      output: brand.data,
      runId: started.runId,
      stage,
    });

    stage = "STRATEGY";
    aiRunId = null;
    const strategyAgent = strategicReviewAgents.STRATEGY;
    const strategyInput = {
      audienceResearch: audience.data,
      brandReview: brand.data,
      company: context.company,
      reelBrief: context.reelBrief,
    };
    const strategy = await dependencies.generate(
      generationInput<ContentStrategy>(
        strategyAgent,
        strategyInput,
        deadline.signal,
        brand.runId,
      ),
    );
    aiRunId = strategy.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: strategy.runId,
      organizationId: input.organizationId,
      output: strategy.data,
      runId: started.runId,
      stage,
    });

    stage = "CHALLENGE";
    aiRunId = null;
    const challengeAgent = strategicReviewAgents.CHALLENGE;
    const challengeInput = {
      audienceResearch: audience.data,
      brandReview: brand.data,
      candidateStrategy: strategy.data,
      reelBrief: context.reelBrief,
    };
    const challenge = await dependencies.generate(
      generationInput<ChallengeReview>(
        challengeAgent,
        challengeInput,
        deadline.signal,
        strategy.runId,
      ),
    );
    aiRunId = challenge.runId;
    await dependencies.store.record({
      actorId: input.actorId,
      aiRunId: challenge.runId,
      organizationId: input.organizationId,
      output: challenge.data,
      runId: started.runId,
      stage,
    });

    stage = "JUDGE";
    aiRunId = null;
    const judgeAgent = strategicReviewAgents.JUDGE;
    const judgeInput = creativeJudgeInputSchema.parse({
      ...challengeInput,
      challengeReview: challenge.data,
      company: context.company,
    });
    const judge = await dependencies.generate(
      generationInput<StrategicCouncilReview>(
        {
          ...judgeAgent,
          schema: createStrategicCouncilReviewSchema(
            challenge.data.challenges.map((item) => item.referenceId),
          ),
        },
        judgeInput,
        deadline.signal,
        challenge.runId,
      ),
    );
    aiRunId = judge.runId;
    if (!judgeAddressesEveryChallenge(challenge.data, judge.data))
      throw new AIError("invalid_response");
    const review = await dependencies.store.complete({
      actorId: input.actorId,
      aiRunId: judge.runId,
      organizationId: input.organizationId,
      review: judge.data,
      runId: started.runId,
    });
    return { ...review, duplicate: false, status: "SUCCEEDED" } as const;
  } catch (error) {
    const normalized = normalizeAIError(error);
    try {
      await dependencies.store.fail({
        actorId: input.actorId,
        aiRunId,
        category: normalized.category,
        organizationId: input.organizationId,
        runId: started.runId,
        stage,
      });
    } catch {
      // Preserve the original safe failure without exposing persistence internals.
    }
    throw normalized;
  } finally {
    clearTimeout(deadlineTimer);
  }
}
