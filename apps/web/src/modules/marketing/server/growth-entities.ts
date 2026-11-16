import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  entityReferenceKey,
  entityReferenceSchema,
  entitySearchPattern,
  type EntityContext,
  type EntityProvider,
  type EntityProjection,
} from "@/core/entities/public";
import { hypothesisFields, experimentFields, type GrowthRow } from "../growth";
import { invalidateMarketingRecord } from "./invalidation";

const configs = [
  {
    kind: "hypothesis",
    table: "marketing_hypotheses",
    route: "hypotheses",
    label: "Hypothesis",
    icon: "hypothesis",
    columns: "id,title,statement,status,confidence,owner_id,archived_at",
    capability: "marketing.hypotheses.read",
  },
  {
    kind: "experiment",
    table: "marketing_experiments",
    route: "experiments",
    label: "Experiment",
    icon: "experiment",
    columns: "id,title,status,success_criteria,ends_on,owner_id,archived_at",
    capability: "marketing.experiments.read",
  },
  {
    kind: "learning",
    table: "marketing_learnings",
    route: "learn",
    label: "Learning",
    icon: "learning",
    columns: "id,title,conclusion,confidence,archived_at",
    capability: "marketing.learnings.read",
  },
] as const;
const reference = (context: EntityContext, kind: string, id: string) => ({
  entityType: "marketing." + kind,
  entityId: id,
  organizationId: context.organizationId,
  sourcePlugin: "marketing",
});
function project(
  kind: string,
  route: string,
  row: GrowthRow,
): EntityProjection {
  return {
    title: row.title,
    summary: (row.statement ?? row.conclusion ?? row.success_criteria)?.slice(
      0,
      280,
    ),
    status:
      row.status ??
      (row.confidence ? row.confidence + " CONFIDENCE" : undefined),
    archived: !!row.archived_at,
    href: `/apps/marketing/${route}?item=${row.id}${row.archived_at ? "&archived=true" : ""}`,
    details: [
      ...(row.owner_id
        ? [{ label: "Owner", value: row.owner_id, kind: "member" as const }]
        : []),
      ...(row.ends_on
        ? [{ label: "Target end", value: row.ends_on, kind: "date" as const }]
        : []),
      ...(row.confidence
        ? [{ label: "Confidence", value: row.confidence }]
        : []),
    ],
  };
}
const title = {
  key: "title",
  label: "Title",
  kind: "text" as const,
  required: true,
  maxLength: 160,
};
export const growthEntityProviders: EntityProvider[] = configs.map(
  (config) => ({
    metadata: {
      id: "marketing." + config.kind,
      label: config.label,
      icon: config.icon,
      binding: "live",
      sourcePlugin: "marketing",
      readCapability: config.capability,
      routePrefix: "/apps/marketing/" + config.route,
      ...(config.kind === "hypothesis"
        ? {
            creationSelection: "text-or-reference" as const,
            sourceEntityTypes: ["marketing.research-evidence"],
            fields: [
              title,
              {
                key: "statement",
                label: "Testable belief",
                kind: "textarea" as const,
                required: true,
                maxLength: 4000,
              },
              {
                key: "confidence",
                label: "Confidence",
                kind: "select" as const,
                options: ["LOW", "MEDIUM", "HIGH"],
                initial: "MEDIUM",
              },
              { key: "ownerId", label: "Owner", kind: "assignee" as const },
            ],
          }
        : config.kind === "experiment"
          ? {
              creationSelection: "single-reference" as const,
              sourceEntityTypes: ["marketing.hypothesis"],
              fields: [
                title,
                {
                  key: "testPlan",
                  label: "Test plan",
                  kind: "textarea" as const,
                  maxLength: 4000,
                },
                {
                  key: "successCriteria",
                  label: "Success / evaluation criteria",
                  kind: "textarea" as const,
                  maxLength: 2000,
                },
                { key: "ownerId", label: "Owner", kind: "assignee" as const },
                { key: "startsOn", label: "Start date", kind: "date" as const },
                {
                  key: "endsOn",
                  label: "Target end date",
                  kind: "date" as const,
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
          refs.map((r) => r.entityId),
        );
      if (result.error) throw result.error;
      return new Map(
        (result.data ?? []).map((r) => {
          const row = r as unknown as GrowthRow;
          return [
            entityReferenceKey(reference(context, config.kind, row.id)),
            project(config.kind, config.route, row),
          ];
        }),
      );
    },
    async search(context, query, cursor) {
      const db = await createServerSupabaseClient();
      let request = db
        .from(config.table)
        .select(config.columns)
        .eq("organization_id", context.organizationId)
        .is("archived_at", null)
        .ilike("title", entitySearchPattern(query))
        .order("id")
        .limit(26);
      if (cursor) request = request.gt("id", cursor);
      const result = await request;
      if (result.error) throw result.error;
      return {
        hasMore: (result.data?.length ?? 0) > 25,
        items: (result.data ?? []).slice(0, 25).map((r) => {
          const row = r as unknown as GrowthRow;
          return {
            reference: reference(context, config.kind, row.id),
            status: "available" as const,
            projection: project(config.kind, config.route, row),
          };
        }),
      };
    },
    ...(config.kind !== "learning"
      ? {
          parseCreation(input: unknown) {
            const fields = {
              ...(input as Record<string, unknown>),
              archived: false,
            };
            const parsed = (
              config.kind === "hypothesis" ? hypothesisFields : experimentFields
            ).parse(fields);
            return Object.fromEntries(
              Object.entries(parsed).filter(([key]) => key !== "archived"),
            );
          },
          async previewCreation(
            context: EntityContext,
            sources: readonly {
              id: string;
              element_type: string;
              content: Record<string, unknown>;
            }[],
          ): Promise<{
            title: string;
            text: string;
            fields: Record<string, string>;
          }> {
            if (
              sources.length !== 1 ||
              sources[0]!.element_type !== "ENTITY_CARD"
            )
              throw { code: "22023" };
            const source = entityReferenceSchema.parse(
              sources[0]!.content.reference,
            );
            if (
              source.organizationId !== context.organizationId ||
              source.sourcePlugin !== "marketing"
            )
              throw { code: "42501" };
            const db = await createServerSupabaseClient();
            if (config.kind === "hypothesis") {
              if (
                source.entityType !== "marketing.research-evidence" ||
                !source.immutable
              )
                throw { code: "22023" };
              const result = await db
                .from("marketing_external_research_evidence")
                .select("id,title,run_id,evidence_id,evidence_type")
                .eq("organization_id", context.organizationId)
                .eq("id", source.entityId)
                .eq("run_id", source.immutable.runId)
                .eq("evidence_id", source.immutable.evidenceId)
                .maybeSingle();
              if (result.error || !result.data) throw { code: "42501" };
              return {
                title: (
                  "Hypothesis about " +
                  (result.data.title ?? result.data.evidence_id)
                ).slice(0, 160),
                text: `Context: ${result.data.title ?? "Research Evidence"} · ${result.data.evidence_id} · ${result.data.evidence_type}. The exact Evidence will be cited; write a testable belief rather than treating the source as proof.`,
                fields: { statement: "" },
              };
            }
            if (
              source.entityType !== "marketing.hypothesis" ||
              source.immutable
            )
              throw { code: "22023" };
            const result = await db
              .from("marketing_hypotheses")
              .select("id,title,statement")
              .eq("organization_id", context.organizationId)
              .eq("id", source.entityId)
              .is("archived_at", null)
              .maybeSingle();
            if (result.error || !result.data) throw { code: "42501" };
            return {
              title: ("Test: " + result.data.title).slice(0, 160),
              text: result.data.statement ?? "",
              fields: { hypothesisId: result.data.id, testPlan: "" },
            };
          },
          async create(
            context: EntityContext,
            receipt: import("@/core/entities/public").EntityCreationReceipt,
          ) {
            if (
              receipt.organization_id !== context.organizationId ||
              receipt.created_by !== context.actorId
            )
              throw { code: "42501" };
            const db = await createServerSupabaseClient();
            const result = await db.rpc("create_marketing_growth_from_board", {
              p_conversion_id: receipt.id,
            });
            if (result.error) throw result.error;
            const id = z.uuid().parse(result.data);
            invalidateMarketingRecord("/apps/marketing/" + config.route);
            return reference(context, config.kind, id);
          },
        }
      : {}),
  }),
);
