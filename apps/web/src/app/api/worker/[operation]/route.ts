import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

const capability = z.enum(["core.worker.echo"]);
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
const allowed = new Set([
  "pair",
  "heartbeat",
  "claim",
  "status",
  "progress",
  "complete",
  "fail",
  "cancel",
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

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  if (!allowed.has(operation))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8192)
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (raw.length > 8192)
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  if (operation === "pair") {
    if (rateLimited(request, null, true))
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const parsed = pair.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "pairing_failed" }, { status: 400 });
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
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { data, error } = await supabase.rpc("worker_job_operation", {
    p_credential: credential,
    p_job_id: parsed.data.jobId,
    p_operation: operation,
    p_payload: parsed.data.payload ?? {},
  });
  return error
    ? NextResponse.json(
        { error: error.code === "42501" ? "unauthorized" : "operation_failed" },
        { status: error.code === "42501" ? 401 : 409 },
      )
    : NextResponse.json(data);
}
