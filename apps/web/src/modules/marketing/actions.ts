"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { assertCanMutateMarketing } from "./authorization";
import {
  briefSchema,
  campaignSchema,
  competitorSchema,
  lifecycleSchema,
  type MarketingActionState,
  reelIdeaSchema,
  researchSchema,
} from "./schemas";
import {
  saveMarketingCampaign,
  saveMarketingCompetitor,
  saveMarketingCreativeBrief,
  saveMarketingReelIdea,
  saveMarketingResearch,
  setMarketingCampaignArchived,
  setMarketingCompetitorArchived,
  setMarketingCreativeBriefArchived,
  setMarketingReelIdeaArchived,
  setMarketingResearchArchived,
} from "./server/mutations";

function values(form: FormData) {
  return Object.fromEntries(form.entries());
}
function failure(error: unknown): MarketingActionState {
  if (error && typeof error === "object" && "flatten" in error)
    return {
      fieldErrors: (error as z.ZodError).flatten().fieldErrors,
      status: "error",
    };
  return {
    message: "The Marketing record could not be saved.",
    status: "error",
  };
}
async function context() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateMarketing(current.membership.role);
  return { current, db: await createServerSupabaseClient() };
}
function done(path: string): MarketingActionState {
  revalidatePath(path);
  revalidatePath("/apps/marketing");
  revalidatePath("/activity");
  return { status: "success" };
}
async function execute(work: () => Promise<unknown>, path: string) {
  try {
    await work();
    return done(path);
  } catch (error) {
    unstable_rethrow(error);
    return failure(error);
  }
}

export async function saveMarketingCompetitorAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = competitorSchema.parse(values(form));
    const { current, db } = await context();
    await saveMarketingCompetitor(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed,
    );
  }, "/apps/marketing/competitors");
}
export async function setMarketingCompetitorArchivedAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = lifecycleSchema.parse(values(form));
    const { current, db } = await context();
    await setMarketingCompetitorArchived(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed.recordId,
      parsed.archived,
    );
  }, "/apps/marketing/competitors");
}

export async function saveMarketingCampaignAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = campaignSchema.parse(values(form));
    const { current, db } = await context();
    await saveMarketingCampaign(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed,
    );
  }, "/apps/marketing/campaigns");
}
export async function setMarketingCampaignArchivedAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = lifecycleSchema.parse(values(form));
    const { current, db } = await context();
    await setMarketingCampaignArchived(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed.recordId,
      parsed.archived,
    );
  }, "/apps/marketing/campaigns");
}

export async function saveMarketingReelIdeaAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = reelIdeaSchema.parse(values(form));
    const { current, db } = await context();
    await saveMarketingReelIdea(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed,
    );
  }, "/apps/marketing/reel-ideas");
}
export async function setMarketingReelIdeaArchivedAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = lifecycleSchema.parse(values(form));
    const { current, db } = await context();
    await setMarketingReelIdeaArchived(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed.recordId,
      parsed.archived,
    );
  }, "/apps/marketing/reel-ideas");
}

export async function saveMarketingResearchAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = researchSchema.parse(values(form));
    const { current, db } = await context();
    await saveMarketingResearch(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed,
    );
  }, "/apps/marketing/research");
}
export async function setMarketingResearchArchivedAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = lifecycleSchema.parse(values(form));
    const { current, db } = await context();
    await setMarketingResearchArchived(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed.recordId,
      parsed.archived,
    );
  }, "/apps/marketing/research");
}

export async function saveMarketingCreativeBriefAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = briefSchema.parse(values(form));
    const { current, db } = await context();
    await saveMarketingCreativeBrief(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed,
    );
  }, "/apps/marketing/creative-briefs");
}
export async function setMarketingCreativeBriefArchivedAction(
  _: MarketingActionState,
  form: FormData,
) {
  return execute(async () => {
    const parsed = lifecycleSchema.parse(values(form));
    const { current, db } = await context();
    await setMarketingCreativeBriefArchived(
      db,
      { actorId: current.user.id, organizationId: current.organization.id },
      parsed.recordId,
      parsed.archived,
    );
  }, "/apps/marketing/creative-briefs");
}
