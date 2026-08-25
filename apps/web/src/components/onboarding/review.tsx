import { Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import type { StepData } from "./step-fields";

const display = (value: string | null | undefined) => value || "Not provided";
const pretty = (value: string | null | undefined) =>
  display(value)
    ?.toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

function List({ values }: { values: string[] | undefined }) {
  return values?.length ? (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {values.map((value) => (
        <li className="bg-muted rounded px-2 py-1 text-xs" key={value}>
          {pretty(value)}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-muted-foreground text-sm">Not provided</p>
  );
}

function Section({
  children,
  editable,
  edit,
  title,
}: {
  children: ReactNode;
  editable: boolean;
  edit: string;
  title: string;
}) {
  const href = `/onboarding/${edit}?edit=1` as Route;
  return (
    <section className="border-border border-b pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {editable ? (
          <Link
            className="text-primary inline-flex items-center gap-1 text-sm font-medium"
            href={href}
          >
            <Pencil aria-hidden="true" className="size-3.5" /> Edit
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function OnboardingReview({
  canEdit = true,
  data,
}: {
  canEdit?: boolean;
  data: StepData;
}) {
  const { audience, brand, company, competitors, marketing } = data;
  return (
    <div className="space-y-6">
      <Section editable={canEdit} edit="company" title="Company">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Name" value={company?.company_name} />
          <Item label="Industry" value={company?.industry} />
          <Item label="Stage" value={pretty(company?.stage)} />
          <Item label="Market" value={company?.primary_market} />
          <Item
            className="sm:col-span-2"
            label="Description"
            value={company?.short_description}
          />
        </dl>
      </Section>
      <Section editable={canEdit} edit="problem" title="Problem & idea">
        <dl className="space-y-4">
          <Item label="Problem" value={company?.problem_statement} />
          <Item label="Who experiences it" value={company?.affected_audience} />
          <Item label="Startup idea" value={company?.startup_idea} />
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Alternatives
            </dt>
            <dd>
              <List values={company?.current_alternatives} />
            </dd>
          </div>
        </dl>
      </Section>
      <Section editable={canEdit} edit="product" title="Product concept">
        <dl className="space-y-4">
          <Item label="Concept" value={company?.product_concept} />
          <Item label="Value proposition" value={company?.value_proposition} />
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Core capabilities
            </dt>
            <dd>
              <List values={company?.core_capabilities} />
            </dd>
          </div>
        </dl>
      </Section>
      <Section editable={canEdit} edit="audience" title="Primary audience">
        <dl className="space-y-4">
          <Item label="Segment" value={audience?.name} />
          <Item label="Description" value={audience?.description} />
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Pain points
            </dt>
            <dd>
              <List values={audience?.pain_points} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Goals
            </dt>
            <dd>
              <List values={audience?.goals} />
            </dd>
          </div>
        </dl>
      </Section>
      <Section
        editable={canEdit}
        edit="positioning-brand"
        title="Positioning & brand"
      >
        <dl className="space-y-4">
          <Item label="Difference" value={company?.positioning_difference} />
          <Item
            label="Desired perception"
            value={company?.desired_perception}
          />
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Brand personality
            </dt>
            <dd>
              <List values={brand?.personality_traits} />
            </dd>
          </div>
          <Item label="Visual direction" value={brand?.visual_direction} />
        </dl>
      </Section>
      <Section editable={canEdit} edit="marketing" title="Marketing">
        <dl className="space-y-4">
          <Item
            label="Primary objective"
            value={pretty(marketing?.primary_objective)}
          />
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">
              Channels
            </dt>
            <dd>
              <List values={marketing?.primary_channels} />
            </dd>
          </div>
          <Item
            label="Desired action"
            value={marketing?.desired_audience_action}
          />
        </dl>
      </Section>
      <Section editable={canEdit} edit="competitors" title="Competitors">
        {competitors.length ? (
          <ul className="divide-border divide-y">
            {competitors.map((competitor) => (
              <li
                className="flex items-start justify-between gap-4 py-3 first:pt-0"
                key={competitor.id}
              >
                <div>
                  <p className="text-sm font-medium">{competitor.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {display(competitor.short_description)}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  {pretty(competitor.type)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No competitors added yet.
          </p>
        )}
      </Section>
    </div>
  );
}

function Item({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6">{display(value)}</dd>
    </div>
  );
}
