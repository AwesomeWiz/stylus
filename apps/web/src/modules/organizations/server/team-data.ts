import "server-only";

import type {
  OrganizationRole,
  OrganizationTeamMember,
} from "@/lib/supabase/database.types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrganizationTeamMemberWithActivity = OrganizationTeamMember & {
  lastSignInAt: string | null;
};

export async function getOrganizationMemberLastSignIns(
  currentRole: OrganizationRole,
  members: OrganizationTeamMember[],
): Promise<OrganizationTeamMemberWithActivity[]> {
  if (!(["OWNER", "ADMIN"] as OrganizationRole[]).includes(currentRole))
    throw new Error("Organization management permission required");
  const service = createServiceSupabaseClient();
  return Promise.all(
    members.map(async (member) => {
      const { data, error } = await service.auth.admin.getUserById(
        member.member_user_id,
      );
      return {
        ...member,
        lastSignInAt: error ? null : (data.user.last_sign_in_at ?? null),
      };
    }),
  );
}

export async function getOrganizationTeamData(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const [members, invitations] = await Promise.all([
    supabase.rpc("list_organization_team", {
      p_organization_id: organizationId,
    }),
    supabase.rpc("list_organization_invitations", {
      p_organization_id: organizationId,
    }),
  ]);
  if (members.error) throw new Error("The team directory could not be loaded.");
  return {
    invitations: invitations.error ? [] : (invitations.data ?? []),
    members: members.data ?? [],
  };
}

export async function getInvitationPreview(token: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "preview_organization_invitation",
    {
      p_token: token,
    },
  );
  return error ? null : (data?.[0] ?? null);
}
