import "server-only";

import type { z } from "zod";

import type { AIExecutionContext, AIToolMetadata } from "@/core/ai/public";
import { AIError } from "@/modules/ai/errors";

export interface AIToolDefinition<
  TInput = unknown,
  TOutput = unknown,
> extends AIToolMetadata {
  execute(input: TInput, context: AIExecutionContext): Promise<TOutput>;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
}

export class AIToolRegistry {
  readonly #tools = new Map<string, AIToolDefinition>();

  register(tool: AIToolDefinition) {
    if (this.#tools.has(tool.id))
      throw new Error(`Duplicate AI tool ID: ${tool.id}`);
    if (!tool.id.startsWith(`${tool.owningPluginId}.`))
      throw new Error("AI tool IDs must be owned by their plugin.");
    this.#tools.set(tool.id, Object.freeze(tool));
    return this;
  }

  get(toolId: string) {
    return this.#tools.get(toolId);
  }

  getAvailable(input: {
    capability: string;
    enabledPluginIds: Iterable<string>;
    pluginId: string;
    toolId: string;
  }) {
    const tool = this.get(input.toolId);
    const enabled = new Set(input.enabledPluginIds);
    if (
      !tool ||
      tool.owningPluginId !== input.pluginId ||
      tool.requiredCapability !== input.capability ||
      !enabled.has(input.pluginId)
    )
      throw new AIError("policy_denied");
    return tool;
  }

  parseInput(tool: AIToolDefinition, modelInput: unknown) {
    const parsed = tool.inputSchema.safeParse(modelInput);
    if (!parsed.success) throw new AIError("invalid_response");
    return parsed.data;
  }
}
