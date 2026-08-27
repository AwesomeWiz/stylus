import type { PluginMemoryDomain } from "@/core/plugins/public";
import type { OrganizationRole } from "@/lib/supabase/database.types";

export class MemoryAccessDeniedError extends Error {
  constructor() {
    super("Memory access is not permitted");
    this.name = "MemoryAccessDeniedError";
  }
}

export function canMutateCompanyMemory(role: OrganizationRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function assertCanMutateCompanyMemory(role: OrganizationRole) {
  if (!canMutateCompanyMemory(role)) throw new MemoryAccessDeniedError();
}

export function authorizeRequestedMemoryDomains(input: {
  capability: string;
  declaredDomains: readonly PluginMemoryDomain[];
  enabled: boolean;
  pluginId: string | null;
  requestedDomains: readonly PluginMemoryDomain[];
}) {
  const requested = [...new Set(input.requestedDomains)];
  if (input.pluginId === null) {
    if (
      !input.capability.startsWith("core.") ||
      requested.some((domain) => domain !== "company")
    )
      throw new MemoryAccessDeniedError();
    return requested;
  }
  if (!input.enabled || !input.capability.startsWith(`${input.pluginId}.`))
    throw new MemoryAccessDeniedError();
  const declared = new Set(input.declaredDomains);
  if (requested.some((domain) => !declared.has(domain)))
    throw new MemoryAccessDeniedError();
  return requested;
}
