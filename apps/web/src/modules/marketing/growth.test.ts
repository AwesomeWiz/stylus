import { describe, it, expect } from "vitest";
import {
  experimentFields,
  growthMutationSchema,
  hypothesisFields,
  learningFields,
  hypothesisSourceSchema,
} from "./growth";
const id = crypto.randomUUID(),
  foreign = crypto.randomUUID();
describe("growth workflow validation", () => {
  it("keeps beliefs distinct from factual certainty and bounds confidence", () => {
    expect(
      hypothesisFields.parse({
        title: "Setup trust",
        statement: "We believe a clear first step helps",
      }).status,
    ).toBe("DRAFT");
    expect(
      hypothesisFields.safeParse({
        title: "Setup trust",
        statement: "We believe",
        status: "PROVEN",
      }).success,
    ).toBe(false);
    expect(
      hypothesisFields.safeParse({
        title: "Setup trust",
        statement: "We believe",
        confidence: "97%",
      }).success,
    ).toBe(false);
  });
  it("supports qualitative tests and requires criteria before running", () => {
    const base = { title: "Interview ten participants", hypothesisId: id };
    expect(experimentFields.parse(base).status).toBe("DRAFT");
    expect(
      experimentFields.safeParse({ ...base, status: "RUNNING" }).success,
    ).toBe(false);
    expect(
      experimentFields.parse({
        ...base,
        status: "RUNNING",
        successCriteria: "At least 7 of 10 finish without assistance",
      }).status,
    ).toBe("RUNNING");
    expect(
      experimentFields.safeParse({
        ...base,
        startsOn: "2026-11-20",
        endsOn: "2026-11-10",
      }).success,
    ).toBe(false);
  });
  it("requires the exact immutable Evidence binding", () => {
    expect(
      hypothesisSourceSchema.safeParse({ kind: "evidence", id }).success,
    ).toBe(false);
    expect(
      hypothesisSourceSchema.parse({
        kind: "evidence",
        id,
        runId: foreign,
        evidenceKey: "EVID-1",
      }).kind,
    ).toBe("evidence");
    expect(
      hypothesisSourceSchema.safeParse({
        kind: "evidence",
        id,
        runId: foreign,
        evidenceKey: "EVID-1",
        body: "Copied evidence",
      }).success,
    ).toBe(false);
    expect(
      hypothesisSourceSchema.safeParse({ kind: "opportunity", id, index: 4 })
        .success,
    ).toBe(false);
  });
  it("makes Learning and Hypothesis update explicit evaluation choices", () => {
    const base = {
      operation: "evaluate",
      experimentId: id,
      outcome: "INCONCLUSIVE",
      resultSummary: "The sample was too small",
      revision: "2026-11-09T00:00:00Z",
      learning: null,
    };
    expect(growthMutationSchema.parse(base)).toMatchObject({
      learning: null,
      updateHypothesis: false,
    });
    expect(
      growthMutationSchema.safeParse({ ...base, outcome: "FALSE" }).success,
    ).toBe(false);
    expect(
      learningFields.safeParse({ title: "Insight", conclusion: "" }).success,
    ).toBe(false);
  });
  it("rejects browser-supplied authority and unsupported execution kinds", () => {
    const base = {
      operation: "link",
      experimentId: id,
      kind: "task",
      targetId: foreign,
    };
    expect(growthMutationSchema.parse(base)).toMatchObject({ archived: false });
    for (const extra of [
      { organizationId: foreign },
      { actorId: id },
      { kind: "arbitrary-object" },
    ])
      expect(
        growthMutationSchema.safeParse({ ...base, ...extra }).success,
      ).toBe(false);
  });
});
