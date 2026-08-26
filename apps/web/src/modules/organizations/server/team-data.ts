import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

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
