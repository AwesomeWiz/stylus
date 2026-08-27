import { z } from "zod";

export { z };

export const jobTypeSchema = z
  .string()
  .min(5)
  .max(100)
  .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/);

export const jobCapabilitySchema = jobTypeSchema;
export const jobExecutionClassSchema = z.enum([
  "DATABASE",
  "SERVERLESS",
  "EXTERNAL_WORKER",
]);
export const jobErrorCategorySchema = z.enum([
  "validation_failed",
  "policy_denied",
  "provider_unavailable",
  "rate_limited",
  "timeout",
  "cancelled",
  "transient_failure",
  "permanent_failure",
  "internal_error",
]);
export const jobSideEffectSchema = z.enum([
  "NONE",
  "IDEMPOTENT_WRITE",
  "EXTERNAL_SIDE_EFFECT",
]);

export type JobExecutionClass = z.infer<typeof jobExecutionClassSchema>;
export type JobErrorCategory = z.infer<typeof jobErrorCategorySchema>;

export interface JobHandlerContext {
  readonly actorId: string;
  readonly attempt: number;
  readonly jobId: string;
  readonly organizationId: string;
  readonly origin: Readonly<
    { kind: "core" } | { kind: "plugin"; pluginId: string }
  >;
  readonly signal: AbortSignal;
  heartbeat(): Promise<void>;
  isCancellationRequested(): Promise<boolean>;
  reportProgress(progress: number, message: string): Promise<void>;
}

export type JobHandler<TInput, TOutput> = {
  bivarianceHack(input: TInput, context: JobHandlerContext): Promise<TOutput>;
}["bivarianceHack"];

export interface JobDefinition<TInput = unknown, TOutput = unknown> {
  readonly capability: string;
  readonly concurrencyGroup?: string;
  readonly description: string;
  readonly executionClass: JobExecutionClass;
  readonly handler?: JobHandler<TInput, TOutput>;
  readonly hostedExecutionSupported: boolean;
  readonly id: string;
  readonly idempotency: "NONE" | "OPTIONAL" | "REQUIRED";
  readonly inputSchema: z.ZodType<TInput>;
  readonly maxAttempts: number;
  readonly origin: Readonly<
    { kind: "core" } | { kind: "plugin"; pluginId: string }
  >;
  readonly outputSchema: z.ZodType<TOutput>;
  readonly priority: number;
  readonly retryableCategories: readonly JobErrorCategory[];
  readonly sideEffect: z.infer<typeof jobSideEffectSchema>;
  readonly timeoutMs: number;
}

const definitionMetadataSchema = z
  .object({
    capability: jobCapabilitySchema,
    concurrencyGroup: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z][a-z0-9:._/-]*$/)
      .optional(),
    description: z.string().trim().min(10).max(280),
    executionClass: jobExecutionClassSchema,
    hostedExecutionSupported: z.boolean(),
    id: jobTypeSchema,
    idempotency: z.enum(["NONE", "OPTIONAL", "REQUIRED"]),
    maxAttempts: z.number().int().min(1).max(10),
    origin: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("core") }).strict(),
      z
        .object({
          kind: z.literal("plugin"),
          pluginId: z
            .string()
            .min(2)
            .max(50)
            .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
        })
        .strict(),
    ]),
    priority: z.number().int().min(0).max(100),
    retryableCategories: z.array(jobErrorCategorySchema).max(9),
    sideEffect: jobSideEffectSchema,
    timeoutMs: z.number().int().min(1_000).max(86_400_000),
  })
  .strict();

export function defineJob<TInput, TOutput>(
  definition: JobDefinition<TInput, TOutput>,
): Readonly<JobDefinition<TInput, TOutput>> {
  definitionMetadataSchema.parse({
    capability: definition.capability,
    concurrencyGroup: definition.concurrencyGroup,
    description: definition.description,
    executionClass: definition.executionClass,
    hostedExecutionSupported: definition.hostedExecutionSupported,
    id: definition.id,
    idempotency: definition.idempotency,
    maxAttempts: definition.maxAttempts,
    origin: definition.origin,
    priority: definition.priority,
    retryableCategories: [...definition.retryableCategories],
    sideEffect: definition.sideEffect,
    timeoutMs: definition.timeoutMs,
  });
  const owner =
    definition.origin.kind === "core" ? "core" : definition.origin.pluginId;
  if (!definition.id.startsWith(`${owner}.`))
    throw new Error(`Job type "${definition.id}" is not owned by "${owner}".`);
  if (!definition.capability.startsWith(`${owner}.`))
    throw new Error(
      `Job capability "${definition.capability}" is not owned by "${owner}".`,
    );
  if (
    definition.executionClass !== "DATABASE" &&
    typeof definition.handler !== "function"
  )
    throw new Error(
      `Job "${definition.id}" requires a statically registered handler.`,
    );
  return Object.freeze({ ...definition });
}

export class JobRegistry {
  readonly #definitions = new Map<string, Readonly<JobDefinition>>();

  constructor(definitions: readonly JobDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: JobDefinition) {
    const normalized = defineJob(definition);
    if (this.#definitions.has(normalized.id))
      throw new Error(`Duplicate job type: ${normalized.id}`);
    this.#definitions.set(normalized.id, normalized);
    return this;
  }

  get(jobType: string) {
    return this.#definitions.get(jobType);
  }

  list() {
    return [...this.#definitions.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }
}

export function createJobRegistry(definitions: readonly JobDefinition[]) {
  return new JobRegistry(definitions);
}
