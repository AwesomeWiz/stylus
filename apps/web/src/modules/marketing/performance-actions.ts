"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateMarketing } from "./authorization";
import {
  performanceSnapshotSchema,
  publishedContentLifecycleSchema,
  registerPublishedContentSchema,
  type PerformanceActionState,
} from "./performance-learning";
import { deriveAndPersistPerformanceLearnings } from "./server/performance";

function failure(error: unknown): PerformanceActionState {
  if (error && typeof error === "object" && "flatten" in error)
    return {
      fieldErrors: (error as z.ZodError).flatten().fieldErrors,
      status: "error",
    };
  return {
    message: "Performance data could not be saved.",
    status: "error",
  };
}

async function context() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateMarketing(current.membership.role);
  return { current, db: await createServerSupabaseClient() };
}

function refresh() {
  revalidatePath("/apps/marketing/performance");
  revalidatePath("/apps/marketing");
  revalidatePath("/activity");
}

export async function registerPublishedContentAction(
  _state: PerformanceActionState,
  form: FormData,
): Promise<PerformanceActionState> {
  try {
    const parsed = registerPublishedContentSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const { current, db } = await context();
    const { error } = await db.rpc("register_marketing_published_content", {
      p_canonical_url: parsed.canonicalUrl,
      p_content_opportunity_type: parsed.contentOpportunityType,
      p_duration_seconds: parsed.durationSeconds,
      p_internal_label: parsed.internalLabel,
      p_organization_id: current.organization.id,
      p_platform_native_id: parsed.platformNativeId,
      p_published_at: parsed.publishedAt,
      p_source_reel_brief_version_id: parsed.sourceReelBriefVersionId,
    });
    if (error) throw error;
    refresh();
    return { message: "Published Reel registered.", status: "success" };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function addPerformanceSnapshotAction(
  _state: PerformanceActionState,
  form: FormData,
): Promise<PerformanceActionState> {
  try {
    const parsed = performanceSnapshotSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const { current, db } = await context();
    const { error } = await db.rpc("add_marketing_performance_snapshot", {
      p_average_watch_time_seconds: parsed.averageWatchTimeSeconds,
      p_comments: parsed.comments,
      p_completion_rate: parsed.completionRate,
      p_follows: parsed.follows,
      p_likes: parsed.likes,
      p_link_clicks: parsed.linkClicks,
      p_notes: parsed.notes,
      p_observed_at: parsed.observedAt,
      p_organization_id: current.organization.id,
      p_profile_visits: parsed.profileVisits,
      p_published_content_id: parsed.publishedContentId,
      p_reach: parsed.reach,
      p_saves: parsed.saves,
      p_shares: parsed.shares,
      p_source_label: parsed.sourceLabel,
      p_total_watch_time_seconds: parsed.totalWatchTimeSeconds,
      p_views: parsed.views,
    });
    if (error) throw error;
    refresh();
    return { message: "Performance snapshot added.", status: "success" };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function setPublishedContentArchivedAction(
  _state: PerformanceActionState,
  form: FormData,
): Promise<PerformanceActionState> {
  try {
    const parsed = publishedContentLifecycleSchema.parse(
      Object.fromEntries(form.entries()),
    );
    const { current, db } = await context();
    const { error } = await db.rpc("set_marketing_published_content_archived", {
      p_archived: parsed.archived,
      p_content_id: parsed.publishedContentId,
      p_organization_id: current.organization.id,
    });
    if (error) throw error;
    refresh();
    return { status: "success" };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function derivePerformanceLearningsAction(
  _state: PerformanceActionState,
  _form: FormData,
): Promise<PerformanceActionState> {
  void _state;
  void _form;
  try {
    const { current } = await context();
    const result = await deriveAndPersistPerformanceLearnings({
      actorId: current.user.id,
      organizationId: current.organization.id,
    });
    refresh();
    return {
      createdCount: result.createdCount,
      message:
        result.createdCount > 0
          ? `${result.createdCount} supported performance ${result.createdCount === 1 ? "learning" : "learnings"} created.`
          : result.candidateCount > 0
            ? "No new learning was created; the supported evidence is already recorded."
            : "Insufficient comparable evidence. No learning was created.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}
