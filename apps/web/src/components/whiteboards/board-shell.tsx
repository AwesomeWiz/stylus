import type {
  ShellIdentity,
  ShellOrganization,
} from "@/components/layout/app-shell";
import { getEnabledOrganizationPluginIds } from "@/modules/plugins/server/data";
import { getApplicationNavigation } from "@/plugins";
import type { BoardEditorData } from "@/modules/whiteboards/server/data";
import { WhiteboardWorkspace } from "./whiteboard-workspace";

/** The editor owns this immersive shell; AppShell and its notification UI never mount. */
export async function BoardShell({
  workspace,
  identity,
  organization,
  logoutAction,
  canMutate,
  currentUserId,
}: {
  workspace: BoardEditorData;
  identity: ShellIdentity;
  organization: ShellOrganization;
  logoutAction: () => Promise<void>;
  canMutate: boolean;
  currentUserId: string;
}) {
  const enabled = await getEnabledOrganizationPluginIds(organization.id);
  return (
    <WhiteboardWorkspace
      {...workspace}
      canMutate={canMutate}
      key={`${organization.id}:${workspace.board.id}:${currentUserId}:${organization.role}`}
      currentUser={{ displayName: identity.displayName, id: currentUserId }}
      shell={{
        identity,
        organization,
        logoutAction,
        navigationGroups: getApplicationNavigation(enabled),
      }}
    />
  );
}
