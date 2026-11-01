import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { AIManagement } from "@/components/ai/ai-management";
import { PageHeader } from "@/components/ui/page-header";
import { getConfiguredAIProviderIds } from "@/modules/ai/server/configured";
import {
  getOrganizationAIPolicy,
  getOrganizationAIRuns,
} from "@/modules/ai/server/data";

export default async function AIPage() {
  const context = await getWorkspaceContext();

  const [policy, runs] = await Promise.all([
    getOrganizationAIPolicy(context.organization.id),
    getOrganizationAIRuns(context.organization.id),
  ]);
  return (
    <>
      <PageHeader
        description="Set organization AI boundaries and inspect safe execution metadata. Core work remains available when AI is disabled or offline."
        title="AI"
      />
      <AIManagement
        configuredProviderIds={getConfiguredAIProviderIds()}
        currentRole={context.membership.role}
        policy={policy}
        runs={runs}
      />
    </>
  );
}
