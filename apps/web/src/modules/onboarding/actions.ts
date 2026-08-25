"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanManageOnboarding } from "./authorization";
import {
  audienceStepSchema,
  companyStepSchema,
  competitorsStepSchema,
  marketingStepSchema,
  type OnboardingActionState,
  positioningBrandStepSchema,
  problemStepSchema,
  productStepSchema,
} from "./schemas";
import {
  getNextOnboardingPath,
  getOnboardingStep,
  type OnboardingStepSlug,
} from "./steps";

function values(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function nullable(valueToNormalize: string) {
  const trimmed = valueToNormalize.trim();
  return trimmed || null;
}

function errorState(error: unknown): OnboardingActionState {
  if (error && typeof error === "object" && "flatten" in error) {
    const flattened = (
      error as { flatten(): { fieldErrors: Record<string, string[]> } }
    ).flatten();
    return { fieldErrors: flattened.fieldErrors, status: "error" };
  }
  return {
    message: "Your progress could not be saved. Please try again.",
    status: "error",
  };
}

export async function saveOnboardingStepAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const stepSlug = value(formData, "step") as OnboardingStepSlug;
  const step = getOnboardingStep(stepSlug);
  if (!step || stepSlug === "review")
    return { message: "Invalid onboarding step.", status: "error" };

  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanManageOnboarding(current.membership.role);

  const supabase = await createServerSupabaseClient();
  const audit = {
    organization_id: current.organization.id,
    updated_by: current.user.id,
  };
  let operation: PromiseLike<{ error: unknown }>;

  try {
    if (stepSlug === "company") {
      const parsed = companyStepSchema.parse({
        companyName: value(formData, "companyName"),
        industry: value(formData, "industry"),
        instagram: value(formData, "instagram"),
        primaryMarket: value(formData, "primaryMarket"),
        shortDescription: value(formData, "shortDescription"),
        stage: value(formData, "stage"),
        website: value(formData, "website"),
      });
      const { data: existingCompany } = await supabase
        .from("company_profiles")
        .select("created_by")
        .eq("organization_id", current.organization.id)
        .maybeSingle();
      operation = supabase.from("company_profiles").upsert({
        ...audit,
        company_name: parsed.companyName,
        created_by: existingCompany?.created_by ?? current.user.id,
        industry: parsed.industry,
        instagram: nullable(parsed.instagram),
        primary_market: nullable(parsed.primaryMarket),
        short_description: parsed.shortDescription,
        stage: parsed.stage,
        website: nullable(parsed.website),
      });
    } else if (stepSlug === "problem") {
      const parsed = problemStepSchema.parse({
        affectedAudience: value(formData, "affectedAudience"),
        coreInsight: value(formData, "coreInsight"),
        currentAlternatives: values(formData, "currentAlternatives"),
        problemImportance: value(formData, "problemImportance"),
        problemStatement: value(formData, "problemStatement"),
        startupIdea: value(formData, "startupIdea"),
      });
      operation = supabase
        .from("company_profiles")
        .update({
          affected_audience: nullable(parsed.affectedAudience),
          core_insight: nullable(parsed.coreInsight),
          current_alternatives: parsed.currentAlternatives,
          problem_importance: nullable(parsed.problemImportance),
          problem_statement: parsed.problemStatement,
          startup_idea: parsed.startupIdea,
          updated_by: current.user.id,
        })
        .eq("organization_id", current.organization.id);
    } else if (stepSlug === "product") {
      const parsed = productStepSchema.parse({
        coreCapabilities: values(formData, "coreCapabilities"),
        differentiators: values(formData, "differentiators"),
        nearTermObjective: value(formData, "nearTermObjective"),
        productConcept: value(formData, "productConcept"),
        productStatus: value(formData, "productStatus"),
        valueProposition: value(formData, "valueProposition"),
      });
      operation = supabase
        .from("company_profiles")
        .update({
          core_capabilities: parsed.coreCapabilities,
          differentiators: parsed.differentiators,
          near_term_objective: nullable(parsed.nearTermObjective),
          product_concept: parsed.productConcept,
          product_status: parsed.productStatus,
          updated_by: current.user.id,
          value_proposition: parsed.valueProposition,
        })
        .eq("organization_id", current.organization.id);
    } else if (stepSlug === "audience") {
      const parsed = audienceStepSchema.parse({
        attentionChannels: values(formData, "attentionChannels"),
        characteristics: values(formData, "characteristics"),
        description: value(formData, "description"),
        goals: values(formData, "goals"),
        motivations: values(formData, "motivations"),
        name: value(formData, "name"),
        objections: values(formData, "objections"),
        painPoints: values(formData, "painPoints"),
      });
      const { data: primary } = await supabase
        .from("audience_profiles")
        .select("created_by, id")
        .eq("organization_id", current.organization.id)
        .eq("is_primary", true)
        .maybeSingle();
      const row = {
        ...audit,
        attention_channels: parsed.attentionChannels,
        characteristics: parsed.characteristics,
        created_by: primary?.created_by ?? current.user.id,
        description: parsed.description,
        goals: parsed.goals,
        is_primary: true,
        motivations: parsed.motivations,
        name: parsed.name,
        objections: parsed.objections,
        pain_points: parsed.painPoints,
      };
      operation = primary
        ? supabase.from("audience_profiles").update(row).eq("id", primary.id)
        : supabase.from("audience_profiles").insert(row);
    } else if (stepSlug === "positioning-brand") {
      const parsed = positioningBrandStepSchema.parse({
        avoid: values(formData, "avoid"),
        brandStatus: value(formData, "brandStatus"),
        communicationTraits: values(formData, "communicationTraits"),
        desiredEmotions: values(formData, "desiredEmotions"),
        desiredPerception: value(formData, "desiredPerception"),
        emphasize: values(formData, "emphasize"),
        keyPromise: value(formData, "keyPromise"),
        personalityTraits: values(formData, "personalityTraits"),
        positioningCategory: value(formData, "positioningCategory"),
        positioningDifference: value(formData, "positioningDifference"),
        primaryColors: values(formData, "primaryColors"),
        reasonsToBelieve: values(formData, "reasonsToBelieve"),
        statusQuo: value(formData, "statusQuo"),
        toneOfVoice: values(formData, "toneOfVoice"),
        visualDirection: value(formData, "visualDirection"),
      });
      const { data: existingBrand } = await supabase
        .from("brand_profiles")
        .select("created_by")
        .eq("organization_id", current.organization.id)
        .maybeSingle();
      operation = supabase.from("brand_profiles").upsert({
        ...audit,
        avoid: parsed.avoid,
        communication_traits: parsed.communicationTraits,
        created_by: existingBrand?.created_by ?? current.user.id,
        desired_emotions: parsed.desiredEmotions,
        emphasize: parsed.emphasize,
        personality_traits: parsed.personalityTraits,
        primary_colors: parsed.primaryColors,
        status: parsed.brandStatus,
        tone_of_voice: parsed.toneOfVoice,
        visual_direction: nullable(parsed.visualDirection),
      });
      const companyOperation = await supabase
        .from("company_profiles")
        .update({
          desired_perception: nullable(parsed.desiredPerception),
          key_promise: nullable(parsed.keyPromise),
          positioning_category: nullable(parsed.positioningCategory),
          positioning_difference: parsed.positioningDifference,
          reasons_to_believe: parsed.reasonsToBelieve,
          status_quo: nullable(parsed.statusQuo),
          updated_by: current.user.id,
        })
        .eq("organization_id", current.organization.id);
      if (companyOperation.error) throw companyOperation.error;
    } else if (stepSlug === "marketing") {
      const parsed = marketingStepSchema.parse({
        contentFocus: values(formData, "contentFocus"),
        desiredAudienceAction: value(formData, "desiredAudienceAction"),
        marketingStage: value(formData, "marketingStage"),
        notes: value(formData, "notes"),
        primaryChannels: values(formData, "primaryChannels"),
        primaryObjective: value(formData, "primaryObjective"),
        secondaryObjectives: values(formData, "secondaryObjectives"),
      });
      const { data: existingMarketing } = await supabase
        .from("marketing_profiles")
        .select("created_by")
        .eq("organization_id", current.organization.id)
        .maybeSingle();
      operation = supabase.from("marketing_profiles").upsert({
        ...audit,
        content_focus: parsed.contentFocus,
        created_by: existingMarketing?.created_by ?? current.user.id,
        desired_audience_action: nullable(parsed.desiredAudienceAction),
        notes: nullable(parsed.notes),
        primary_channels: parsed.primaryChannels,
        primary_objective: parsed.primaryObjective,
        secondary_objectives: parsed.secondaryObjectives,
        stage: parsed.marketingStage,
      });
    } else {
      const raw = JSON.parse(value(formData, "competitors") || "[]") as unknown;
      const parsed = competitorsStepSchema.parse({ competitors: raw });
      const { data: existing, error: readError } = await supabase
        .from("competitors")
        .select("created_by, id")
        .eq("organization_id", current.organization.id)
        .is("archived_at", null);
      if (readError) throw readError;
      const submittedIds = new Set(
        parsed.competitors.flatMap((competitor) =>
          competitor.id ? [competitor.id] : [],
        ),
      );
      const creatorsById = new Map(
        (existing ?? []).map((competitor) => [
          competitor.id,
          competitor.created_by,
        ]),
      );
      const removedIds = (existing ?? [])
        .map(({ id }) => id)
        .filter((id) => !submittedIds.has(id));
      if (removedIds.length) {
        const archived = await supabase
          .from("competitors")
          .update({
            archived_at: new Date().toISOString(),
            updated_by: current.user.id,
          })
          .in("id", removedIds)
          .eq("organization_id", current.organization.id);
        if (archived.error) throw archived.error;
      }
      const rows = parsed.competitors.map((competitor) => ({
        ...audit,
        created_by: competitor.id
          ? (creatorsById.get(competitor.id) ?? current.user.id)
          : current.user.id,
        id: competitor.id,
        instagram: nullable(competitor.instagram),
        name: competitor.name,
        relevance: nullable(competitor.relevance),
        short_description: nullable(competitor.shortDescription),
        type: competitor.type,
        website: nullable(competitor.website),
      }));
      operation = rows.length
        ? supabase.from("competitors").upsert(rows)
        : Promise.resolve({ error: null });
    }

    const { error } = await operation;
    if (error) throw error;
    const progressResult = await supabase.rpc("advance_onboarding_progress", {
      p_completed_step: step.number,
      p_organization_id: current.organization.id,
    });
    if (progressResult.error || progressResult.data < step.number + 1)
      throw (
        progressResult.error ??
        new Error("Onboarding progress did not advance.")
      );
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return errorState(error);
    }
    return errorState(null);
  }

  const destination =
    value(formData, "mode") === "edit"
      ? "/company/profile"
      : getNextOnboardingPath(stepSlug);
  redirect(destination as Route);
}

export async function completeOnboardingAction() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanManageOnboarding(current.membership.role);
  const { getOnboardingData } = await import("./server/data");
  const onboarding = await getOnboardingData(current.organization.id);
  if (
    (onboarding.progress?.current_step ?? 1) < 8 ||
    !onboarding.company?.problem_statement ||
    !onboarding.company.product_concept ||
    !onboarding.audience ||
    !onboarding.brand ||
    !onboarding.marketing
  ) {
    throw new Error(
      "Complete every required onboarding step before finishing.",
    );
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("onboarding_progress")
    .update({
      completed_at: new Date().toISOString(),
      current_step: 8,
      updated_by: current.user.id,
    })
    .eq("organization_id", current.organization.id);
  if (error) throw new Error("Onboarding could not be completed.");
  redirect("/");
}
