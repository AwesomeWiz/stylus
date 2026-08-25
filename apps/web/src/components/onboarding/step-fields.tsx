import { CompetitorEditor } from "@/components/onboarding/competitor-editor";
import { FormField, Select } from "@/components/onboarding/form-field";
import { ListField } from "@/components/onboarding/list-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  AudienceProfileRow,
  BrandProfileRow,
  CompanyProfileRow,
  CompetitorRow,
  MarketingProfileRow,
} from "@/lib/supabase/database.types";
import {
  brandStatusValues,
  companyStageValues,
  marketingObjectiveValues,
  marketingStageValues,
  productStatusValues,
} from "@/modules/onboarding/schemas";
import type { OnboardingStepSlug } from "@/modules/onboarding/steps";

export interface StepData {
  audience: AudienceProfileRow | null;
  brand: BrandProfileRow | null;
  company: CompanyProfileRow | null;
  competitors: CompetitorRow[];
  marketing: MarketingProfileRow | null;
}

const labelize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const firstError = (
  errors: Record<string, string[]> | undefined,
  name: string,
) => errors?.[name]?.[0];

export function StepFields({
  data,
  errors,
  step,
}: {
  data: StepData;
  errors?: Record<string, string[]>;
  step: OnboardingStepSlug;
}) {
  const company = data.company;
  if (step === "company")
    return (
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            error={firstError(errors, "companyName")}
            label="Company or startup name"
            name="companyName"
            required
          >
            <Input
              defaultValue={company?.company_name}
              id="companyName"
              name="companyName"
            />
          </FormField>
          <FormField
            error={firstError(errors, "industry")}
            label="Industry or category"
            name="industry"
            required
          >
            <Input
              defaultValue={company?.industry}
              id="industry"
              name="industry"
              placeholder="Developer tools, consumer health…"
            />
          </FormField>
        </div>
        <FormField
          description="One or two sentences that make the company understandable."
          error={firstError(errors, "shortDescription")}
          label="Short description"
          name="shortDescription"
          required
        >
          <Textarea
            defaultValue={company?.short_description}
            id="shortDescription"
            name="shortDescription"
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Company stage" name="stage" required>
            <Select
              defaultValue={company?.stage ?? "PRE_PRODUCT"}
              id="stage"
              name="stage"
            >
              {companyStageValues.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            description="City, country, or market—whatever is most relevant."
            label="Primary market"
            name="primaryMarket"
          >
            <Input
              defaultValue={company?.primary_market ?? ""}
              id="primaryMarket"
              name="primaryMarket"
            />
          </FormField>
          <FormField
            error={firstError(errors, "website")}
            label="Website"
            name="website"
          >
            <Input
              defaultValue={company?.website ?? ""}
              id="website"
              name="website"
              placeholder="https://"
              type="url"
            />
          </FormField>
          <FormField label="Instagram or social identity" name="instagram">
            <Input
              defaultValue={company?.instagram ?? ""}
              id="instagram"
              name="instagram"
              placeholder="@handle or profile URL"
            />
          </FormField>
        </div>
      </div>
    );

  if (step === "problem")
    return (
      <div className="space-y-5">
        <FormField
          description="Describe the real situation, not just the feature you want to build."
          error={firstError(errors, "problemStatement")}
          label="Problem being solved"
          name="problemStatement"
          required
        >
          <Textarea
            defaultValue={company?.problem_statement ?? ""}
            id="problemStatement"
            name="problemStatement"
          />
        </FormField>
        <FormField label="Who experiences it?" name="affectedAudience">
          <Textarea
            defaultValue={company?.affected_audience ?? ""}
            id="affectedAudience"
            name="affectedAudience"
          />
        </FormField>
        <FormField
          label="Why does this problem matter?"
          name="problemImportance"
        >
          <Textarea
            defaultValue={company?.problem_importance ?? ""}
            id="problemImportance"
            name="problemImportance"
          />
        </FormField>
        <ListField
          initialValues={company?.current_alternatives}
          label="Current alternatives or workarounds"
          name="currentAlternatives"
          placeholder="How people handle this today"
        />
        <FormField
          error={firstError(errors, "startupIdea")}
          label="Startup idea or proposed solution"
          name="startupIdea"
          required
        >
          <Textarea
            defaultValue={company?.startup_idea ?? ""}
            id="startupIdea"
            name="startupIdea"
          />
        </FormField>
        <FormField
          description="Optional: the belief or observation that makes this opportunity compelling."
          label="Core insight or thesis"
          name="coreInsight"
        >
          <Textarea
            defaultValue={company?.core_insight ?? ""}
            id="coreInsight"
            name="coreInsight"
          />
        </FormField>
      </div>
    );

  if (step === "product")
    return (
      <div className="space-y-5">
        <FormField
          description="Describe what you intend to offer; it does not need to exist yet."
          error={firstError(errors, "productConcept")}
          label="Product or service concept"
          name="productConcept"
          required
        >
          <Textarea
            defaultValue={company?.product_concept ?? ""}
            id="productConcept"
            name="productConcept"
          />
        </FormField>
        <FormField
          error={firstError(errors, "valueProposition")}
          label="Key value proposition"
          name="valueProposition"
          required
        >
          <Textarea
            defaultValue={company?.value_proposition ?? ""}
            id="valueProposition"
            name="valueProposition"
          />
        </FormField>
        <ListField
          initialValues={company?.core_capabilities}
          label="Planned core capabilities"
          name="coreCapabilities"
          placeholder="A core capability"
        />
        <ListField
          initialValues={company?.differentiators}
          label="Differentiators"
          name="differentiators"
          placeholder="What makes the concept different"
        />
        <FormField label="Current product status" name="productStatus" required>
          <Select
            defaultValue={company?.product_status ?? "CONCEPT"}
            id="productStatus"
            name="productStatus"
          >
            {productStatusValues.map((item) => (
              <option key={item} value={item}>
                {labelize(item)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Near-term product objective" name="nearTermObjective">
          <Input
            defaultValue={company?.near_term_objective ?? ""}
            id="nearTermObjective"
            name="nearTermObjective"
          />
        </FormField>
      </div>
    );

  if (step === "audience") {
    const audience = data.audience;
    return (
      <div className="space-y-5">
        <FormField
          error={firstError(errors, "name")}
          label="Primary audience name"
          name="name"
          required
        >
          <Input
            defaultValue={audience?.name}
            id="name"
            name="name"
            placeholder="Independent product designers"
          />
        </FormField>
        <FormField
          description="Describe the people and context without inventing irrelevant demographics."
          error={firstError(errors, "description")}
          label="Audience description"
          name="description"
          required
        >
          <Textarea
            defaultValue={audience?.description}
            id="description"
            name="description"
          />
        </FormField>
        <ListField
          initialValues={audience?.characteristics}
          label="Important characteristics"
          name="characteristics"
          placeholder="A relevant characteristic"
        />
        <ListField
          initialValues={audience?.pain_points}
          label="Pain points"
          name="painPoints"
          placeholder="A pain point"
        />
        <ListField
          initialValues={audience?.goals}
          label="Goals and desires"
          name="goals"
          placeholder="A goal"
        />
        <ListField
          initialValues={audience?.motivations}
          label="Motivations"
          name="motivations"
          placeholder="What moves them to act"
        />
        <ListField
          initialValues={audience?.objections}
          label="Objections and barriers"
          name="objections"
          placeholder="A reason they might hesitate"
        />
        <ListField
          initialValues={audience?.attention_channels}
          label="Where they spend attention"
          name="attentionChannels"
          placeholder="Instagram, communities, newsletters…"
        />
      </div>
    );
  }

  if (step === "positioning-brand") {
    const brand = data.brand;
    return (
      <div className="space-y-7">
        <section className="space-y-5">
          <h3 className="border-border border-b pb-2 text-base font-semibold">
            Positioning
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Category" name="positioningCategory">
              <Input
                defaultValue={company?.positioning_category ?? ""}
                id="positioningCategory"
                name="positioningCategory"
              />
            </FormField>
            <FormField label="Alternative or status quo" name="statusQuo">
              <Input
                defaultValue={company?.status_quo ?? ""}
                id="statusQuo"
                name="statusQuo"
              />
            </FormField>
          </div>
          <FormField
            error={firstError(errors, "positioningDifference")}
            label="Why are you different?"
            name="positioningDifference"
            required
          >
            <Textarea
              defaultValue={company?.positioning_difference ?? ""}
              id="positioningDifference"
              name="positioningDifference"
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Desired perception" name="desiredPerception">
              <Input
                defaultValue={company?.desired_perception ?? ""}
                id="desiredPerception"
                name="desiredPerception"
              />
            </FormField>
            <FormField label="Key promise" name="keyPromise">
              <Input
                defaultValue={company?.key_promise ?? ""}
                id="keyPromise"
                name="keyPromise"
              />
            </FormField>
          </div>
          <ListField
            initialValues={company?.reasons_to_believe}
            label="Reasons to believe"
            name="reasonsToBelieve"
            placeholder="Evidence or reason supporting the promise"
          />
        </section>
        <section className="space-y-5">
          <h3 className="border-border border-b pb-2 text-base font-semibold">
            Brand direction
          </h3>
          <FormField
            description="Choosing “Not decided yet” is completely valid."
            label="Brand status"
            name="brandStatus"
          >
            <Select
              defaultValue={brand?.status ?? "UNDECIDED"}
              id="brandStatus"
              name="brandStatus"
            >
              {brandStatusValues.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ListField
              initialValues={brand?.personality_traits}
              label="Personality"
              name="personalityTraits"
              placeholder="Thoughtful, bold, practical…"
            />
            <ListField
              initialValues={brand?.tone_of_voice}
              label="Tone of voice"
              name="toneOfVoice"
              placeholder="Clear, candid, warm…"
            />
            <ListField
              initialValues={brand?.desired_emotions}
              label="Desired emotions"
              name="desiredEmotions"
              placeholder="How people should feel"
            />
            <ListField
              initialValues={brand?.communication_traits}
              label="Communication characteristics"
              name="communicationTraits"
              placeholder="A communication principle"
            />
            <ListField
              initialValues={brand?.emphasize}
              label="Words or themes to emphasize"
              name="emphasize"
              placeholder="A theme to lean into"
            />
            <ListField
              initialValues={brand?.avoid}
              label="Words or styles to avoid"
              name="avoid"
              placeholder="A style to avoid"
            />
          </div>
          <FormField label="Initial visual direction" name="visualDirection">
            <Textarea
              defaultValue={brand?.visual_direction ?? ""}
              id="visualDirection"
              name="visualDirection"
            />
          </FormField>
          <ListField
            initialValues={brand?.primary_colors}
            label="Primary colors, if known"
            name="primaryColors"
            placeholder="Color name or hex value"
          />
        </section>
      </div>
    );
  }

  if (step === "marketing") {
    const marketing = data.marketing;
    return (
      <div className="space-y-5">
        <FormField
          label="Primary marketing objective"
          name="primaryObjective"
          required
        >
          <Select
            defaultValue={marketing?.primary_objective ?? "AWARENESS"}
            id="primaryObjective"
            name="primaryObjective"
          >
            {marketingObjectiveValues.map((item) => (
              <option key={item} value={item}>
                {labelize(item)}
              </option>
            ))}
          </Select>
        </FormField>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Secondary objectives</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {marketingObjectiveValues.map((item) => (
              <label
                className="border-border flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm"
                key={item}
              >
                <input
                  defaultChecked={marketing?.secondary_objectives.includes(
                    item,
                  )}
                  name="secondaryObjectives"
                  type="checkbox"
                  value={item}
                />
                {labelize(item)}
              </label>
            ))}
          </div>
        </fieldset>
        <ListField
          description="Instagram is supported, but choose the channels that fit your audience."
          initialValues={marketing?.primary_channels}
          label="Primary channels"
          name="primaryChannels"
          placeholder="Instagram, LinkedIn, events…"
        />
        {firstError(errors, "primaryChannels") ? (
          <p className="text-destructive text-xs" role="alert">
            {firstError(errors, "primaryChannels")}
          </p>
        ) : null}
        <ListField
          initialValues={marketing?.content_focus}
          label="Content focus"
          name="contentFocus"
          placeholder="Founder journey, education, product thinking…"
        />
        <FormField label="Desired audience action" name="desiredAudienceAction">
          <Input
            defaultValue={marketing?.desired_audience_action ?? ""}
            id="desiredAudienceAction"
            name="desiredAudienceAction"
            placeholder="Follow, join a waitlist, reply…"
          />
        </FormField>
        <FormField label="Current marketing stage" name="marketingStage">
          <Select
            defaultValue={marketing?.stage ?? "NOT_STARTED"}
            id="marketingStage"
            name="marketingStage"
          >
            {marketingStageValues.map((item) => (
              <option key={item} value={item}>
                {labelize(item)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Notes or constraints" name="notes">
          <Textarea
            defaultValue={marketing?.notes ?? ""}
            id="notes"
            name="notes"
          />
        </FormField>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {firstError(errors, "competitors") ? (
        <p className="text-destructive text-sm" role="alert">
          {firstError(errors, "competitors")}
        </p>
      ) : null}
      <CompetitorEditor initialCompetitors={data.competitors} />
    </div>
  );
}
