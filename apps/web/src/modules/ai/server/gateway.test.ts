import { z } from "zod";
import { describe, expect, it } from "vitest";

import { AIError } from "@/modules/ai/errors";

import { ModelGateway } from "./gateway";
import { AIModelRegistry } from "./model-registry";
import { model } from "./model-registry.test";
import { FakeAIProvider } from "./providers/fake";
import { InMemoryAIRunStore } from "./run-store";
import { AIModelRouter, type OrganizationAIRoutingPolicy } from "./router";

const context = {
  actorId: "00000000-0000-4000-8000-000000000001",
  capability: "core.ai.test",
  memoryDomains: [] as const,
  organizationId: "10000000-0000-4000-8000-000000000001",
  pluginId: null,
  runId: "20000000-0000-4000-8000-000000000001",
};
const policy: OrganizationAIRoutingPolicy = {
  allowedProviderIds: [],
  defaultTier: "fast",
  executionMode: "remote_allowed",
  monthlyRemoteCostLimitUsd: null,
  remoteCostSpentUsd: 0,
};
const options = {
  messages: [{ content: "Private prompt", role: "user" as const }],
  timeoutMs: 1_000,
};

function setup(providers: FakeAIProvider[], models = [model()]) {
  const registry = new AIModelRegistry(models);
  const runs = new InMemoryAIRunStore();
  const gateway = new ModelGateway(
    new AIModelRouter(registry),
    providers,
    runs,
  );
  return { gateway, runs };
}

