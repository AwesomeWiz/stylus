import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { isAuthorizedCronRequest } from "@/modules/jobs/server/cron-auth";
import { JobExecutor } from "@/modules/jobs/server/executor";
import { applicationJobRegistry } from "@/modules/jobs/server/registry";
import { SupabaseServerlessJobExecutionStore } from "@/modules/jobs/server/supabase-execution-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      serverEnv.CRON_SECRET,
    )
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const executor = new JobExecutor(
      `vercel-cron:${crypto.randomUUID()}`,
      applicationJobRegistry,
      new SupabaseServerlessJobExecutionStore(),
    );
    const jobId = await executor.runOne();
    return NextResponse.json({ processed: Boolean(jobId) });
  } catch {
    return NextResponse.json(
      { error: "executor_unavailable" },
      { status: 503 },
    );
  }
}
