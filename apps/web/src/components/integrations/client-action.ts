import type { IntegrationResult } from "@/core/integrations/public";
/** A failed Server Action transport must also leave a recoverable local panel. */
export function resilientIntegrationAction<Args extends unknown[], Value>(
  action: (...args: Args) => Promise<IntegrationResult<Value>>,
) {
  return async (...args: Args): Promise<IntegrationResult<Value>> => {
    try {
      return await action(...args);
    } catch {
      return {
        ok: false,
        message: "The request could not complete. Try again.",
      };
    }
  };
}
