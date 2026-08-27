"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "./authorization";
import {
  competitorReelIdSchema,
  competitorReelUploadSchema,
  type MarketingReelActionState,
} from "./schemas";

async function trustedContext() {
  const current = await getCurrentOrganizationContext();
  if (!current) throw new Error("not_authorized");
  assertCanMutateMarketing(current.membership.role);
  return current;
}

function refresh(competitorId?: string) {
  revalidatePath("/apps/marketing/competitors");
  if (competitorId)
    revalidatePath(`/apps/marketing/competitors/${competitorId}`);
  revalidatePath("/activity");
}

export async function createCompetitorReelUploadAction(
  form: FormData,
): Promise<MarketingReelActionState> {
  try {
    const parsed = competitorReelUploadSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const current = await trustedContext();
    const db = await createServerSupabaseClient();
    const { data: competitor, error: competitorError } = await db
      .from("marketing_competitors")
      .select("id")
      .eq("organization_id", current.organization.id)
      .eq("id", parsed.competitorId)
      .is("archived_at", null)
      .maybeSingle();
    if (competitorError || !competitor) throw new Error("invalid_competitor");
    const reelId = crypto.randomUUID();
    const storagePath = `${current.organization.id}/${reelId}/source.mp4`;
    const { error } = await db.from("marketing_competitor_reels").insert({
      archived_at: null,
      average_scene_duration: null,
      created_by: current.user.id,
      cuts_per_minute: null,
      duration_seconds: null,
      extraction_version: null,
      frame_rate: null,
      height: null,
      id: reelId,
      marketing_competitor_id: competitor.id,
      organization_id: current.organization.id,
      original_filename: parsed.fileName,
      processing_status: "UPLOADING",
      scene_count: null,
      scene_timestamps: null,
      source_size_bytes: parsed.fileSize,
      source_url: parsed.sourceUrl,
      storage_path: storagePath,
      updated_by: current.user.id,
      width: null,
    });
    if (error) throw error;
    refresh(parsed.competitorId);
    return {
      message: "Upload authorized.",
      reelId,
      status: "success",
      storagePath,
    };
  } catch {
    return {
      message: "The Reel upload could not be prepared.",
      status: "error",
    };
  }
}

export async function finalizeCompetitorReelUploadAction(
  form: FormData,
): Promise<MarketingReelActionState> {
  try {
    const parsed = competitorReelIdSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const current = await trustedContext();
    const db = await createServerSupabaseClient();
    const { data: reel, error: reelError } = await db
      .from("marketing_competitor_reels")
      .select("id, marketing_competitor_id, source_size_bytes, storage_path")
      .eq("organization_id", current.organization.id)
      .eq("id", parsed.reelId)
      .eq("processing_status", "UPLOADING")
      .maybeSingle();
    if (reelError || !reel) throw new Error("invalid_reel");
    const slash = reel.storage_path.lastIndexOf("/");
    const service = createServiceSupabaseClient();
    const { data: objects, error: objectError } = await service.storage
      .from("marketing-reel-media")
      .list(reel.storage_path.slice(0, slash), {
        limit: 1,
        search: "source.mp4",
      });
    const object = objects?.find((item) => item.name === "source.mp4");
    const size = Number(object?.metadata?.size ?? 0);
    const mime = String(object?.metadata?.mimetype ?? "");
    if (
      objectError ||
      !object ||
      size !== reel.source_size_bytes ||
      size > 100 * 1024 * 1024 ||
      mime !== "video/mp4"
    )
      throw new Error("invalid_object");
    const { error } = await db
      .from("marketing_competitor_reels")
      .update({ processing_status: "UPLOADED", updated_by: current.user.id })
      .eq("organization_id", current.organization.id)
      .eq("id", reel.id);
    if (error) throw error;
    refresh(reel.marketing_competitor_id);
    return { message: "Reel uploaded.", status: "success" };
  } catch {
    return {
      message: "The uploaded MP4 could not be verified.",
      status: "error",
    };
  }
}

export async function requestCompetitorReelAnalysisAction(
  _state: MarketingReelActionState,
  form: FormData,
): Promise<MarketingReelActionState> {
  try {
    const parsed = competitorReelIdSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const current = await trustedContext();
    const db = await createServerSupabaseClient();
    const { data, error } = await db.rpc("enqueue_competitor_reel_analysis", {
      p_organization_id: current.organization.id,
      p_reel_id: parsed.reelId,
    });
    if (error || !data) throw new Error("enqueue_failed");
    refresh();
    return {
      message: `Analysis version ${data.analysis_version} queued.`,
      status: "success",
    };
  } catch {
    return {
      message: "The Reel analysis could not be queued.",
      status: "error",
    };
  }
}

export async function setCompetitorReelArchivedAction(
  _state: MarketingReelActionState,
  form: FormData,
): Promise<MarketingReelActionState> {
  try {
    const parsed = competitorReelIdSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const archived = form.get("archived") === "true";
    const current = await trustedContext();
    const db = await createServerSupabaseClient();
    const { data, error } = await db
      .from("marketing_competitor_reels")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        updated_by: current.user.id,
      })
      .eq("organization_id", current.organization.id)
      .eq("id", parsed.reelId)
      .select("marketing_competitor_id")
      .single();
    if (error || !data) throw new Error("archive_failed");
    refresh(data.marketing_competitor_id);
    return {
      message: archived ? "Reel archived." : "Reel restored.",
      status: "success",
    };
  } catch {
    return { message: "The Reel could not be updated.", status: "error" };
  }
}
