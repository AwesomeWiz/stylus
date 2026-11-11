import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import type { IntegrationProvider } from "@/core/integrations/public";
import { IntegrationError } from "./errors";

const optional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional(),
);
export const integrationEnvironmentSchema = z.object({
  STYLUS_INTEGRATION_KEY_ID: optional,
  STYLUS_INTEGRATION_KEYS: optional,
  STYLUS_GITHUB_APP_ID: optional,
  STYLUS_GITHUB_APP_SLUG: optional,
  STYLUS_GITHUB_CLIENT_ID: optional,
  STYLUS_GITHUB_CLIENT_SECRET: optional,
  STYLUS_GITHUB_PRIVATE_KEY: optional,
  STYLUS_GOOGLE_CLIENT_ID: optional,
  STYLUS_GOOGLE_CLIENT_SECRET: optional,
});
export function integrationEnvironment() {
  return integrationEnvironmentSchema.parse(process.env);
}
export function validIntegrationOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
export function configured(provider: IntegrationProvider) {
  const e = integrationEnvironment();
  return !!(
    validIntegrationOrigin(serverEnv.NEXT_PUBLIC_SITE_URL) &&
    serverEnv.SUPABASE_SERVICE_ROLE_KEY &&
    e.STYLUS_INTEGRATION_KEY_ID &&
    e.STYLUS_INTEGRATION_KEYS &&
    (provider === "github"
      ? e.STYLUS_GITHUB_APP_ID &&
        e.STYLUS_GITHUB_APP_SLUG &&
        e.STYLUS_GITHUB_CLIENT_ID &&
        e.STYLUS_GITHUB_CLIENT_SECRET &&
        e.STYLUS_GITHUB_PRIVATE_KEY
      : e.STYLUS_GOOGLE_CLIENT_ID && e.STYLUS_GOOGLE_CLIENT_SECRET)
  );
}
export function requireConfigured(provider: IntegrationProvider) {
  if (!configured(provider)) throw new IntegrationError("setup");
  return integrationEnvironment();
}
export function callbackUrl(provider: IntegrationProvider) {
  if (!validIntegrationOrigin(serverEnv.NEXT_PUBLIC_SITE_URL))
    throw new IntegrationError("setup");
  return new URL(
    `/integrations/${provider}/callback`,
    serverEnv.NEXT_PUBLIC_SITE_URL,
  ).href;
}
