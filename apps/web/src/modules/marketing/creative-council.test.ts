import { describe, expect, it } from "vitest";

import type { CompanyKnowledge } from "@/modules/memory/company-knowledge";

import {
  MAX_COMPANY_CONTEXT_CHARS,
  MAX_COMPETITOR_EVIDENCE_CHARS,
  assertCompetitorEvidenceBounded,
  creativeCouncilRequestSchema,
  creativeCritiqueSchema,
  hookStrategySchema,
  projectCompanyCreativeContext,
  projectCompetitorEvidence,
  projectReelIdea,
  reelScriptSchema,
  resolveSelectedCompetitorEvidence,
} from "./creative-council";

const companyKnowledge = {
  incompleteSections: [],
  organizationId: "10000000-0000-4000-8000-000000000001",
  sections: {
    audience: {
      attentionChannels: ["Instagram"],
      characteristics: ["Small team"],
      description: "Pre-product startup operators",
      goals: ["Build early demand"],
      motivations: ["Move quickly"],
      name: "Founders",
      objections: ["No time"],
      painPoints: ["Scattered context"],
    },
    brand: {
      avoid: ["Hype"],
      communicationTraits: ["Clear"],
      desiredEmotions: ["Confidence"],
      emphasize: ["Practicality"],
      personalityTraits: ["Calm"],
      primaryColors: [],
      status: "DEFINED" as const,
      toneOfVoice: ["Direct"],
      visualDirection: "Restrained product UI",
    },
    competitors: [],
    identity: {
      companyName: "Stylus",
      industry: "Software",
      primaryMarket: "Startup teams",
      shortDescription: "A startup operating system",
      stage: "PRE_PRODUCT" as const,
    },
    marketing: {
      contentFocus: ["Education"],
      desiredAudienceAction: "Join the waitlist",
      primaryChannels: ["Instagram"],
      primaryObjective: "AWARENESS" as const,
      secondaryObjectives: ["TRUST" as const],
      stage: "EXPERIMENTING" as const,
    },
    positioning: {
      category: "Startup workspace",
      desiredPerception: "Focused",
      difference: "Bounded AI workflows",
      keyPromise: "Keep startup context connected",
      reasonsToBelieve: ["Organization-scoped architecture"],
      statusQuo: "Disconnected tools",
    },
    problem: {
      affectedAudience: "Small startup teams",
      coreInsight: "Context is operational leverage",
      currentAlternatives: ["Documents"],
      importance: "Decisions get lost",
      statement: "Startup context is scattered",
      startupIdea: "Connect core startup work",
    },
    product: {
      capabilities: ["Tasks", "Knowledge", "Creative workflows"],
      concept: "A shared operating system",
      differentiators: ["Bounded AI"],
      nearTermObjective: "Validate with teams",
      status: "BUILDING" as const,
      valueProposition: "One reliable operating context",
    },
  },
  source: "canonical_company_profile" as const,
} satisfies CompanyKnowledge;

const analysis = {
  call_to_action: "Repeat the competitor's exact offer.",
  cautions_or_limitations: ["Transcript-only interpretation"],
  content_angle: "Education",
  hook_explanation: "Creates curiosity with a concrete tension.",
  hook_type: "Curiosity gap",
  key_messages: ["Competitor wording that must not be copied"],
  pacing_analysis: "Short sections create a brisk pace.",
  primary_hook: "Exact competitor wording that must be excluded",
  reusable_patterns: ["Open with a specific audience tension."],
  script_structure: [
    { label: "HOOK" as const, observation: "Tension before explanation" },
  ],
  summary: "A source summary that is not part of the allowlisted projection.",
  transcript_pattern_observations: ["Moves from tension to resolution."],
  visual_metrics: {
    aspect_ratio: "9:16",
    average_scene_duration: 2,
    cuts_per_minute: 30,
    resolution: "1080x1920",
    scene_count: 10,
  },
};

