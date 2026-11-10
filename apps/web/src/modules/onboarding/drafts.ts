import { z } from "zod";
export const draftStep = z.enum([
  "company",
  "problem",
  "product",
  "audience",
  "positioning-brand",
  "marketing",
  "competitors",
]);
const revision = z.iso.datetime({ offset: true }).nullable();
export const draftRequest = z
  .object({ organizationId: z.uuid(), step: draftStep })
  .strict();
export const draftSaveRequest = draftRequest
  .extend({
    fields: z
      .record(z.string().max(80), z.array(z.string().max(196608)).max(20))
      .refine(
        (fields) => JSON.stringify(fields).length <= 196608,
        "This draft is too large.",
      ),
    baseRevision: revision,
    revision,
  })
  .strict();
export const draftResolveRequest = draftRequest
  .extend({ revision, keep: z.boolean() })
  .strict();
export type DraftFields = Record<string, string[]>;
export type OnboardingDraft = {
  fields: DraftFields;
  updated_at: string | null;
  base_revision: string | null;
  conflicted: boolean;
};
export const draftIgnoredFields = new Set([
  "step",
  "mode",
  "returnTo",
  "organizationId",
  "baseRevision",
  "draftRevision",
]);
export function readDraftFields(form: HTMLFormElement): DraftFields {
  const fields: DraftFields = {};
  for (const [key, value] of new FormData(form)) {
    if (
      !draftIgnoredFields.has(key) &&
      !key.startsWith("$ACTION_") &&
      typeof value === "string"
    )
      (fields[key] ??= []).push(value);
  }
  if (
    form.querySelector('[name="step"]')?.getAttribute("value") === "marketing"
  )
    fields.secondaryObjectives ??= [];
  return fields;
}
