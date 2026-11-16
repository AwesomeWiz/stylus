import { createHash } from "node:crypto";
import { requireObject, requireUuid } from "./responses.mjs";

// Store explicitly labelled synthetic evidence through the existing bounded
// service RPCs. No SQL writes, adapter fetch, AI run or successful report exists.
export async function createResearchFixture({
  owner,
  service,
  manifest,
  invocation,
  check,
  save,
}) {
  const org = manifest.organizationId;
  manifest.researchFixture ??= {};
  const fixture = manifest.researchFixture;
  const executor = `demo-seed/${manifest.token}`;
  if (!fixture.runId) {
    const result = requireObject(
      check(
        await service.rpc("enqueue_marketing_external_research", {
          p_organization_id: org,
          p_actor_id: manifest.users[0].id,
          p_invocation_key: invocation,
          p_request_snapshot: {
            question:
              "Fictional demo observation; no external retrieval or AI execution.",
            objective: "CONTENT_OBSERVATIONS",
            queryTerms: ["fictional demo"],
            hackerNewsStream: null,
            rssFeedUrls: ["https://example.test/fictional-feed"],
            fictionalDemo: true,
          },
        }),
        "create bounded fictional evidence run",
      ),
      "research enqueue response",
    );
    fixture.runId = requireUuid(result.runId, "research run ID");
    fixture.jobId = requireUuid(result.jobId, "research job ID");
    save();
  }
  const runQuery = () =>
    owner
      .from("marketing_external_research_runs")
      .select("id,job_id,status")
      .eq("organization_id", org)
      .eq("id", fixture.runId)
      .single();
  const readRun = async (label) =>
    requireObject(check(await runQuery(), label), label);
  let run = await readRun("verify exact fictional research run");
  if (run.job_id !== fixture.jobId)
    throw Error("STOP: fictional research job identity mismatch");
  if (run.status === "QUEUED") {
    const job = check(
      await service.rpc("claim_serverless_job", {
        p_job_id: fixture.jobId,
        p_executor_id: executor,
        p_lease_seconds: 120,
      }),
      "claim exact fictional evidence job",
    );
    if (job?.id !== fixture.jobId)
      throw Error("STOP: fictional evidence job could not be claimed");
    check(
      await service.rpc("begin_marketing_external_research", {
        p_job_id: fixture.jobId,
        p_run_id: fixture.runId,
      }),
      "begin fictional evidence fixture",
    );
    run = await readRun("verify begun fictional research run");
  }
  if (run.status === "RUNNING") {
    const excerpt =
      "Fictional observation: trial participants hesitated when the initial workspace exposed every setup choice.";
    const hash = createHash("sha256").update(excerpt).digest("hex");
    const fetchedAt = manifest.startedAt;
    check(
      await service.rpc("record_marketing_external_research_retrieval", {
        p_job_id: fixture.jobId,
        p_run_id: fixture.runId,
        p_sources: [
          {
            sourceKey: "SRC-1",
            adapter: "rss-atom",
            status: "SUCCEEDED",
            canonicalUrl: "https://example.test/fictional-workshop",
            title: "Authored fictional demo; no external retrieval",
            fetchedAt,
            contentHash: hash,
            safeMetadata: {
              fictionalDemo: true,
              provenance: "AUTHORED_TEST_FIXTURE",
              sourceRequest: "rss-atom:fictional-demo",
            },
          },
        ],
        p_evidence: [
          {
            evidenceId: "EVID-1",
            evidenceType: "DISCUSSION",
            sourceKey: "SRC-1",
            excerpt,
            fetchedAt,
            contentHash: hash,
            safeMetadata: { fictionalDemo: true },
          },
        ],
        p_partial: false,
        p_warning_categories: [],
        p_retrieved_count: 1,
        p_dedupe_count: 0,
        p_fetched_bytes: 0,
        p_normalized_characters: excerpt.length,
      }),
      "persist labelled fictional evidence through guarded RPC",
    );
    run = await readRun("verify fictional evidence state");
  }
  if (run.status === "SYNTHESIZING") {
    check(
      await owner.rpc("request_job_cancellation", {
        p_organization_id: org,
        p_job_id: fixture.jobId,
      }),
      "cancel before any fictional synthesis",
    );
    check(
      await service.rpc("acknowledge_job_cancellation", {
        p_job_id: fixture.jobId,
        p_executor_id: executor,
      }),
      "acknowledge fictional job cancellation",
    );
    run = await readRun("verify cancelled fictional research run");
  }
  if (run.status !== "CANCELLED")
    throw Error("STOP: fictional research fixture must remain cancelled");
  const source = requireObject(
    check(
      await owner
        .from("marketing_external_research_sources")
        .select("id,run_id,safe_metadata")
        .eq("organization_id", org)
        .eq("run_id", fixture.runId)
        .eq("source_key", "SRC-1")
        .single(),
      "verify exact fictional source",
    ),
    "research source response",
  );
  const evidence = requireObject(
    check(
      await owner
        .from("marketing_external_research_evidence")
        .select("id,run_id,source_id,evidence_id")
        .eq("organization_id", org)
        .eq("run_id", fixture.runId)
        .eq("evidence_id", "EVID-1")
        .single(),
      "verify exact fictional evidence",
    ),
    "research evidence response",
  );
  if (
    source.safe_metadata?.fictionalDemo !== true ||
    evidence.source_id !== source.id
  )
    throw Error("STOP: fictional evidence provenance mismatch");
  fixture.sourceId = source.id;
  fixture.evidenceId = evidence.id;
  save();
  return { job: { id: fixture.jobId }, run, source, evidence };
}
