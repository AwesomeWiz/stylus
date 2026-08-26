import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import type {
  MembershipRow,
  OrganizationRow,
} from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/modules/auth/server/session";

import {
  authorizeOrganizationMembership,
  OrganizationAccessDeniedError,
  type MembershipLookup,
} from "../authorization";

export interface OrganizationContext {
  membership: MembershipRow;
  organization: OrganizationRow;
  user: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
}

function createMembershipLookup(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): MembershipLookup {
  return {
    async findMembership({ organizationId, userId }) {
      const { data, error } = await supabase
        .from("memberships")
        .select("created_at, organization_id, removed_at, role, user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw new OrganizationAccessDeniedError();
      }

      return data;
    },
  };
}

export async function requireOrganizationMembership(organizationId: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const membership = await authorizeOrganizationMembership({
    lookup: createMembershipLookup(supabase),
    organizationId,
    userId: user.id,
  });
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("created_at, created_by, id, name, updated_at")
    .eq("id", membership.organization_id)
    .single();

  if (error || !organization) {
    throw new OrganizationAccessDeniedError();
  }

  return { membership, organization, user } satisfies OrganizationContext;
}

export const getCurrentOrganizationContext = cache(
  async (): Promise<OrganizationContext | null> => {
    const user = await requireAuthenticatedUser();
    const supabase = await createServerSupabaseClient();
    const selectedOrganizationId = (await cookies()).get(
      "stylus_organization_id",
    )?.value;
    const baseQuery = supabase
      .from("memberships")
      .select("created_at, organization_id, removed_at, role, user_id")
      .eq("user_id", user.id)
      .is("removed_at", null);
    const selectedResult = selectedOrganizationId
      ? await baseQuery
          .eq("organization_id", selectedOrganizationId)
          .maybeSingle()
      : { data: null, error: null };
    const fallbackResult = selectedResult.data
      ? selectedResult
      : await supabase
          .from("memberships")
          .select("created_at, organization_id, removed_at, role, user_id")
          .eq("user_id", user.id)
          .is("removed_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
    const { data: membership, error } = fallbackResult;

    if (error) {
      throw new OrganizationAccessDeniedError();
    }

    if (!membership) {
      return null;
    }

    return requireOrganizationMembership(membership.organization_id);
  },
);
