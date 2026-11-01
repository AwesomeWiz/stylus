import { PageHeader } from "@/components/ui/page-header";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export default async function ExamplePluginPage() {
  const { context, plugin } = await requireEnabledPlugin("example");
  return (
    <>
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
    </>
  );
}
