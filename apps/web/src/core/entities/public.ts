import { z } from "zod";

export const entityReferenceSchema = z
  .object({
    entityType: z
      .string()
      .max(80)
      .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/),
    entityId: z.uuid(),
    organizationId: z.uuid(),
    sourcePlugin: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .max(50)
      .optional(),
    immutable: z
      .object({
        runId: z.uuid(),
        evidenceId: z
          .string()
          .regex(/^EVID-[1-9][0-9]*$/)
          .max(24),
      })
      .strict()
      .optional(),
  })
  .strict();
export type EntityReference = z.infer<typeof entityReferenceSchema>;
export const entityProjectionSchema = z
  .object({
    title: z.string().min(1).max(200),
    summary: z.string().max(280).optional(),
    status: z.string().max(60).optional(),
    archived: z.boolean(),
    href: z
      .string()
      .max(2048)
      .refine((value) => {
        try {
          return (
            value.startsWith("/") &&
            !/[\\\u0000-\u001f]/.test(value) &&
            new URL(value, "https://stylus.invalid").origin ===
              "https://stylus.invalid"
          );
        } catch {
          return false;
        }
      }),
    details: z
      .array(
        z
          .object({
            label: z.string().max(32),
            value: z.string().max(160),
            kind: z.enum(["text", "date", "member"]).optional(),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
export type EntityProjection = z.infer<typeof entityProjectionSchema>;
export type EntityResolution = { reference: EntityReference } & (
  | { status: "available"; projection: EntityProjection }
  | { status: "unavailable" | "error" }
);
export type EntityField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "datetime" | "select" | "assignee";
  required?: boolean;
  maxLength?: number;
  options?: readonly string[];
  initial?: string;
};
export type EntityMetadata = {
  id: string;
  label: string;
  icon:
    "task" | "evidence" | "idea" | "competitor" | "campaign" | "brief" | "note";
  binding: "live" | "immutable";
  sourcePlugin?: string;
  readCapability?: string;
  routePrefix: string;
  fields?: readonly EntityField[];
  conversionOnly?: boolean;
  creationSelection?: "single-sticky" | "text-selection";
};
const entityMetadataSchema = z
  .object({
    id: entityReferenceSchema.shape.entityType,
    label: z.string().min(1).max(80),
    icon: z.enum([
      "task",
      "evidence",
      "idea",
      "competitor",
      "campaign",
      "brief",
      "note",
    ]),
    binding: z.enum(["live", "immutable"]),
    sourcePlugin: entityReferenceSchema.shape.sourcePlugin,
    readCapability: z
      .string()
      .max(100)
      .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/)
      .optional(),
    routePrefix: z
      .string()
      .max(200)
      .regex(/^\/(?!\/)[a-z0-9/-]*$/),
    conversionOnly: z.boolean().optional(),
    creationSelection: z.enum(["single-sticky", "text-selection"]).optional(),
    fields: z
      .array(
        z
          .object({
            key: z
              .string()
              .max(40)
              .regex(/^[a-z][a-zA-Z0-9]*$/),
            label: z.string().min(1).max(80),
            kind: z.enum([
              "text",
              "textarea",
              "date",
              "datetime",
              "select",
              "assignee",
            ]),
            required: z.boolean().optional(),
            maxLength: z.number().int().min(1).max(8000).optional(),
            options: z.array(z.string().max(80)).max(20).optional(),
            initial: z.string().max(80).optional(),
          })
          .strict(),
      )
      .max(20)
      .refine(
        (fields) =>
          new Set(fields.map((field) => field.key)).size === fields.length,
      )
      .optional(),
  })
  .strict();
export type EntityContext = {
  organizationId: string;
  actorId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  enabledPlugins: ReadonlySet<string>;
};
/** Private receipt inputs are reviewed working data, never a Board snapshot. */
export type EntityCreationReceipt = {
  id: string;
  organization_id: string;
  board_id: string | null;
  created_by: string | null;
  entity_type: string;
  entity_id: string;
  card_id: string;
  input: Record<string, unknown>;
  source_ids: string[];
  state: "PREPARED" | "CREATED";
  created_at: string;
};
export interface EntityProvider {
  readonly metadata: Readonly<EntityMetadata>;
  resolve(
    context: EntityContext,
    references: readonly EntityReference[],
  ): Promise<ReadonlyMap<string, EntityProjection>>;
  search?(
    context: EntityContext,
    query: string,
    before?: string,
  ): Promise<{ items: EntityResolution[]; hasMore: boolean }>;
  parseCreation?(input: unknown): Record<string, unknown>;
  create?(
    context: EntityContext,
    receipt: EntityCreationReceipt,
  ): Promise<EntityReference>;
}
export const entityReferenceKey = (ref: EntityReference) =>
  JSON.stringify([
    ref.entityType,
    ref.organizationId,
    ref.entityId,
    ref.sourcePlugin ?? null,
    ref.immutable?.runId ?? null,
    ref.immutable?.evidenceId ?? null,
  ]);
export const canCreateEntities = (context: EntityContext) =>
  context.role !== "VIEWER";
export const entitySearchPattern = (query: string) =>
  "%" + query.trim().replace(/[\\%_]/g, (value) => "\\" + value) + "%";

/** Trusted static providers only. No browser registry, executable projections or shared tenant state. */
export class EntityRegistry {
  readonly #providers = new Map<string, EntityProvider>();
  constructor(providers: readonly EntityProvider[]) {
    for (const provider of providers) {
      const meta = entityMetadataSchema.parse(provider.metadata);
      if (this.#providers.has(meta.id))
        throw Error("Duplicate entity provider: " + meta.id);
      if (
        !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(meta.id) ||
        !meta.id.startsWith((meta.sourcePlugin ?? "core") + ".")
      )
        throw Error("Invalid entity provider ownership");
      if (
        !!provider.create !== !!provider.parseCreation ||
        (!!provider.create && !meta.fields)
      )
        throw Error("Creation requires bounded fields and validation");
      this.#providers.set(
        meta.id,
        Object.freeze({ ...provider, metadata: Object.freeze({ ...meta }) }),
      );
    }
  }
  available(context: EntityContext, type: string) {
    const provider = this.#providers.get(type);
    return provider &&
      (!provider.metadata.sourcePlugin ||
        context.enabledPlugins.has(provider.metadata.sourcePlugin))
      ? provider
      : undefined;
  }
  discover(context: EntityContext) {
    return [...this.#providers.values()]
      .filter((p) => this.available(context, p.metadata.id))
      .sort((a, b) => a.metadata.id.localeCompare(b.metadata.id))
      .map((p) => ({
        ...p.metadata,
        searchable: !!p.search && !p.metadata.conversionOnly,
        creatable: canCreateEntities(context) && !!p.create,
      }));
  }
  async resolve(
    context: EntityContext,
    references: readonly EntityReference[],
  ): Promise<EntityResolution[]> {
    if (references.length > 50) throw Error("Resolve at most 50 references");
    const groups = new Map<string, EntityReference[]>(),
      output = new Map<string, EntityResolution>();
    for (const ref of references) {
      entityReferenceSchema.parse(ref);
      const provider = this.available(context, ref.entityType);
      output.set(entityReferenceKey(ref), {
        reference: ref,
        status: "unavailable",
      });
      if (
        !provider ||
        ref.organizationId !== context.organizationId ||
        ref.sourcePlugin !== provider.metadata.sourcePlugin ||
        (provider.metadata.binding === "immutable") !== !!ref.immutable
      )
        continue;
      const group = groups.get(ref.entityType) ?? [];
      if (
        !group.some(
          (value) => entityReferenceKey(value) === entityReferenceKey(ref),
        )
      )
        group.push(ref);
      groups.set(ref.entityType, group);
    }
    // One bounded adapter query per type, not one server request per card.
    for (const [type, refs] of groups) {
      const provider = this.available(context, type)!;
      try {
        const rows = await provider.resolve(context, refs);
        for (const ref of refs) {
          const value = rows.get(entityReferenceKey(ref));
          if (!value) continue;
          const projection = entityProjectionSchema.parse(value);
          const path = new URL(projection.href, "https://stylus.invalid")
              .pathname,
            prefix = provider.metadata.routePrefix;
          if (path !== prefix && !path.startsWith(prefix + "/"))
            throw Error("Invalid entity opener");
          output.set(entityReferenceKey(ref), {
            reference: ref,
            status: "available",
            projection,
          });
        }
      } catch {
        for (const ref of refs)
          output.set(entityReferenceKey(ref), {
            reference: ref,
            status: "error",
          });
      }
    }
    return references.map((ref) => output.get(entityReferenceKey(ref))!);
  }
}
