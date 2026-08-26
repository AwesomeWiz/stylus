import type {
  AudienceProfileRow,
  BrandProfileRow,
  CompanyProfileRow,
  CompetitorRow,
  MarketingProfileRow,
} from "@/lib/supabase/database.types";

export interface CanonicalCompanyKnowledgeSource {
  audience: AudienceProfileRow | null;
  brand: BrandProfileRow | null;
  company: CompanyProfileRow | null;
  competitors: CompetitorRow[];
  marketing: MarketingProfileRow | null;
  organizationId: string;
}

function hasValue(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function composeCompanyKnowledge(
  source: CanonicalCompanyKnowledgeSource,
) {
  const company = source.company;
  const sections = {
    audience: source.audience
      ? {
          attentionChannels: source.audience.attention_channels,
          characteristics: source.audience.characteristics,
          description: source.audience.description,
          goals: source.audience.goals,
          motivations: source.audience.motivations,
          name: source.audience.name,
          objections: source.audience.objections,
          painPoints: source.audience.pain_points,
        }
      : null,
    brand: source.brand
      ? {
          avoid: source.brand.avoid,
          communicationTraits: source.brand.communication_traits,
          desiredEmotions: source.brand.desired_emotions,
          emphasize: source.brand.emphasize,
          personalityTraits: source.brand.personality_traits,
          primaryColors: source.brand.primary_colors,
          status: source.brand.status,
          toneOfVoice: source.brand.tone_of_voice,
          visualDirection: source.brand.visual_direction,
        }
      : null,
    competitors: source.competitors.map((competitor) => ({
      description: competitor.short_description,
      name: competitor.name,
      relevance: competitor.relevance,
      type: competitor.type,
    })),
    identity: company
      ? {
          companyName: company.company_name,
          industry: company.industry,
          primaryMarket: company.primary_market,
          shortDescription: company.short_description,
          stage: company.stage,
        }
      : null,
    marketing: source.marketing
      ? {
          contentFocus: source.marketing.content_focus,
          desiredAudienceAction: source.marketing.desired_audience_action,
          primaryChannels: source.marketing.primary_channels,
          primaryObjective: source.marketing.primary_objective,
          secondaryObjectives: source.marketing.secondary_objectives,
          stage: source.marketing.stage,
        }
      : null,
    positioning: company
      ? {
          category: company.positioning_category,
          desiredPerception: company.desired_perception,
          difference: company.positioning_difference,
          keyPromise: company.key_promise,
          reasonsToBelieve: company.reasons_to_believe,
          statusQuo: company.status_quo,
        }
      : null,
    problem: company
      ? {
          affectedAudience: company.affected_audience,
          coreInsight: company.core_insight,
          currentAlternatives: company.current_alternatives,
          importance: company.problem_importance,
          statement: company.problem_statement,
          startupIdea: company.startup_idea,
        }
      : null,
    product: company
      ? {
          capabilities: company.core_capabilities,
          concept: company.product_concept,
          differentiators: company.differentiators,
          nearTermObjective: company.near_term_objective,
          status: company.product_status,
          valueProposition: company.value_proposition,
        }
      : null,
  };
  const incompleteSections = Object.entries(sections)
    .filter(([, value]) => !hasValue(value))
    .map(([name]) => name);
  return {
    incompleteSections,
    organizationId: source.organizationId,
    sections,
    source: "canonical_company_profile" as const,
  };
}

export type CompanyKnowledge = ReturnType<typeof composeCompanyKnowledge>;
