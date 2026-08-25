import type { OrganizationRole } from "@/lib/supabase/database.types";
import { canManageOrganization } from "@/modules/organizations/authorization";

export class OnboardingMutationDeniedError extends Error {
  constructor() {
    super(
      "Company profile management requires an owner or administrator role.",
    );
    this.name = "OnboardingMutationDeniedError";
  }
}

export function assertCanManageOnboarding(role: OrganizationRole) {
  if (!canManageOrganization(role)) throw new OnboardingMutationDeniedError();
}
