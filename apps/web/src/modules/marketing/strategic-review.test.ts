import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  challengeReviewSchema,
  contentStrategySchema,
  createStrategicCouncilReviewSchema,
  evidenceStatusSchema,
  judgeAddressesEveryChallenge,
  projectReelBrief,
  strategicCouncilReviewSchema,
  strategicReviewRequestSchema,
  STRATEGIC_REVIEW_CALL_TIMEOUT_MS,
  STRATEGIC_REVIEW_DEADLINE_MS,
  STRATEGIC_REVIEW_MAX_CALLS,
} from "./strategic-review";

describe("strategic review contracts", () => {
  it("fixes the workflow at five calls with bounded per-call and total deadlines", () => {
    expect(STRATEGIC_REVIEW_MAX_CALLS).toBe(5);
    expect(STRATEGIC_REVIEW_CALL_TIMEOUT_MS).toBe(60_000);
    expect(STRATEGIC_REVIEW_DEADLINE_MS).toBe(285_000);
  });
  it("distinguishes evidence, inference, assumptions, and bounded evidence status", () => {
    expect(evidenceStatusSchema.options).toEqual([
      "SUPPORTED",
      "WEAKLY_SUPPORTED",
      "UNSUPPORTED_BY_SUPPLIED_EVIDENCE",
      "CONTRADICTED_BY_SUPPLIED_EVIDENCE",
      "REQUIRES_EXTERNAL_VERIFICATION",
    ]);
    expect(evidenceStatusSchema.safeParse("CONFIRMED_FALSE").success).toBe(
      false,
    );
  });

  it("accepts an unsupported audience-duration challenge without calling it false", () => {
    const result = challengeReviewSchema.parse({
      challenges: [
        {
          category: "UNSUPPORTED_CLAIM",
          challenge:
            "The supplied material does not establish a preferred Reel duration.",
          confidenceCalibration: "Reduce certainty until evidence is supplied.",
          contradictionReferences: [],
          counterHypothesis:
            "The audience may prefer shorter delivery for this subject.",
          evidenceStatus: "REQUIRES_EXTERNAL_VERIFICATION",
          missingEvidence: ["Audience retention or preference evidence"],
          reconsideration: "REQUIRED",
          referenceId: "REC-1",
          riskFlags: ["OVERCONFIDENCE"],
          verificationRecommendation:
            "Validate duration with an authorized experiment or research source.",
        },
      ],
      confidence: "HIGH",
      overallSeverity: "HIGH",
      summary: "One material duration assumption requires verification.",
    });
    expect(result.challenges[0]?.evidenceStatus).toBe(
      "REQUIRES_EXTERNAL_VERIFICATION",
    );
    expect(JSON.stringify(result)).not.toMatch(/confirmed.false/i);
  });

  it("rejects unbounded or malformed candidate and challenge outputs", () => {
    expect(
      contentStrategySchema.safeParse({
        confidence: "HIGH",
        overallRecommendation: "Use a grounded message.",
        positioningAndAngle: [],
        priorityChanges: [
          {
            assumptions: [],
            confidence: "HIGH",
            evidenceReferences: [],
            evidenceStatus: "SUPPORTED",
            id: "REC-1",
            recommendation: "First",
            risk: null,
          },
          {
            assumptions: [],
            confidence: "HIGH",
            evidenceReferences: [],
            evidenceStatus: "SUPPORTED",
            id: "REC-1",
            recommendation: "Duplicate",
            risk: null,
          },
        ],
        risks: [],
        unchanged: [],
      }).success,
    ).toBe(false);
    expect(
      challengeReviewSchema.safeParse({
        challenges: Array.from({ length: 11 }, () => ({})),
        confidence: "HIGH",
        overallSeverity: "LOW",
        summary: "Too many",
      }).success,
    ).toBe(false);
  });

  it("requires explicit judge challenge dispositions and preserves verification needs", () => {
    const review = strategicCouncilReviewSchema.parse({
      approvedRecommendations: [
        {
          evidenceStatus: "WEAKLY_SUPPORTED",
          recommendation: "Test a concise version first.",
          recommendationId: "REC-1",
        },
      ],
      challengeDispositions: [
        {
          challengeReferenceId: "REC-1",
          disposition: "PARTIALLY_ACCEPTED",
          rationale: "The direction is useful, but duration needs validation.",
        },
      ],
      confidence: "MEDIUM",
      finalAssessment: "Proceed with a bounded test.",
      rejectedOrRevisedRecommendations: [],
      risks: ["Audience preference is not established."],
      unresolvedUnknowns: ["Preferred duration"],
      verificationNeeds: ["Run an authorized duration experiment."],
    });
    expect(review.challengeDispositions[0]?.disposition).toBe(
      "PARTIALLY_ACCEPTED",
    );
    expect(review.verificationNeeds).toHaveLength(1);
    expect(JSON.stringify(review)).not.toMatch(/chain.?of.?thought|rawPrompt/i);
  });

  it("supports weak and contradicted evidence without conflating either with unsupported", () => {
    for (const evidenceStatus of [
      "WEAKLY_SUPPORTED",
      "CONTRADICTED_BY_SUPPLIED_EVIDENCE",
    ] as const) {
      const parsed = challengeReviewSchema.parse({
        challenges: [
          {
            category:
              evidenceStatus === "WEAKLY_SUPPORTED"
                ? "MISSING_EVIDENCE"
                : "CONTRADICTION",
            challenge: "Calibrate this recommendation.",
            confidenceCalibration: "Use bounded confidence.",
            contradictionReferences:
              evidenceStatus === "CONTRADICTED_BY_SUPPLIED_EVIDENCE"
                ? ["company.brand"]
                : [],
            counterHypothesis: "An alternative explanation remains plausible.",
            evidenceStatus,
            missingEvidence:
              evidenceStatus === "WEAKLY_SUPPORTED" ? ["More evidence"] : [],
            reconsideration: "RECOMMENDED",
            referenceId: "REC-1",
            riskFlags: [],
            verificationRecommendation: "Verify through an authorized source.",
          },
        ],
        confidence: "MEDIUM",
        overallSeverity: "MEDIUM",
        summary: "Evidence status remains explicit.",
      });
      expect(parsed.challenges[0]?.evidenceStatus).toBe(evidenceStatus);
    }
  });

  it.each(["ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"] as const)(
    "records a %s Challenge Reviewer disposition",
    (disposition) => {
      const review = strategicCouncilReviewSchema.parse({
        approvedRecommendations: [],
        challengeDispositions: [
          {
            challengeReferenceId: "REC-1",
            disposition,
            rationale: "A concise safe rationale.",
          },
        ],
        confidence: "MEDIUM",
        finalAssessment: "Bounded final assessment.",
        rejectedOrRevisedRecommendations: [],
        risks: [],
        unresolvedUnknowns: [],
        verificationNeeds: [],
      });
      expect(review.challengeDispositions[0]?.disposition).toBe(disposition);
    },
  );

  it("requires the Judge to disposition every challenged reference exactly once", () => {
    const challenge = challengeReviewSchema.parse({
      challenges: [
        {
          category: "OVERCONFIDENCE",
          challenge: "Certainty exceeds the evidence.",
          confidenceCalibration: "Reduce confidence.",
          contradictionReferences: [],
          counterHypothesis: null,
          evidenceStatus: "WEAKLY_SUPPORTED",
          missingEvidence: ["Audience response"],
          reconsideration: "REQUIRED",
          referenceId: "REC-1",
          riskFlags: [],
          verificationRecommendation: "Test it.",
        },
      ],
      confidence: "HIGH",
      overallSeverity: "MEDIUM",
      summary: "One challenge.",
    });
    const base = {
      approvedRecommendations: [],
      confidence: "MEDIUM" as const,
      finalAssessment: "Bounded final assessment.",
      rejectedOrRevisedRecommendations: [],
      risks: [],
      unresolvedUnknowns: [],
      verificationNeeds: [],
    };
    expect(
      judgeAddressesEveryChallenge(challenge, {
        ...base,
        challengeDispositions: [
          {
            challengeReferenceId: "REC-1",
            disposition: "ACCEPTED",
            rationale: "Accepted.",
          },
        ],
      }),
    ).toBe(true);
    expect(
      judgeAddressesEveryChallenge(challenge, {
        ...base,
        challengeDispositions: [],
      }),
    ).toBe(false);
  });

  it("projects exact Challenge IDs and disposition count into the Judge schema", () => {
    const challengeReferenceId = "10000000-0000-4000-8000-000000000016";
    const schema = createStrategicCouncilReviewSchema([challengeReferenceId]);
    const base = {
      approvedRecommendations: [],
      confidence: "MEDIUM" as const,
      finalAssessment: "Bounded final assessment.",
      rejectedOrRevisedRecommendations: [],
      risks: [],
      unresolvedUnknowns: [],
      verificationNeeds: [],
    };
    expect(
      schema.safeParse({
        ...base,
        challengeDispositions: [
          {
            challengeReferenceId,
            disposition: "ACCEPTED",
            rationale: "Accepted.",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...base,
        challengeDispositions: [
          {
            challengeReferenceId: "REC-1",
            disposition: "ACCEPTED",
            rationale: "Wrong reference.",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...base, challengeDispositions: [] }).success,
    ).toBe(false);

    const jsonSchema = z.toJSONSchema(schema) as unknown as {
      properties: {
        challengeDispositions: {
          items: { properties: { challengeReferenceId: { enum: string[] } } };
          maxItems: number;
          minItems: number;
        };
      };
    };
    expect(jsonSchema.properties.challengeDispositions).toMatchObject({
      items: {
        properties: {
          challengeReferenceId: { enum: [challengeReferenceId] },
        },
      },
      maxItems: 1,
      minItems: 1,
    });
  });

  it("projects one exact immutable Reel Brief and ignores browser-forge fields", () => {
    const projected = projectReelBrief({
      call_to_action: "Try Stylus",
      caption: "A useful workflow",
      critique: {
        audienceFit: { rating: "STRONG", summary: "Relevant" },
        brandFit: { rating: "STRONG", summary: "Aligned" },
        confidence: "HIGH",
        originality: { rating: "ACCEPTABLE", summary: "Distinct" },
        recommendations: [],
        risks: [],
        strengths: [],
        verdict: "VIABLE",
        weaknesses: [],
      },
      id: "10000000-0000-4000-8000-000000000016",
      primary_hook: "Stop losing context.",
      schema_version: "reel-brief-v1",
      script_sections: [
        { endSecond: 3, purpose: "Open", script: "Start", startSecond: 0 },
      ],
      source_reel_idea_id: "20000000-0000-4000-8000-000000000016",
      spoken_script: "A bounded script.",
      title: "Exact brief",
      version_number: 2,
      visual_directions: [],
    });
    expect(projected.sourceReelBriefVersionId).toBe(
      "10000000-0000-4000-8000-000000000016",
    );
    const forged = strategicReviewRequestSchema.safeParse({
      actorId: "forged",
      idempotencyKey: "30000000-0000-4000-8000-000000000016",
      organizationId: "forged",
      providerUrl: "http://metadata.internal",
      sourceReelBriefVersionId: projected.sourceReelBriefVersionId,
    });
    expect(forged.success).toBe(false);
    const request = strategicReviewRequestSchema.parse({
      idempotencyKey: "30000000-0000-4000-8000-000000000016",
      sourceReelBriefVersionId: projected.sourceReelBriefVersionId,
    });
    expect(request).toEqual({
      idempotencyKey: "30000000-0000-4000-8000-000000000016",
      sourceReelBriefVersionId: projected.sourceReelBriefVersionId,
    });
  });
});
