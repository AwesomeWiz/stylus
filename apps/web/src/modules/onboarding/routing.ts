import type { OrganizationRole } from "@/lib/supabase/database.types";

import { canManageOrganization } from "../organizations/authorization";
import { getOnboardingPath } from "./steps";

export function getWorkspaceRouteDecision(input: {
  completedAt: string | null;
  currentStep: number;
  role: OrganizationRole;
}) {
  if (input.completedAt) return null;
  if (!canManageOrganization(input.role)) return "/onboarding/company";
  return getOnboardingPath(input.currentStep);
}

export function shouldRedirectCompletedOnboarding(input: {
  completedAt: string | null;
  editing: boolean;
}) {
  return Boolean(input.completedAt) && !input.editing;
}
