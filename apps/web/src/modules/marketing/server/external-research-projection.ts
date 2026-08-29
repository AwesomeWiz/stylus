import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "../authorization";
import { projectExternalResearchEvidence } from "../external-research";

export async function getAuthorizedExternalResearchProjection(input: {
  reportId: string;
  selectedEvidenceIds: string[];
}) {
  const current = await getCurrentOrganizationContext();
  if (!current) throw new Error("External research access denied.");
  assertCanMutateMarketing(current.membership.role);
  const db = await createServerSupabaseClient();
  const { data: report, error: reportError } = await db
    .from("marketing_external_research_reports")
    .select("id, run_id")
    .eq("organization_id", current.organization.id)
    .eq("id", input.reportId)
    .maybeSingle();
  if (reportError || !report)
    throw new Error("External research access denied.");
  const { data: evidence, error: evidenceError } = await db
    .from("marketing_external_research_evidence")
    .select("evidence_id, excerpt, source_id")
    .eq("organization_id", current.organization.id)
    .eq("run_id", report.run_id)
    .in("evidence_id", input.selectedEvidenceIds);
  if (evidenceError) throw new Error("External research access denied.");
  return {
    evidence: projectExternalResearchEvidence({
      evidence: (evidence ?? []).map((item) => ({
        evidenceId: item.evidence_id,
        excerpt: item.excerpt,
        sourceId: item.source_id,
      })),
      selectedEvidenceIds: input.selectedEvidenceIds,
    }),
    reportId: report.id,
  };
}
