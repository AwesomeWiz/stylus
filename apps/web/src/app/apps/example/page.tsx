import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { logoutAction } from "@/modules/auth/actions";
import { getNotificationSummary } from "@/modules/notifications/server/data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function ExamplePluginPage() {
  const { context, plugin } = await requireEnabledPlugin("example");
  const notifications = await getNotificationSummary(
    context.organization.id,
    context.user.id,
  );
  return (
    <AppShell
      activePath="/apps/example"
      identity={{
        displayName: context.user.displayName,
        email: context.user.email,
      }}
      logoutAction={logoutAction}
      notifications={notifications}
      organization={{
        id: context.organization.id,
        name: context.organization.name,
        role: context.membership.role,
      }}
    >
      <PageHeader
        description="This guarded placeholder proves static plugin registration, navigation, and organization enablement."
        title={plugin.manifest.name}
      />
      <div className="max-w-2xl border-y py-5 text-sm">
        <p>
          The example module is enabled for {context.organization.name}. It does
          not implement a production business workflow.
        </p>
        <p className="text-muted-foreground mt-2">
          Capability: {plugin.manifest.capabilities.join(", ")}
        </p>
      </div>
    </AppShell>
  );
}
