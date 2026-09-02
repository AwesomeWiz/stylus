import { AskCouncilWorkspace } from "@/components/marketing/ask-council-workspace";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { getAskCouncilWorkspaceData } from "@/modules/marketing/server/ask-council-data";
import { requireEnabledPlugin } from "@/modules/plugins/server/guard";

export const maxDuration = 60;

export default async function AskCouncilPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { context } = await requireEnabledPlugin("marketing");
  const requested = (await searchParams).conversation ?? null;
  const conversationId =
    requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : null;
  const data = await getAskCouncilWorkspaceData({
    conversationId,
    organizationId: context.organization.id,
  });
  return (
    <MarketingPage
      activePath="/apps/marketing/council"
      context={context}
      description="Consult a bounded specialist council using authorized Stylus evidence."
      title="Ask Council"
    >
      <AskCouncilWorkspace
        {...data}
        idempotencyKey={crypto.randomUUID()}
        role={context.membership.role}
      />
    </MarketingPage>
  );
}
