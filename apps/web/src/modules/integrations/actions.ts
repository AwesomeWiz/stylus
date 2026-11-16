"use server";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import {
  locatorSchema,
  providerSchema,
  targetSchema,
  type IntegrationResult,
} from "@/core/integrations/public";
import { beginOAuth } from "./server/oauth";
import { IntegrationError, safeIntegrationError } from "./server/errors";
import {
  disconnectConnection,
  githubChoices,
  saveGithubSelection,
  settingsConnections,
} from "./server/connections";
import {
  addCalendarEvent,
  attachResource,
  calendarChoices,
  calendarRecovery,
  linkedResources,
  removeResource,
  resourceWorkspace,
  searchResources,
} from "./server/resources";
import { calendarCreateSchema } from "./server/google";

async function safely<T>(
  work: () => Promise<T>,
): Promise<IntegrationResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof z.ZodError
          ? "Check the form fields and try again."
          : safeIntegrationError(error),
      ...((error instanceof IntegrationError && error.category === "invalid") ||
      error instanceof z.ZodError
        ? { recovery: "edit" as const }
        : {}),
    };
  }
}
export async function connectIntegration(provider: unknown) {
  return safely(() => beginOAuth(providerSchema.parse(provider)));
}
export async function loadIntegrationSettings() {
  return safely(settingsConnections);
}
export async function disconnectIntegration(id: unknown) {
  return safely(() => disconnectConnection(z.uuid().parse(id)));
}
const githubChoiceSchema = z
  .object({
    grantId: z.uuid(),
    installationId: z
      .string()
      .regex(/^\d{1,20}$/)
      .optional(),
    page: z.number().int().min(1).max(40).default(1),
  })
  .strict();
export async function loadGithubChoices(input: unknown) {
  return safely(async () => {
    const v = githubChoiceSchema.parse(input);
    return githubChoices(v.grantId, v.installationId, v.page);
  });
}
export async function selectGithubRepositories(input: unknown) {
  return safely(async () => {
    const v = z
      .object({
        grantId: z.uuid(),
        installationId: z.string().regex(/^\d{1,20}$/),
        repositories: z
          .array(
            z
              .object({
                id: z.string().regex(/^\d{1,20}$/),
                fullName: z
                  .string()
                  .max(200)
                  .regex(/^[\w.-]+\/[\w.-]+$/),
              })
              .strict(),
          )
          .min(1)
          .max(20)
          .refine((r) => new Set(r.map((v) => v.id)).size === r.length),
      })
      .strict()
      .parse(input);
    await saveGithubSelection(v.grantId, v.installationId, v.repositories);
  });
}
export async function loadConnectedResources(input: unknown) {
  return safely(async () => {
    const target = targetSchema.parse(input);
    return {
      ...(await resourceWorkspace(target)),
      ...(await linkedResources(target)),
    };
  });
}
export async function refreshConnectedResources(input: unknown) {
  return safely(async () => {
    const v = z
      .object({
        target: targetSchema,
        cursor: z.uuid().optional(),
        refresh: z.boolean().default(false),
      })
      .strict()
      .parse(input);
    return linkedResources(v.target, v.cursor, v.refresh);
  });
}
export async function searchConnectedResources(input: unknown) {
  return safely(async () => {
    const v = z
      .object({
        target: targetSchema,
        connectionId: z.uuid(),
        query: z.string().trim().max(120),
        cursor: z.string().max(2048).optional(),
        kind: z
          .enum(["repository", "issue", "pull-request", "commit"])
          .optional(),
        repositoryId: z
          .string()
          .regex(/^\d{1,20}$/)
          .optional(),
        calendarId: z.string().min(1).max(256).optional(),
      })
      .strict()
      .parse(input);
    return searchResources(v.target, v);
  });
}
export async function attachConnectedResource(input: unknown) {
  return safely(async () => {
    const v = z
      .object({
        target: targetSchema,
        connectionId: z.uuid(),
        locator: locatorSchema,
      })
      .strict()
      .parse(input);
    return attachResource(v.target, v.connectionId, v.locator);
  });
}
export async function unlinkConnectedResource(input: unknown) {
  return safely(async () => {
    const v = z
      .object({ target: targetSchema, id: z.uuid() })
      .strict()
      .parse(input);
    await removeResource(v.target, v.id);
  });
}
export async function loadCalendarChoices(input: unknown) {
  return safely(async () => {
    const v = z
      .object({ target: targetSchema, connectionId: z.uuid() })
      .strict()
      .parse(input);
    return calendarChoices(v.target, v.connectionId);
  });
}
export async function createConnectedCalendarEvent(input: unknown) {
  return safely(async () => {
    const v = z
      .object({
        target: targetSchema,
        connectionId: z.uuid(),
        intentId: z.uuid(),
        event: calendarCreateSchema,
      })
      .strict()
      .parse(input);
    return addCalendarEvent(v.target, v.connectionId, v.intentId, v.event);
  });
}
export async function loadCalendarRecovery(input: unknown) {
  return safely(async () => {
    const v = z
      .object({ target: targetSchema, connectionId: z.uuid() })
      .strict()
      .parse(input);
    return calendarRecovery(v.target, v.connectionId);
  });
}
