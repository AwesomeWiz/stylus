import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  entityReferenceKey,
  entitySearchPattern,
  type EntityContext,
  type EntityReference,
  type EntityProvider,
  type EntityProjection,
} from "@/core/entities/public";
import { reelIdeaSchema, researchSchema } from "../schemas";
import { saveMarketingReelIdea, saveMarketingResearch } from "./mutations";
import { invalidateMarketingRecord } from "./invalidation";
import type { Database } from "@/lib/supabase/database.types";
type Config = {
  id: string;
  label: string;
  icon: "idea" | "competitor" | "campaign" | "brief" | "note";
  table:
    | "marketing_reel_ideas"
    | "marketing_competitors"
    | "marketing_campaigns"
    | "marketing_creative_briefs"
    | "marketing_research";
  title: "title" | "name";
  summary: "concept" | "notes" | "objective" | "content";
  columns: string;
  route: string;
  capability: string;
  conversionOnly?: boolean;
};
const configs: Config[] = [
  {
    id: "marketing.reel-idea",
    label: "Reel Idea",
    icon: "idea",
    table: "marketing_reel_ideas",
    title: "title",
    summary: "concept",
    columns: "id,title,concept,hook,status,archived_at,updated_at",
    route: "reel-ideas",
    capability: "marketing.reels.read",
  },
  {
    id: "marketing.competitor",
    label: "Competitor",
    icon: "competitor",
    table: "marketing_competitors",
    title: "name",
    summary: "notes",
    columns: "id,name,website_url,archived_at,updated_at",
    route: "competitors",
    capability: "marketing.competitors.read",
  },
  {
    id: "marketing.campaign",
    label: "Campaign",
    icon: "campaign",
    table: "marketing_campaigns",
    title: "name",
    summary: "objective",
    columns:
      "id,name,objective,status,starts_on,ends_on,archived_at,updated_at",
    route: "campaigns",
    capability: "marketing.campaigns.read",
  },
  {
    id: "marketing.creative-brief",
    label: "Human Creative Brief",
    icon: "brief",
    table: "marketing_creative_briefs",
    title: "title",
    summary: "objective",
    columns: "id,title,objective,status,archived_at,updated_at",
    route: "creative-briefs",
    capability: "marketing.briefs.read",
  },
  {
    id: "marketing.research-note",
    label: "Research Note",
    icon: "note",
    table: "marketing_research",
    title: "title",
    summary: "content",
    columns: "id,title,category,archived_at,updated_at",
    route: "research",
    capability: "marketing.research.read",
    conversionOnly: true,
  },
];
type Row = Record<string, unknown> & { id: string };
const ref = (
  context: EntityContext,
  type: string,
  id: string,
): EntityReference => ({
  entityType: type,
  entityId: id,
  organizationId: context.organizationId,
  sourcePlugin: "marketing",
});
function project(config: Config, row: Row): EntityProjection {
  const archived = !!row.archived_at;
  return {
    title: String(row[config.title]),
    summary: row[config.summary]
      ? String(row[config.summary]).slice(0, 280)
      : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    archived,
    href:
      config.icon === "competitor"
        ? `/apps/marketing/competitors/${row.id}`
        : `/apps/marketing/${config.route}?item=${row.id}${archived ? "&archived=true" : ""}`,
    details: [
      ...(row.starts_on
        ? [
            {
              label: "Starts",
              value: String(row.starts_on),
              kind: "date" as const,
            },
          ]
        : []),
      ...(row.ends_on
        ? [{ label: "Ends", value: String(row.ends_on), kind: "date" as const }]
        : []),
      ...(row.website_url
        ? [{ label: "Website", value: String(row.website_url).slice(0, 160) }]
        : []),
      ...(row.updated_at
        ? [
            {
              label: "Updated",
              value: String(row.updated_at),
              kind: "date" as const,
            },
          ]
        : []),
    ],
  };
}
function parseIdea(input: unknown) {
  const v = input as Record<string, unknown>;
  return reelIdeaSchema.parse({
    recordId: "",
    title: v.title,
    concept: v.concept ?? "",
    hook: v.hook ?? "",
    contentAngle: v.contentAngle ?? "",
    callToAction: v.callToAction ?? "",
    notes: v.notes ?? "",
    campaignId: v.campaignId ?? "",
    status: v.status ?? "IDEA",
  });
}
function parseNote(input: unknown) {
  const v = input as Record<string, unknown>;
  return researchSchema.parse({
    recordId: "",
    title: v.title,
    content: v.content,
    category: v.category ?? "OTHER",
    sourceLabel: v.sourceLabel ?? "",
    sourceUrl: v.sourceUrl ?? "",
  });
}
const commonTitle = {
  key: "title",
  label: "Title",
  kind: "text" as const,
  required: true,
  maxLength: 160,
};
export const marketingEntityProviders: EntityProvider[] = configs.map(
  (config) => ({
    metadata: {
      id: config.id,
      label: config.label,
      icon: config.icon,
      binding: "live",
      sourcePlugin: "marketing",
      readCapability: config.capability,
      routePrefix: "/apps/marketing/" + config.route,
      conversionOnly: config.conversionOnly,
      ...(config.icon === "idea"
        ? { creationSelection: "single-sticky" as const }
        : config.icon === "note"
          ? { creationSelection: "text-selection" as const }
          : {}),
      ...(config.icon === "idea"
        ? {
            fields: [
              commonTitle,
              {
                key: "concept",
                label: "Concept",
                kind: "textarea" as const,
                maxLength: 2000,
              },
              {
                key: "hook",
                label: "Hook",
                kind: "textarea" as const,
                maxLength: 1000,
              },
              {
                key: "status",
                label: "Status",
                kind: "select" as const,
                options: ["IDEA", "DRAFT", "READY"],
                initial: "IDEA",
              },
            ],
          }
        : config.icon === "note"
          ? {
              fields: [
                commonTitle,
                {
                  key: "content",
                  label: "Research notes",
                  kind: "textarea" as const,
                  required: true,
                  maxLength: 8000,
                },
                {
                  key: "category",
                  label: "Category",
                  kind: "select" as const,
                  options: [
                    "CUSTOMER",
                    "COMPETITOR",
                    "TREND",
                    "CONTENT",
                    "OTHER",
                  ],
                  initial: "OTHER",
                },
              ],
            }
          : {}),
    },
    async resolve(context, refs) {
      const db = await createServerSupabaseClient();
      const result = await db
        .from(config.table)
        .select(config.columns)
        .eq("organization_id", context.organizationId)
        .in(
          "id",
          refs.map((value) => value.entityId),
        );
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as unknown as Row[];
      return new Map(
        rows.map((row) => [
          entityReferenceKey(ref(context, config.id, row.id)),
          project(config, row),
        ]),
      );
    },
    async search(context, query, afterId) {
      const db = await createServerSupabaseClient();
      let request = db
        .from(config.table)
        .select(config.columns)
        .eq("organization_id", context.organizationId)
        .ilike(config.title, entitySearchPattern(query))
        .is("archived_at", null)
        .order("id")
        .limit(26);
      if (afterId) request = request.gt("id", afterId);
      const result = await request;
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as unknown as Row[];
      return {
        hasMore: rows.length > 25,
        items: rows.slice(0, 25).map((row) => ({
          reference: ref(context, config.id, row.id),
          status: "available" as const,
          projection: project(config, row),
        })),
      };
    },
    ...(config.icon === "idea" || config.icon === "note"
      ? {
          parseCreation: config.icon === "idea" ? parseIdea : parseNote,
          async create(
            context: EntityContext,
            receipt: import("@/core/entities/public").EntityCreationReceipt,
          ) {
            if (
              receipt.organization_id !== context.organizationId ||
              receipt.created_by !== context.actorId
            )
              throw Error("Creation unavailable");
            const db = await createServerSupabaseClient(),
              scope = {
                organizationId: context.organizationId,
                actorId: context.actorId,
              };
            const id =
              config.icon === "idea"
                ? await saveMarketingReelIdea(
                    db,
                    scope,
                    parseIdea(receipt.input),
                    receipt.id,
                  )
                : await saveMarketingResearch(
                    db,
                    scope,
                    parseNote(receipt.input),
                    receipt.id,
                  );
            if (!id) throw Error("Creation could not be confirmed");
            invalidateMarketingRecord("/apps/marketing/" + config.route);
            return ref(context, config.id, id);
          },
        }
      : {}),
  }),
);

