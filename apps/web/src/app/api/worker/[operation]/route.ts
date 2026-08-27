import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { AIError, normalizeAIError } from "@/modules/ai/errors";
import { interpretCompetitorReel } from "@/modules/marketing/server/reel-interpretation";
import { reelExtractionResultSchema } from "@/modules/marketing/reel-analysis";

const capability = z.enum([
  "core.worker.echo",
  "marketing.competitor-reels.analyze",
]);
const base = z
  .object({
    version: z.string().min(1).max(40),
    capabilities: z.array(capability).min(1).max(20),
  })
  .strict();
const pair = base
  .extend({ token: z.string().regex(/^[0-9a-f]{64}$/) })
  .strict();
const operationBody = z
  .object({
    jobId: z.uuid(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const jobErrorCategory = z.enum([
  "internal_error",
  "permanent_failure",
  "policy_denied",
  "provider_unavailable",
  "rate_limited",
  "timeout",
  "transient_failure",
  "validation_failed",
]);
const failurePayload = z
  .object({ category: jobErrorCategory, retryable: z.boolean() })
  .strict();
const allowed = new Set([
  "pair",
  "heartbeat",
  "claim",
  "status",
  "progress",
  "complete",
  "fail",
  "cancel",
  "media-authorization",
  "persist-extraction",
]);
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function rateLimited(
  request: Request,
  credential: string | null,
  pairing: boolean,
) {
  const source =
    credential ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const key = createHash("sha256").update(source).digest("hex");
  const now = Date.now();
  const current = requestWindows.get(key);
  const limit = pairing ? 10 : 120;
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function bearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return /^Bearer [0-9a-f]{64}$/.test(value) ? value.slice(7) : null;
}

function brokerDiagnostic(input: {
  category?: string;
  operation: string;
  sqlstate?: string;
  stage: string;
  status: number;
}) {
  console.error("Stylus worker broker operation failed.", input);
}

function sqlstate(value: unknown) {
  return typeof value === "string" && /^[0-9A-Z]{5}$/.test(value)
    ? value
    : undefined;
}

function jobFailureForAI(error: AIError) {
  if (
    error.category === "provider_unavailable" ||
    error.category === "rate_limited" ||
    error.category === "timeout"
  )
    return { category: error.category, retryable: true } as const;
  if (
    error.category === "policy_denied" ||
    error.category === "budget_exceeded"
  )
    return { category: "policy_denied", retryable: false } as const;
  if (
    error.category === "invalid_response" ||
    error.category === "context_limit"
  )
    return { category: "validation_failed", retryable: false } as const;
  return { category: "internal_error", retryable: true } as const;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  try {
    return await handleWorkerRequest(request, context);
  } catch {
    return NextResponse.json({ error: "broker_failure" }, { status: 500 });
  }
}

async function handleWorkerRequest(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  if (!allowed.has(operation))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const length = Number(request.headers.get("content-length") ?? 0);
  const maximumBody = operation === "persist-extraction" ? 524288 : 8192;
  if (length > maximumBody)
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (raw.length > maximumBody)
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (operation === "pair") {
    if (rateLimited(request, null, true))
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const parsed = pair.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "pairing_failed" }, { status: 400 });
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc("pair_windows_worker", {
      p_token: parsed.data.token,
      p_platform: "windows",
      p_version: parsed.data.version,
      p_capabilities: parsed.data.capabilities,
    });
    return error
      ? NextResponse.json({ error: "pairing_failed" }, { status: 401 })
      : NextResponse.json(data);
  }
  const credential = bearer(request);
  if (!credential)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(request, credential, false))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (operation === "heartbeat" || operation === "claim") {
    const parsed = base.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const supabase = createServiceSupabaseClient();
    const result =
      operation === "heartbeat"
        ? await supabase.rpc("worker_heartbeat", {
            p_credential: credential,
            p_version: parsed.data.version,
            p_capabilities: parsed.data.capabilities,
          })
        : await supabase.rpc("worker_claim_job", {
            p_credential: credential,
            p_capabilities: parsed.data.capabilities,
          });
    return result.error
      ? NextResponse.json({ error: "unauthorized" }, { status: 401 })
      : NextResponse.json(result.data);
  }
  const parsed = operationBody.safeParse(body);
  if (!parsed.success) {
    if (operation === "fail")
      brokerDiagnostic({
        operation,
        stage: "failure_envelope_schema",
        status: 400,
      });
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  if (operation === "media-authorization") {
    const { data, error } = await supabase.rpc("worker_authorize_reel_media", {
      p_credential: credential,
      p_job_id: parsed.data.jobId,
    });
    if (error || !data)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const value = data as Record<string, unknown>;
    const storagePath =
      typeof value.storagePath === "string" ? value.storagePath : "";
    const { data: signed, error: signedError } = await supabase.storage
      .from("marketing-reel-media")
      .createSignedUrl(storagePath, 60);
    if (signedError || !signed)
      return NextResponse.json({ error: "operation_failed" }, { status: 409 });
    return NextResponse.json({
      analysisId: value.analysisId,
      downloadUrl: signed.signedUrl,
      reelId: value.reelId,
      sourceSizeBytes: value.sourceSizeBytes,
    });
  }
  if (operation === "persist-extraction") {
    const extractionPayload = reelExtractionResultSchema
      .extend({ analysisId: z.uuid(), reelId: z.uuid() })
      .strict()
      .safeParse(parsed.data.payload);
    if (!extractionPayload.success)
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const { data, error } = await supabase.rpc(
      "worker_persist_reel_extraction",
      {
        p_credential: credential,
        p_job_id: parsed.data.jobId,
        p_payload: extractionPayload.data,
      },
    );
    if (error || !data)
      return NextResponse.json(
        { error: "operation_failed" },
        { status: error?.code === "42501" ? 401 : 409 },
      );
    const trusted = data as Record<string, unknown>;
    if (trusted.interpretationAllowed === true) {
      const extraction = reelExtractionResultSchema
        .strip()
        .parse(extractionPayload.data);
      try {
        await interpretCompetitorReel({
          actorId: String(trusted.actorId),
          analysisId: String(trusted.analysisId),
          extraction,
          jobId: parsed.data.jobId,
          organizationId: String(trusted.organizationId),
          reelId: String(trusted.reelId),
        });
      } catch (rawError) {
        const { data: jobState } = await supabase
          .from("jobs")
          .select("status")
          .eq("id", parsed.data.jobId)
          .maybeSingle();
        if (jobState?.status === "CANCEL_REQUESTED")
          return NextResponse.json({ error: "cancelled" }, { status: 409 });
        const failure = jobFailureForAI(normalizeAIError(rawError));
        brokerDiagnostic({
          category: failure.category,
          operation,
          stage: "trusted_interpretation",
          status: 409,
        });
        return NextResponse.json(
          { error: "interpretation_failed", ...failure },
          { status: 409 },
        );
      }
    }
    return NextResponse.json({ persisted: true });
  }
  if (operation === "fail") {
    const failure = failurePayload.safeParse(parsed.data.payload);
    if (!failure.success) {
      brokerDiagnostic({
        operation,
        stage: "failure_payload_schema",
        status: 400,
      });
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  }
  const { data, error } = await supabase.rpc("worker_job_operation", {
    p_credential: credential,
    p_job_id: parsed.data.jobId,
    p_operation: operation,
    p_payload: parsed.data.payload ?? {},
  });
  if (error) {
    const status = error.code === "42501" ? 401 : 409;
    brokerDiagnostic({
      operation,
      sqlstate: sqlstate(error.code),
      stage: "job_operation_rpc",
      status,
    });
    return NextResponse.json(
      { error: error.code === "42501" ? "unauthorized" : "operation_failed" },
      { status },
    );
  }
  return NextResponse.json(data);
}
