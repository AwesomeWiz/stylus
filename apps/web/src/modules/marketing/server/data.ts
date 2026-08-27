import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MarketingCampaignRow,
  MarketingCompetitorRow,
  MarketingCreativeBriefRow,
  MarketingReelIdeaRow,
  MarketingResearchRow,
} from "@/lib/supabase/database.types";

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
) {
  const { data, error } = await query;
  if (error) throw new Error(message);
  return data ?? [];
}

export async function listMarketingCompetitors(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_competitors")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCompetitorRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing competitors could not be loaded.",
  );
}
export async function listMarketingCampaigns(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_campaigns")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCampaignRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing campaigns could not be loaded.",
  );
}
export async function listMarketingReelIdeas(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_reel_ideas")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingReelIdeaRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Reel ideas could not be loaded.",
  );
}
export async function listMarketingResearch(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_research")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingResearchRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Marketing research could not be loaded.",
  );
}
export async function listMarketingCreativeBriefs(
  organizationId: string,
  archived = false,
) {
  const db = await createServerSupabaseClient();
  const query = db
    .from("marketing_creative_briefs")
    .select("*")
    .eq("organization_id", organizationId);
  return rows<MarketingCreativeBriefRow>(
    (archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
    ).order("updated_at", { ascending: false }),
    "Creative briefs could not be loaded.",
  );
}
export async function listCoreCompetitorOptions(organizationId: string) {
  const db = await createServerSupabaseClient();
  return rows<{ id: string; name: string }>(
    db
      .from("competitors")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    "Core competitors could not be loaded.",
  );
}

export async function listMarketingCampaignOptions(organizationId: string) {
  const db = await createServerSupabaseClient();
  const campaigns = await rows<
    Pick<MarketingCampaignRow, "archived_at" | "id" | "name">
  >(
    db
      .from("marketing_campaigns")
      .select("archived_at,id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    "Marketing campaign options could not be loaded.",
  );
  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: `${campaign.name}${campaign.archived_at ? " (archived)" : ""}`,
  }));
}

export async function getMarketingOverview(organizationId: string) {
  const [campaigns, competitors, ideas, research, briefs] = await Promise.all([
    listMarketingCampaigns(organizationId),
    listMarketingCompetitors(organizationId),
    listMarketingReelIdeas(organizationId),
    listMarketingResearch(organizationId),
    listMarketingCreativeBriefs(organizationId),
  ]);
  return {
    activeCampaigns: campaigns.filter((item) => item.status === "ACTIVE")
      .length,
    briefCount: briefs.length,
    competitorCount: competitors.length,
    ideaCounts: {
      IDEA: ideas.filter((item) => item.status === "IDEA").length,
      DRAFT: ideas.filter((item) => item.status === "DRAFT").length,
      READY: ideas.filter((item) => item.status === "READY").length,
    },
    recentBriefs: briefs.slice(0, 3),
    recentResearch: research.slice(0, 3),
  };
}
