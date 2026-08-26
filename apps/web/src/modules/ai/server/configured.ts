import "server-only";

import { serverEnv } from "@/lib/env/server";

import { ModelGateway } from "./gateway";
import { AIModelRegistry, type AIModelDefinition } from "./model-registry";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";
import type { AIRunStore } from "./run-store";
import { AIModelRouter } from "./router";

function configuredModels() {
  const models: AIModelDefinition[] = [];
  if (serverEnv.STYLUS_AI_OLLAMA_MODEL) {
    models.push({
      capabilities: { structuredOutput: true, tools: false },
      contextWindow: null,
      costClass: "free",
      enabled: true,
      id: "ollama-default",
      location: "local",
      logicalTiers: ["fast", "balanced", "reasoning"],
      pricing: {
        inputUsdPerMillionTokens: 0,
        outputUsdPerMillionTokens: 0,
      },
      priority: 100,
      providerId: "ollama",
      providerModel: serverEnv.STYLUS_AI_OLLAMA_MODEL,
    });
  }
  if (
    serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL &&
    serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_MODEL
  ) {
    const inputPrice = serverEnv.STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION;
    const outputPrice = serverEnv.STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION;
    models.push({
      capabilities: { structuredOutput: true, tools: false },
      contextWindow: null,
      costClass: inputPrice === 0 && outputPrice === 0 ? "free" : "medium",
      enabled: true,
      id: "remote-default",
      location: "remote",
      logicalTiers: ["fast", "balanced", "reasoning"],
      ...(inputPrice !== undefined && outputPrice !== undefined
        ? {
            pricing: {
              inputUsdPerMillionTokens: inputPrice,
              outputUsdPerMillionTokens: outputPrice,
            },
          }
        : {}),
      priority: 200,
      providerId: "openai-compatible",
      providerModel: serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_MODEL,
    });
  }
  return models;
}

export const configuredAIModelRegistry = new AIModelRegistry(
  configuredModels(),
);

export function getConfiguredAIProviderIds() {
  return [
    ...(serverEnv.STYLUS_AI_OLLAMA_MODEL ? ["ollama"] : []),
    ...(serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL &&
    serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_MODEL
      ? ["openai-compatible"]
      : []),
  ];
}

export function createConfiguredModelGateway(runStore: AIRunStore) {
  const providers = [];
  if (serverEnv.STYLUS_AI_OLLAMA_MODEL)
    providers.push(
      new OpenAICompatibleProvider("ollama", {
        baseUrl:
          serverEnv.STYLUS_AI_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
        healthPath: "/api/tags",
      }),
    );
  if (
    serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL &&
    serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_MODEL
  )
    providers.push(
      new OpenAICompatibleProvider("openai-compatible", {
        apiKey: serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_API_KEY,
        baseUrl: serverEnv.STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL,
      }),
    );
  const router = new AIModelRouter(configuredAIModelRegistry);
  return new ModelGateway(router, providers, runStore);
}
