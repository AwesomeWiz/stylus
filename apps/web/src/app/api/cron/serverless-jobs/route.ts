import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { isAuthorizedCronRequest } from "@/modules/jobs/server/cron-auth";
import { runOneHostedServerlessJob } from "@/modules/jobs/server/hosted-serverless-execution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      serverEnv.CRON_SECRET,
    )
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const jobId = await runOneHostedServerlessJob("cron");
    return NextResponse.json({ processed: Boolean(jobId) });
  } catch {
    return NextResponse.json(
      { error: "executor_unavailable" },
      { status: 503 },
    );
  }
}
