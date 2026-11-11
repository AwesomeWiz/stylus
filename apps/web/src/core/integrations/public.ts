import { z } from "zod";
import { entityReferenceSchema } from "@/core/entities/public";

export const integrationProviders = [
  "github",
  "google-drive",
  "google-calendar",
] as const;
export const providerSchema = z.enum(integrationProviders);
export type IntegrationProvider = z.infer<typeof providerSchema>;
export const targetSchema = entityReferenceSchema
  .pick({ entityType: true, entityId: true })
  .extend({
    entityType: z.enum([
      "core.task",
      "core.milestone",
      "core.note",
      "marketing.hypothesis",
      "marketing.experiment",
    ]),
  })
  .strict();
export type IntegrationTarget = z.infer<typeof targetSchema>;
const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9_@.\-]+$/);
export const locatorSchema = z.discriminatedUnion("provider", [
  z
    .object({
      provider: z.literal("github"),
      kind: z.enum(["repository", "issue", "pull-request", "commit"]),
      repositoryId: z.string().regex(/^\d{1,20}$/),
      repository: z
        .string()
        .max(200)
        .regex(/^[\w.-]+\/[\w.-]+$/),
      id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    })
    .strict()
    .refine(
      (value) =>
        value.kind === "commit"
          ? /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value.id)
          : value.kind === "repository"
            ? value.id === value.repositoryId
            : /^[1-9]\d{0,8}$/.test(value.id),
      "Use the exact resource identity",
    ),
  z
    .object({
      provider: z.literal("google-drive"),
      kind: z.literal("file"),
      id: opaqueId,
    })
    .strict(),
  z
    .object({
      provider: z.literal("google-calendar"),
      kind: z.literal("event"),
      id: opaqueId,
      calendarId: z
        .string()
        .min(1)
        .max(256)
        .regex(/^[a-zA-Z0-9_@.+#-]+$/)
        .refine(
          (value) => value !== "primary",
          "Use the exact calendar identity",
        ),
    })
    .strict(),
]);
export type ResourceLocator = z.infer<typeof locatorSchema>;
export const resourceProjectionSchema = z
  .object({
    locator: locatorSchema,
    title: z.string().min(1).max(200),
    url: z.string().max(2048),
    detail: z.string().max(260),
    state: z.string().max(40).optional(),
    start: z.string().max(80).optional(),
    end: z.string().max(80).optional(),
    checkedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (value) => validResourceUrl(value.locator.provider, value.url),
    "Invalid provider link",
  );
export type ResourceProjection = z.infer<typeof resourceProjectionSchema>;
export type RepositoryChoice = { id: string; fullName: string };
export type ConnectionRow = {
  id: string;
  organization_id: string;
  owner_id: string | null;
  provider: IntegrationProvider;
  status: "connected" | "attention" | "disconnected";
  display_name: string;
  account_id: string;
  generation: number;
  config: { installationId?: string; repositories?: RepositoryChoice[] };
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type ConnectionView = Pick<
  ConnectionRow,
  "id" | "provider" | "status" | "display_name" | "config"
>;
export type LinkRow = {
  id: string;
  organization_id: string;
  connection_id: string;
  entity_type: IntegrationTarget["entityType"];
  entity_id: string;
  locator: ResourceLocator;
  created_by: string;
  created_at: string;
};
export type LinkedResource = { id: string; provider: IntegrationProvider } & (
  | { status: "available"; resource: ResourceProjection }
  | { status: "unavailable"; message: string }
);
export type SearchInput = {
  connectionId: string;
  query: string;
  cursor?: string;
  kind?: "repository" | "issue" | "pull-request" | "commit";
  repositoryId?: string;
  calendarId?: string;
};
export type ResourcePage = { items: ResourceProjection[]; cursor?: string };
export type CalendarChoice = {
  id: string;
  title: string;
  writable: boolean;
  primary?: boolean;
};
export type IntegrationResult<T> =
  { ok: true; data: T } | { ok: false; message: string; recovery?: "edit" };

export function validResourceUrl(provider: IntegrationProvider, value: string) {
  try {
    const url = new URL(value);
    const hosts =
      provider === "github"
        ? ["github.com"]
        : provider === "google-drive"
          ? ["drive.google.com", "docs.google.com"]
          : ["calendar.google.com", "www.google.com"];
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      hosts.includes(url.hostname)
    );
  } catch {
    return false;
  }
}
