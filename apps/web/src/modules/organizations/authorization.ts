import { z } from "zod";

import type {
  MembershipRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";

const organizationIdSchema = z.uuid();

export interface MembershipLookup {
  findMembership(input: {
    organizationId: string;
    userId: string;
  }): Promise<MembershipRow | null>;
}

export class OrganizationAccessDeniedError extends Error {
  constructor() {
    super("Organization membership required");
    this.name = "OrganizationAccessDeniedError";
  }
}

export async function authorizeOrganizationMembership(input: {
  lookup: MembershipLookup;
  organizationId: string;
  userId: string;
}) {
  const parsedOrganizationId = organizationIdSchema.safeParse(
    input.organizationId,
  );

  if (!parsedOrganizationId.success) {
    throw new OrganizationAccessDeniedError();
  }

  const membership = await input.lookup.findMembership({
    organizationId: parsedOrganizationId.data,
    userId: input.userId,
  });

  if (
    !membership ||
    membership.user_id !== input.userId ||
    membership.removed_at !== null
  ) {
    throw new OrganizationAccessDeniedError();
  }

  return membership;
}

export function canManageOrganization(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN";
}