describe("Creative Council contracts and projections", () => {
  it("projects only bounded canonical Company sections without memory records", () => {
    const projected = projectCompanyCreativeContext(companyKnowledge);
    expect(JSON.stringify(projected).length).toBeLessThanOrEqual(
      MAX_COMPANY_CONTEXT_CHARS,
    );
    expect(projected.identity).toMatchObject({ companyName: "Stylus" });
    expect(JSON.stringify(projected)).not.toMatch(
      /knowledge_memories|agency|search_vector|memory/i,
    );
  });

  it("projects one bounded active Reel Idea and truncates working notes", () => {
    const projected = projectReelIdea({
      call_to_action: "Try it",
      concept: "Demonstrate a workflow",
      content_angle: "Practical",
      hook: "A useful hook",
      id: "10000000-0000-4000-8000-000000000015",
      notes: "n".repeat(4000),
      status: "READY",
      title: "Workflow idea",
    });
    expect(projected.notes).toHaveLength(1000);
    expect(projected.sourceReelIdeaId).toBe(
      "10000000-0000-4000-8000-000000000015",
    );
  });

  it("allowlists abstract competitor evidence and excludes media, transcript, URLs, and competitor wording", () => {
    const projected = projectCompetitorEvidence({
      analysisId: "20000000-0000-4000-8000-000000000015",
      analysisVersion: 2,
      structuredResult: analysis,
    });
    const serialized = JSON.stringify(projected);
    expect(serialized).toContain("Curiosity gap");
    expect(serialized).not.toContain(analysis.primary_hook);
    expect(serialized).not.toContain(analysis.call_to_action);
    expect(serialized).not.toContain(analysis.summary);
    expect(serialized).not.toMatch(
      /transcriptText|storagePath|sourceUrl|signedUrl|\.mp4|\.wav/,
    );
    expect(serialized.length).toBeLessThan(MAX_COMPETITOR_EVIDENCE_CHARS);
  });

  it("bounds explicit competitor selection and deduplicates replayed IDs", () => {
    const ids = [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
    ];
    expect(
      creativeCouncilRequestSchema.parse({
        idempotencyKey: "20000000-0000-4000-8000-000000000001",
        selectedAnalysisIds: [ids[0]!, ids[0]!],
        sourceReelIdeaId: "30000000-0000-4000-8000-000000000001",
      }).selectedAnalysisIds,
    ).toEqual([ids[0]]);
    expect(() =>
      creativeCouncilRequestSchema.parse({
        idempotencyKey: "20000000-0000-4000-8000-000000000001",
        selectedAnalysisIds: [...ids, "10000000-0000-4000-8000-000000000004"],
        sourceReelIdeaId: "30000000-0000-4000-8000-000000000001",
      }),
    ).toThrow();
    expect(() =>
      assertCompetitorEvidenceBounded(
        Array(4).fill(
          projectCompetitorEvidence({
            analysisId: ids[0]!,
            analysisVersion: 1,
            structuredResult: analysis,
          }),
        ),
      ),
    ).toThrow("too_many_competitor_analyses");
  });

  const ineligibleCases: Array<
    [
      string,
      {
        analysisOrganizationId?: string;
        competitorArchivedAt?: string;
        reelArchivedAt?: string;
        status?: string;
      },
    ]
  > = [
    ["cross organization", { analysisOrganizationId: "other" }],
    ["incomplete", { status: "PROCESSING" }],
    ["archived Reel", { reelArchivedAt: "2026-08-28T00:00:00Z" }],
    ["archived competitor", { competitorArchivedAt: "2026-08-28T00:00:00Z" }],
  ];

  it.each(ineligibleCases)(
    "rejects %s selected competitor analysis context",
    (_name, override) => {
      const organizationId = "10000000-0000-4000-8000-000000000001";
      const analysisId = "20000000-0000-4000-8000-000000000001";
      expect(() =>
        resolveSelectedCompetitorEvidence({
          analyses: [
            {
              analysis_version: 1,
              completed_at: "2026-08-28T00:00:00Z",
              competitor_reel_id: "30000000-0000-4000-8000-000000000001",
              id: analysisId,
              organization_id:
                override.analysisOrganizationId ?? organizationId,
              status: override.status ?? "ANALYZED",
              structured_result: analysis,
            },
          ],
          competitors: [
            {
              archived_at: override.competitorArchivedAt ?? null,
              id: "40000000-0000-4000-8000-000000000001",
              organization_id: organizationId,
            },
          ],
          organizationId,
          reels: [
            {
              archived_at: override.reelArchivedAt ?? null,
              id: "30000000-0000-4000-8000-000000000001",
              marketing_competitor_id: "40000000-0000-4000-8000-000000000001",
              organization_id: organizationId,
            },
          ],
          selectedAnalysisIds: [analysisId],
        }),
      ).toThrow("competitor_analysis_ineligible");
    },
  );

  it("includes only explicitly selected analyses", () => {
    const organizationId = "10000000-0000-4000-8000-000000000001";
    const selectedId = "20000000-0000-4000-8000-000000000001";
    const unselectedId = "20000000-0000-4000-8000-000000000002";
    const common = {
      analysis_version: 1,
      completed_at: "2026-08-28T00:00:00Z",
      competitor_reel_id: "30000000-0000-4000-8000-000000000001",
      organization_id: organizationId,
      status: "ANALYZED",
      structured_result: analysis,
    };
    const projected = resolveSelectedCompetitorEvidence({
      analyses: [
        { ...common, id: selectedId },
        { ...common, id: unselectedId },
      ],
      competitors: [
        {
          archived_at: null,
          id: "40000000-0000-4000-8000-000000000001",
          organization_id: organizationId,
        },
      ],
      organizationId,
      reels: [
        {
          archived_at: null,
          id: common.competitor_reel_id,
          marketing_competitor_id: "40000000-0000-4000-8000-000000000001",
          organization_id: organizationId,
        },
      ],
      selectedAnalysisIds: [selectedId],
    });
    expect(projected.map((item) => item.analysisId)).toEqual([selectedId]);
    expect(JSON.stringify(projected)).not.toContain(unselectedId);
  });

  it("keeps every agent output schema strict and bounded", () => {
    expect(
      hookStrategySchema.safeParse({ primaryHook: "Incomplete" }).success,
    ).toBe(false);
    expect(
      reelScriptSchema.safeParse({
        callToAction: "Try it",
        caption: "Caption",
        chosenHook: "Hook",
        sections: Array(9).fill({
          endSecond: 2,
          purpose: "Part",
          script: "Line",
          startSecond: 1,
        }),
        spokenScript: "Script",
        visualDirections: [],
      }).success,
    ).toBe(false);
    expect(
      creativeCritiqueSchema.safeParse({
        confidence: "HIGH",
        verdict: "STRONG",
      }).success,
    ).toBe(false);
  });
});
