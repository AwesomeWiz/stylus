import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
type Context = { actorId: string; organizationId: string };
type Parsed<T> = T & { recordId: string | null };

async function finish(query: PromiseLike<{ error: unknown }>) {
  const { error } = await query;
  if (error) throw error;
}

export async function saveMarketingCompetitor(
  db: Db,
  context: Context,
  value: Parsed<{
    name: string;
    websiteUrl: string | null;
    instagramHandle: string | null;
    instagramProfileUrl: string | null;
    notes: string | null;
    coreCompetitorId: string | null;
  }>,
) {
  const record = {
    core_competitor_id: value.coreCompetitorId,
    instagram_handle: value.instagramHandle,
    instagram_profile_url: value.instagramProfileUrl,
    name: value.name,
    notes: value.notes,
    updated_by: context.actorId,
    website_url: value.websiteUrl,
  };
  return value.recordId
    ? finish(
        db
          .from("marketing_competitors")
          .update(record)
          .eq("organization_id", context.organizationId)
          .eq("id", value.recordId)
          .is("archived_at", null),
      )
    : finish(
        db.from("marketing_competitors").insert({
          ...record,
          created_by: context.actorId,
          organization_id: context.organizationId,
        }),
      );
}
export async function setMarketingCompetitorArchived(
  db: Db,
  context: Context,
  id: string,
  archived: boolean,
) {
  return finish(
    db
      .from("marketing_competitors")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: context.actorId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", id),
  );
}

export async function saveMarketingCampaign(
  db: Db,
  context: Context,
  value: Parsed<{
    name: string;
    objective: string;
    notes: string | null;
    startsOn: string | null;
    endsOn: string | null;
    status: "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED";
  }>,
) {
  const record = {
    ends_on: value.endsOn,
    name: value.name,
    notes: value.notes,
    objective: value.objective,
    starts_on: value.startsOn,
    status: value.status,
    updated_by: context.actorId,
  };
  return value.recordId
    ? finish(
        db
          .from("marketing_campaigns")
          .update(record)
          .eq("organization_id", context.organizationId)
          .eq("id", value.recordId)
          .is("archived_at", null),
      )
    : finish(
        db.from("marketing_campaigns").insert({
          ...record,
          created_by: context.actorId,
          organization_id: context.organizationId,
        }),
      );
}
export async function setMarketingCampaignArchived(
  db: Db,
  context: Context,
  id: string,
  archived: boolean,
) {
  return finish(
    db
      .from("marketing_campaigns")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: context.actorId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", id),
  );
}

export async function saveMarketingReelIdea(
  db: Db,
  context: Context,
  value: Parsed<{
    title: string;
    concept: string | null;
    hook: string | null;
    contentAngle: string | null;
    callToAction: string | null;
    notes: string | null;
    status: "IDEA" | "DRAFT" | "READY";
    campaignId: string | null;
  }>,
) {
  const record = {
    call_to_action: value.callToAction,
    campaign_id: value.campaignId,
    concept: value.concept,
    content_angle: value.contentAngle,
    hook: value.hook,
    notes: value.notes,
    status: value.status,
    title: value.title,
    updated_by: context.actorId,
  };
  return value.recordId
    ? finish(
        db
          .from("marketing_reel_ideas")
          .update(record)
          .eq("organization_id", context.organizationId)
          .eq("id", value.recordId)
          .is("archived_at", null),
      )
    : finish(
        db.from("marketing_reel_ideas").insert({
          ...record,
          created_by: context.actorId,
          organization_id: context.organizationId,
        }),
      );
}
export async function setMarketingReelIdeaArchived(
  db: Db,
  context: Context,
  id: string,
  archived: boolean,
) {
  return finish(
    db
      .from("marketing_reel_ideas")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: context.actorId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", id),
  );
}

export async function saveMarketingResearch(
  db: Db,
  context: Context,
  value: Parsed<{
    title: string;
    content: string;
    sourceLabel: string | null;
    sourceUrl: string | null;
    category: "CUSTOMER" | "COMPETITOR" | "TREND" | "CONTENT" | "OTHER";
  }>,
) {
  const record = {
    category: value.category,
    content: value.content,
    source_label: value.sourceLabel,
    source_url: value.sourceUrl,
    title: value.title,
    updated_by: context.actorId,
  };
  return value.recordId
    ? finish(
        db
          .from("marketing_research")
          .update(record)
          .eq("organization_id", context.organizationId)
          .eq("id", value.recordId)
          .is("archived_at", null),
      )
    : finish(
        db.from("marketing_research").insert({
          ...record,
          created_by: context.actorId,
          organization_id: context.organizationId,
        }),
      );
}
export async function setMarketingResearchArchived(
  db: Db,
  context: Context,
  id: string,
  archived: boolean,
) {
  return finish(
    db
      .from("marketing_research")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: context.actorId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", id),
  );
}

export async function saveMarketingCreativeBrief(
  db: Db,
  context: Context,
  value: Parsed<{
    title: string;
    objective: string;
    targetAudience: string | null;
    coreMessage: string | null;
    toneDirection: string | null;
    callToAction: string | null;
    visualDirection: string | null;
    notes: string | null;
    status: "DRAFT" | "READY" | "APPROVED";
    campaignId: string | null;
  }>,
) {
  const record = {
    call_to_action: value.callToAction,
    campaign_id: value.campaignId,
    core_message: value.coreMessage,
    notes: value.notes,
    objective: value.objective,
    status: value.status,
    target_audience: value.targetAudience,
    title: value.title,
    tone_direction: value.toneDirection,
    updated_by: context.actorId,
    visual_direction: value.visualDirection,
  };
  return value.recordId
    ? finish(
        db
          .from("marketing_creative_briefs")
          .update(record)
          .eq("organization_id", context.organizationId)
          .eq("id", value.recordId)
          .is("archived_at", null),
      )
    : finish(
        db.from("marketing_creative_briefs").insert({
          ...record,
          created_by: context.actorId,
          organization_id: context.organizationId,
        }),
      );
}
export async function setMarketingCreativeBriefArchived(
  db: Db,
  context: Context,
  id: string,
  archived: boolean,
) {
  return finish(
    db
      .from("marketing_creative_briefs")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: context.actorId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", id),
  );
}