type Evidence =
  Database["public"]["Tables"]["marketing_external_research_evidence"]["Row"];
const evidenceColumns =
  "id,run_id,evidence_id,source_id,title,evidence_type,canonical_url,published_at,fetched_at,created_at";
type EvidenceCard = Pick<
  Evidence,
  | "id"
  | "run_id"
  | "evidence_id"
  | "source_id"
  | "canonical_url"
  | "title"
  | "evidence_type"
  | "published_at"
  | "fetched_at"
  | "created_at"
>;
function evidenceRef(
  context: EntityContext,
  row: EvidenceCard,
): EntityReference {
  return {
    ...ref(context, "marketing.research-evidence", row.id),
    immutable: { runId: row.run_id, evidenceId: row.evidence_id },
  };
}
function evidenceProjection(row: EvidenceCard): EntityProjection {
  return {
    title: row.title?.slice(0, 200) || row.evidence_id,
    status: row.evidence_type.replaceAll("_", " "),
    archived: false,
    href: `/apps/marketing/research?run=${row.run_id}&evidence=${row.id}#${row.run_id}-${row.evidence_id}`,
    details: [
      { label: "Evidence", value: row.evidence_id },
      {
        label: "Source",
        value: row.canonical_url?.slice(0, 160) ?? row.source_id,
      },
      { label: "Source ID", value: row.source_id },
      {
        label: "Retrieved",
        value: row.fetched_at ?? row.created_at,
        kind: "date",
      },
      ...(row.published_at
        ? [
            {
              label: "Published",
              value: row.published_at,
              kind: "date" as const,
            },
          ]
        : []),
    ],
  };
}
marketingEntityProviders.push({
  metadata: {
    id: "marketing.research-evidence",
    label: "Research Evidence",
    icon: "evidence",
    binding: "immutable",
    sourcePlugin: "marketing",
    readCapability: "marketing.research.read",
    routePrefix: "/apps/marketing/research",
  },
  async resolve(context, refs) {
    const db = await createServerSupabaseClient(),
      result = await db
        .from("marketing_external_research_evidence")
        .select(evidenceColumns)
        .eq("organization_id", context.organizationId)
        .in(
          "id",
          refs.map((value) => value.entityId),
        );
    if (result.error) throw result.error;
    const found = new Map<string, EntityProjection>();
    for (const row of result.data ?? []) {
      const exact = evidenceRef(context, row);
      if (
        refs.some(
          (value) => entityReferenceKey(value) === entityReferenceKey(exact),
        )
      )
        found.set(entityReferenceKey(exact), evidenceProjection(row));
    }
    return found;
  },
  async search(context, query, afterId) {
    const db = await createServerSupabaseClient();
    let request = db
      .from("marketing_external_research_evidence")
      .select(evidenceColumns)
      .eq("organization_id", context.organizationId)
      .order("id")
      .limit(26);
    if (query.trim())
      request = /^EVID-[1-9][0-9]*$/i.test(query.trim())
        ? request.eq("evidence_id", query.trim().toUpperCase())
        : request.ilike("title", entitySearchPattern(query));
    if (afterId) request = request.gt("id", afterId);
    const result = await request;
    if (result.error) throw result.error;
    return {
      hasMore: (result.data?.length ?? 0) > 25,
      items: (result.data ?? []).slice(0, 25).map((row) => ({
        reference: evidenceRef(context, row),
        status: "available" as const,
        projection: evidenceProjection(row),
      })),
    };
  },
});
