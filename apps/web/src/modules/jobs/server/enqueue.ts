import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { builtInPluginRegistry } from "@/plugins";

import { assertCanEnqueueJob, JobAuthorizationError } from "../authorization";
import { applicationJobRegistry } from "./registry";

export interface EnqueueRegisteredJobInput {
  idempotencyKey?: string;
  input: unknown;
  jobType: string;
  scheduledAt?: Date;
}

export async function enqueueRegisteredJob(input: EnqueueRegisteredJobInput) {
  const context = await getCurrentOrganizationContext();
  if (!context) throw new JobAuthorizationError();
  assertCanEnqueueJob(context.membership.role);
  const definition = applicationJobRegistry.get(input.jobType);
  if (!definition) throw new Error("Registered job type required");
  const parsedInput = definition.inputSchema.parse(input.input);
  if (definition.idempotency === "REQUIRED" && !input.idempotencyKey)
    throw new Error("Job idempotency key required");
  if (definition.idempotency === "NONE" && input.idempotencyKey)
    throw new Error("Job type does not support idempotency");

  let pluginId: string | null = null;
  if (definition.origin.kind === "plugin") {
    pluginId = definition.origin.pluginId;
    const plugin = builtInPluginRegistry.get(pluginId);
    if (
      !plugin ||
      !plugin.manifest.capabilities.includes(definition.capability)
    )
      throw new JobAuthorizationError();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("organization_plugins")
      .select("enabled")
      .eq("organization_id", context.organization.id)
      .eq("plugin_id", pluginId)
      .maybeSingle();
    if (error || !data?.enabled) throw new JobAuthorizationError();
  }

  const serialized = JSON.stringify(parsedInput);
  if (Buffer.byteLength(serialized, "utf8") > 16_384)
    throw new Error("Job input exceeds the metadata limit");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("enqueue_job", {
    p_capability: definition.capability,
    p_concurrency_group: definition.concurrencyGroup ?? null,
    p_execution_class: definition.executionClass,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_input_metadata: parsedInput as Record<string, unknown>,
    p_job_type: definition.id,
    p_max_attempts: definition.maxAttempts,
    p_organization_id: context.organization.id,
    p_plugin_id: pluginId,
    p_priority: definition.priority,
    p_scheduled_at: input.scheduledAt?.toISOString() ?? null,
    p_timeout_seconds: Math.ceil(definition.timeoutMs / 1_000),
  });
  if (error || !data) throw new Error("Job could not be enqueued");
  return data;
}
