"use client";

import Link from "next/link";
import type { Route } from "next";
import { Archive, Plus, RotateCcw } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import {
  saveMarketingCampaignAction,
  saveMarketingCompetitorAction,
  saveMarketingCreativeBriefAction,
  saveMarketingReelIdeaAction,
  saveMarketingResearchAction,
  setMarketingCampaignArchivedAction,
  setMarketingCompetitorArchivedAction,
  setMarketingCreativeBriefArchivedAction,
  setMarketingReelIdeaArchivedAction,
  setMarketingResearchArchivedAction,
} from "@/modules/marketing/actions";
import { initialMarketingActionState } from "@/modules/marketing/schemas";
import type { OrganizationRole } from "@/lib/supabase/database.types";

type Area =
  "campaigns" | "competitors" | "creative-briefs" | "reel-ideas" | "research";
type RecordValue = Record<string, unknown> & { id: string };
type Option = { id: string; name: string };
type Field = {
  key: string;
  label: string;
  kind?: "date" | "select" | "textarea" | "url";
  options?: readonly string[];
  required?: boolean;
};

const fields: Record<Area, Field[]> = {
  competitors: [
    { key: "name", label: "Name", required: true },
    { key: "website_url", label: "Website", kind: "url" },
    { key: "instagram_handle", label: "Instagram handle" },
    {
      key: "instagram_profile_url",
      label: "Instagram profile URL",
      kind: "url",
    },
    { key: "core_competitor_id", label: "Company competitor", kind: "select" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  campaigns: [
    { key: "name", label: "Name", required: true },
    { key: "objective", label: "Objective", kind: "textarea", required: true },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED"],
    },
    { key: "starts_on", label: "Start date", kind: "date" },
    { key: "ends_on", label: "End date", kind: "date" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  "reel-ideas": [
    { key: "title", label: "Title", required: true },
    { key: "hook", label: "Hook", kind: "textarea" },
    { key: "concept", label: "Concept", kind: "textarea" },
    { key: "content_angle", label: "Content angle", kind: "textarea" },
    { key: "call_to_action", label: "CTA" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: ["IDEA", "DRAFT", "READY"],
    },
    { key: "campaign_id", label: "Campaign", kind: "select" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  research: [
    { key: "title", label: "Title", required: true },
    {
      key: "content",
      label: "Research notes",
      kind: "textarea",
      required: true,
    },
    {
      key: "category",
      label: "Category",
      kind: "select",
      options: ["CUSTOMER", "COMPETITOR", "TREND", "CONTENT", "OTHER"],
    },
    { key: "source_label", label: "Source label" },
    { key: "source_url", label: "Source URL", kind: "url" },
  ],
  "creative-briefs": [
    { key: "title", label: "Title", required: true },
    { key: "objective", label: "Objective", kind: "textarea", required: true },
    { key: "target_audience", label: "Target audience", kind: "textarea" },
    { key: "core_message", label: "Core message", kind: "textarea" },
    { key: "tone_direction", label: "Tone / direction", kind: "textarea" },
    { key: "call_to_action", label: "CTA" },
    { key: "visual_direction", label: "Visual direction", kind: "textarea" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: ["DRAFT", "READY", "APPROVED"],
    },
    { key: "campaign_id", label: "Campaign", kind: "select" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
};

const saveActions = {
  campaigns: saveMarketingCampaignAction,
  competitors: saveMarketingCompetitorAction,
  "creative-briefs": saveMarketingCreativeBriefAction,
  "reel-ideas": saveMarketingReelIdeaAction,
  research: saveMarketingResearchAction,
};
const lifecycleActions = {
  campaigns: setMarketingCampaignArchivedAction,
  competitors: setMarketingCompetitorArchivedAction,
  "creative-briefs": setMarketingCreativeBriefArchivedAction,
  "reel-ideas": setMarketingReelIdeaArchivedAction,
  research: setMarketingResearchArchivedAction,
};
const labels = {
  campaigns: "campaign",
  competitors: "competitor",
  "creative-briefs": "creative brief",
  "reel-ideas": "Reel idea",
  research: "research note",
};
const formNames: Record<string, string> = {
  call_to_action: "callToAction",
  campaign_id: "campaignId",
  content_angle: "contentAngle",
  core_competitor_id: "coreCompetitorId",
  core_message: "coreMessage",
  ends_on: "endsOn",
  instagram_handle: "instagramHandle",
  instagram_profile_url: "instagramProfileUrl",
  source_label: "sourceLabel",
  source_url: "sourceUrl",
  starts_on: "startsOn",
  target_audience: "targetAudience",
  tone_direction: "toneDirection",
  visual_direction: "visualDirection",
  website_url: "websiteUrl",
};

export function MarketingWorkspace({
  area,
  archived,
  campaigns = [],
  coreCompetitors = [],
  records,
  role,
}: {
  area: Area;
  archived: boolean;
  campaigns?: Option[];
  coreCompetitors?: Option[];
  records: RecordValue[];
  role: OrganizationRole;
}) {
  const editable = canMutateMarketing(role);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <Link
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
          href={
            `/apps/marketing/${area}${archived ? "" : "?archived=true"}` as Route
          }
        >
          {archived ? "View active" : "View archived"}
        </Link>
        {editable && !archived ? (
          <details className="group">
            <summary className="bg-primary text-primary-foreground flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-sm font-medium">
              <Plus className="size-4" />
              Add {labels[area]}
            </summary>
            <Editor
              area={area}
              campaigns={campaigns}
              coreCompetitors={coreCompetitors}
            />
          </details>
        ) : null}
      </div>
      {records.length ? (
        <div className="divide-y border-y">
          {records.map((record) => (
            <article className="py-4" key={record.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-medium">
                    {text(record.title ?? record.name)}
                  </h2>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {text(
                      record.objective ??
                        record.hook ??
                        record.content ??
                        record.notes ??
                        "No additional notes",
                    )}
                  </p>
                </div>
                {editable ? (
                  <Lifecycle area={area} archived={archived} id={record.id} />
                ) : null}
              </div>
              {editable && !archived ? (
                <details className="mt-3">
                  <summary className="text-muted-foreground cursor-pointer text-sm hover:underline">
                    Edit
                  </summary>
                  <Editor
                    area={area}
                    campaigns={campaigns}
                    coreCompetitors={coreCompetitors}
                    record={record}
                  />
                </details>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="border-y py-10 text-center">
          <p className="font-medium">
            No {archived ? "archived " : ""}
            {labels[area]} records
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {editable && !archived
              ? "Add the first record to this workspace."
              : "Nothing to show here."}
          </p>
        </div>
      )}
    </div>
  );
}

function Editor({
  area,
  campaigns,
  coreCompetitors,
  record,
}: {
  area: Area;
  campaigns: Option[];
  coreCompetitors: Option[];
  record?: RecordValue;
}) {
  const [state, action, pending] = useActionState(
    saveActions[area],
    initialMarketingActionState,
  );
  return (
    <form
      action={action}
      className="bg-muted/40 mt-3 grid gap-3 rounded-md border p-4 sm:grid-cols-2"
    >
      <input name="recordId" type="hidden" value={record?.id ?? ""} />
      {fields[area].map((field) => (
        <label
          className={field.kind === "textarea" ? "sm:col-span-2" : ""}
          key={field.key}
        >
          <span className="mb-1 block text-xs font-medium">{field.label}</span>
          <Control
            field={field}
            options={
              field.key === "campaign_id"
                ? campaigns
                : field.key === "core_competitor_id"
                  ? coreCompetitors
                  : []
            }
            value={text(record?.[field.key])}
          />
        </label>
      ))}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button disabled={pending} type="submit">
          {pending
            ? "Saving…"
            : record
              ? "Save changes"
              : `Add ${labels[area]}`}
        </Button>
        {state.status === "error" ? (
          <p className="text-destructive text-sm" role="alert">
            {state.message ??
              Object.values(state.fieldErrors ?? {}).flat()[0] ??
              "Check the form."}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Control({
  field,
  options,
  value,
}: {
  field: Field;
  options: Option[];
  value: string;
}) {
  const name = formNames[field.key] ?? field.key;
  if (field.kind === "textarea")
    return (
      <Textarea
        defaultValue={value}
        name={name}
        required={field.required}
        rows={3}
      />
    );
  if (field.kind === "select")
    return (
      <select
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        defaultValue={value || field.options?.[0] || ""}
        name={name}
      >
        <option value="">None</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    );
  return (
    <Input
      defaultValue={value}
      name={name}
      required={field.required}
      type={field.kind ?? "text"}
    />
  );
}

function Lifecycle({
  area,
  archived,
  id,
}: {
  area: Area;
  archived: boolean;
  id: string;
}) {
  const [, action, pending] = useActionState(
    lifecycleActions[area],
    initialMarketingActionState,
  );
  return (
    <form action={action}>
      <input name="recordId" type="hidden" value={id} />
      <input name="archived" type="hidden" value={String(!archived)} />
      <Button
        aria-label={`${archived ? "Restore" : "Archive"} ${labels[area]}`}
        disabled={pending}
        size="icon"
        type="submit"
        variant="ghost"
      >
        {archived ? (
          <RotateCcw className="size-4" />
        ) : (
          <Archive className="size-4" />
        )}
      </Button>
    </form>
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
