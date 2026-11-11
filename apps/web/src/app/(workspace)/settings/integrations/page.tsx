import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNavigation } from "@/components/layout/settings-navigation";
import { IntegrationsSettings } from "@/components/integrations/integrations-settings";
import { loadIntegrationSettings } from "@/modules/integrations/actions";
import { integrationEnvironment } from "@/modules/integrations/server/config";
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    grant = z.uuid().safeParse(p.grant),
    config = integrationEnvironment(),
    slug = config.STYLUS_GITHUB_APP_SLUG;
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the tools your team already uses."
      />
      <SettingsNavigation />
      <IntegrationsSettings
        initial={await loadIntegrationSettings()}
        grantId={grant.success ? grant.data : undefined}
        installUrl={
          slug && /^[\w-]+$/.test(slug)
            ? `https://github.com/apps/${slug}/installations/new`
            : undefined
        }
        authorizationFailed={p.authorization === "failed"}
      />
    </>
  );
}
export const metadata = { title: "Integrations" };
