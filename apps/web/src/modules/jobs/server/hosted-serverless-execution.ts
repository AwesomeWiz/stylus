import "server-only";

import { JobExecutor } from "./executor";
import { applicationJobRegistry } from "./registry";
import { SupabaseServerlessJobExecutionStore } from "./supabase-execution-store";

export type HostedServerlessTrigger = "cron" | "immediate";

export function isHostedServerlessExecutionEnabled() {
  return process.env.VERCEL === "1";
}

export async function runOneHostedServerlessJob(
  trigger: HostedServerlessTrigger,
  targetJobId?: string,
) {
  const executor = new JobExecutor(
    `vercel-${trigger}:${crypto.randomUUID()}`,
    applicationJobRegistry,
    new SupabaseServerlessJobExecutionStore(targetJobId),
  );
  return executor.runOne();
}