describe("ModelGateway", () => {
  it("normalizes text, usage, cost, and lifecycle metadata without raw responses", async () => {
    const provider = new FakeAIProvider("fake-local", [
      {
        text: "Hello",
        usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
      },
    ]);
    const { gateway, runs } = setup([provider]);
    const result = await gateway.generateText({ context, options, policy });
    expect(result).toEqual({
      estimatedCostUsd: 0,
      finishReason: "stop",
      modelId: "local-fast",
      providerId: "fake-local",
      runId: context.runId,
      text: "Hello",
      usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
    });
    expect(result).not.toHaveProperty("raw");
    expect(runs.starts[0]?.trace).toMatchObject({
      messageCount: 1,
      promptContentStored: false,
    });
    expect(JSON.stringify(runs.starts[0])).not.toContain("Private prompt");
    expect(runs.completions[0]).toMatchObject({ status: "SUCCEEDED" });
  });

  it("returns typed structured output and rejects malformed output", async () => {
    const schema = z.object({ score: z.number().int() });
    const success = setup([
      new FakeAIProvider("fake-local", [{ text: '{"score":7}' }]),
    ]);
    await expect(
      success.gateway.generateStructured({
        context,
        options,
        policy,
        schema,
        schemaName: "score_result",
      }),
    ).resolves.toMatchObject({ data: { score: 7 } });

    const invalid = setup([
      new FakeAIProvider("fake-local", [{ text: '{"score":"bad"}' }]),
    ]);
    await expect(
      invalid.gateway.generateStructured({
        context,
        options,
        policy,
        schema,
        schemaName: "score_result",
      }),
    ).rejects.toMatchObject({ category: "invalid_response" });
    expect(invalid.runs.completions).toHaveLength(1);
    expect(invalid.runs.completions[0]).toMatchObject({
      errorCategory: "invalid_response",
      status: "FAILED",
      trace: {
        failureDiagnostic:
          "structured_output_validation_failed:invalid_type@score",
        finishReason: "stop",
      },
    });
  });

  it("records safe malformed and truncated structured-output diagnostics", async () => {
    const schema = z.object({ score: z.number().int() });
    const malformed = setup([
      new FakeAIProvider("fake-local", [{ text: "{" }]),
    ]);
    await expect(
      malformed.gateway.generateStructured({
        context,
        options,
        policy,
        schema,
        schemaName: "score_result",
      }),
    ).rejects.toMatchObject({ category: "invalid_response" });
    expect(malformed.runs.completions[0]).toMatchObject({
      trace: {
        failureDiagnostic: "structured_output_malformed_json",
        finishReason: "stop",
      },
    });

    const truncated = setup([
      new FakeAIProvider("fake-local", [
        {
          finishReason: "length",
          text: "{",
          usage: { inputTokens: 10, outputTokens: 100, totalTokens: 110 },
        },
      ]),
    ]);
    await expect(
      truncated.gateway.generateStructured({
        context: { ...context, runId: crypto.randomUUID() },
        options,
        policy,
        schema,
        schemaName: "score_result",
      }),
    ).rejects.toMatchObject({ category: "invalid_response" });
    expect(truncated.runs.completions[0]).toMatchObject({
      trace: {
        failureDiagnostic: "structured_output_truncated",
        finishReason: "length",
      },
      usage: { inputTokens: 10, outputTokens: 100, totalTokens: 110 },
    });
  });

  it("persists a sanitized provider-envelope path diagnostic without provider values", async () => {
    const provider = new FakeAIProvider("fake-local", []);
    provider.generate = async () => {
      throw new AIError("invalid_response", {
        diagnostic:
          "provider_envelope_invalid:invalid_type@choices.0.message.content",
      });
    };
    const invalid = setup([provider]);

    await expect(
      invalid.gateway.generateStructured({
        context,
        options,
        policy,
        schema: z.object({ score: z.number().int() }),
        schemaName: "score_result",
      }),
    ).rejects.toMatchObject({ category: "invalid_response" });

    expect(invalid.runs.completions[0]).toMatchObject({
      trace: {
        attempts: ["local-fast:1"],
        failureDiagnostic:
          "provider_envelope_invalid:invalid_type@choices.0.message.content",
      },
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
    });
  });

  it("uses bounded retry for transient errors and not for authentication", async () => {
    const transient = new FakeAIProvider("fake-local", [
      { error: "rate_limited" },
      { text: "Recovered" },
    ]);
    await expect(
      setup([transient]).gateway.generateText({ context, options, policy }),
    ).resolves.toMatchObject({ text: "Recovered" });
    expect(transient.calls).toHaveLength(2);

    const authentication = new FakeAIProvider("fake-local", [
      { error: "authentication_failed" },
      { text: "Must not run" },
    ]);
    await expect(
      setup([authentication]).gateway.generateText({
        context,
        options,
        policy,
      }),
    ).rejects.toMatchObject({ category: "authentication_failed" });
    expect(authentication.calls).toHaveLength(1);
  });

  it("falls back only among policy-approved candidates", async () => {
    const local = new FakeAIProvider("fake-local", [
      { error: "provider_unavailable" },
      { error: "provider_unavailable" },
    ]);
    const remote = new FakeAIProvider("fake-remote", [{ text: "Fallback" }]);
    const models = [
      model(),
      model({
        id: "remote-fast",
        location: "remote",
        priority: 200,
        providerId: "fake-remote",
      }),
    ];
    await expect(
      setup([local, remote], models).gateway.generateText({
        context,
        options,
        policy,
      }),
    ).resolves.toMatchObject({ modelId: "remote-fast" });

    const localOnlyRemote = new FakeAIProvider("fake-remote", [
      { text: "Must not run" },
    ]);
    await expect(
      setup(
        [
          new FakeAIProvider("fake-local", [
            { error: "provider_unavailable" },
            { error: "provider_unavailable" },
          ]),
          localOnlyRemote,
        ],
        models,
      ).gateway.generateText({
        context,
        options,
        policy: { ...policy, executionMode: "local_only" },
      }),
    ).rejects.toMatchObject({ category: "provider_unavailable" });
    expect(localOnlyRemote.calls).toHaveLength(0);
  });

  it("records distinct timeout and cancellation states without retrying", async () => {
    const timeout = new FakeAIProvider("fake-local", [
      { delayMs: 2_000, text: "late" },
    ]);
    const timeoutSetup = setup([timeout]);
    await expect(
      timeoutSetup.gateway.generateText({ context, options, policy }),
    ).rejects.toMatchObject({ category: "timeout" });
    expect(timeoutSetup.runs.completions[0]).toMatchObject({
      status: "TIMED_OUT",
    });
    expect(timeout.calls).toHaveLength(1);

    const controller = new AbortController();
    controller.abort();
    const cancelled = new FakeAIProvider("fake-local", [
      { delayMs: 50, text: "never" },
    ]);
    const cancelledSetup = setup([cancelled]);
    await expect(
      cancelledSetup.gateway.generateText({
        context: { ...context, runId: crypto.randomUUID() },
        options: { ...options, signal: controller.signal },
        policy,
      }),
    ).rejects.toMatchObject({ category: "cancelled" });
    expect(cancelledSetup.runs.completions[0]).toMatchObject({
      status: "CANCELLED",
    });
    expect(cancelled.calls).toHaveLength(1);
  });

  it("blocks policy-denied and budget-denied requests before provider calls", async () => {
    const provider = new FakeAIProvider("fake-local", [{ text: "no" }]);
    const configured = setup([provider]);
    await expect(
      configured.gateway.generateText({
        context,
        options,
        policy: { ...policy, executionMode: "disabled" },
      }),
    ).rejects.toBeInstanceOf(AIError);
    expect(provider.calls).toHaveLength(0);
    expect(configured.runs.completions[0]).toMatchObject({
      errorCategory: "policy_denied",
    });

    const remoteProvider = new FakeAIProvider("fake-remote", [{ text: "no" }]);
    const budgetLimited = setup(
      [remoteProvider],
      [
        model({
          costClass: "medium",
          id: "remote-model",
          location: "remote",
          providerId: "fake-remote",
        }),
      ],
    );
    await expect(
      budgetLimited.gateway.generateText({
        context: { ...context, runId: crypto.randomUUID() },
        options,
        policy: {
          ...policy,
          allowedProviderIds: ["fake-remote"],
          monthlyRemoteCostLimitUsd: 1,
          remoteCostSpentUsd: 1,
        },
      }),
    ).rejects.toMatchObject({ category: "budget_exceeded" });
    expect(remoteProvider.calls).toHaveLength(0);
    expect(budgetLimited.runs.completions[0]).toMatchObject({
      errorCategory: "budget_exceeded",
    });
  });
});
