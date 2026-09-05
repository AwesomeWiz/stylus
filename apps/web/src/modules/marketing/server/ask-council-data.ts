import "server-only";

import type {
  MarketingAskCouncilContextRefRow,
  MarketingAskCouncilConversationRow,
  MarketingAskCouncilMessageRow,
  MarketingAskCouncilSpecialistResultRow,
  MarketingAskCouncilTurnRow,
  MarketingExternalResearchReportRow,
  MarketingExternalResearchRunRow,
  MarketingPerformanceLearningRow,
  MarketingReelBriefVersionRow,
  MarketingStrategicCouncilReviewVersionRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
) {
  const { data, error } = await query;
  if (error) throw new Error(message);
  return data ?? [];
}

export async function getAskCouncilWorkspaceData(input: {
  conversationId: string | null;
  organizationId: string;
}) {
  const db = await createServerSupabaseClient();
  const [conversations, reports, researchRuns, performance, briefs, reviews] =
    await Promise.all([
      rows<MarketingAskCouncilConversationRow>(
        db
          .from("marketing_ask_council_conversations")
          .select("*")
          .eq("organization_id", input.organizationId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(50),
        "Ask Council conversations could not be loaded.",
      ),
      rows<MarketingExternalResearchReportRow>(
        db
          .from("marketing_external_research_reports")
          .select("*")
          .eq("organization_id", input.organizationId)
          .order("created_at", { ascending: false })
          .limit(20),
        "Research Report options could not be loaded.",
      ),
      rows<MarketingExternalResearchRunRow>(
        db
          .from("marketing_external_research_runs")
          .select("*")
          .eq("organization_id", input.organizationId)
          .order("created_at", { ascending: false })
          .limit(50),
        "Research context options could not be loaded.",
      ),
      rows<MarketingPerformanceLearningRow>(
        db
          .from("marketing_performance_learnings")
          .select("*")
          .eq("organization_id", input.organizationId)
          .order("created_at", { ascending: false })
          .limit(20),
        "Performance Learning options could not be loaded.",
      ),
      rows<MarketingReelBriefVersionRow>(
        db
          .from("marketing_reel_brief_versions")
          .select("*")
          .eq("organization_id", input.organizationId)
          .order("created_at", { ascending: false })
          .limit(20),
        "Reel Brief options could not be loaded.",
      ),
      rows<MarketingStrategicCouncilReviewVersionRow>(
        db
          .from("marketing_strategic_council_review_versions")
          .select("*")
          .eq("organization_id", input.organizationId)
          .order("created_at", { ascending: false })
          .limit(20),
        "Strategic Review options could not be loaded.",
      ),
    ]);
  const selectedConversation = input.conversationId
    ? (conversations.find((item) => item.id === input.conversationId) ?? null)
    : null;
  const conversationId = selectedConversation?.id ?? null;
  const [messages, turns] = conversationId
    ? await Promise.all([
        rows<MarketingAskCouncilMessageRow>(
          db
            .from("marketing_ask_council_messages")
            .select("*")
            .eq("organization_id", input.organizationId)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(100),
          "Ask Council messages could not be loaded.",
        ),
        rows<MarketingAskCouncilTurnRow>(
          db
            .from("marketing_ask_council_turns")
            .select("*")
            .eq("organization_id", input.organizationId)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(50),
          "Ask Council turns could not be loaded.",
        ),
      ])
    : [[], []];
  const turnIds = turns.map((turn) => turn.id);
  const [specialistResults, contextReferences] = turnIds.length
    ? await Promise.all([
        rows<MarketingAskCouncilSpecialistResultRow>(
          db
            .from("marketing_ask_council_specialist_results")
            .select("*")
            .eq("organization_id", input.organizationId)
            .in("turn_id", turnIds)
            .order("ordinal", { ascending: true })
            .limit(150),
          "Council specialist perspectives could not be loaded.",
        ),
        rows<MarketingAskCouncilContextRefRow>(
          db
            .from("marketing_ask_council_context_refs")
            .select("*")
            .eq("organization_id", input.organizationId)
            .in("turn_id", turnIds)
            .order("created_at", { ascending: true })
            .limit(750),
          "Ask Council provenance could not be loaded.",
        ),
      ])
    : [[], []];
  const runById = new Map(researchRuns.map((run) => [run.id, run]));
  return {
    briefs,
    contextReferences,
    conversations,
    messages,
    performance,
    reports: reports.map((report) => ({
      ...report,
      question: String(
        (
          runById.get(report.run_id)?.request_snapshot as Record<
            string,
            unknown
          >
        )?.question ?? `Research report ${report.id.slice(0, 8)}`,
      ),
    })),
    reviews,
    selectedConversation,
    specialistResults,
    turns,
  };
}
