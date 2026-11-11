import "server-only";
export class IntegrationError extends Error {
  constructor(
    readonly category:
      | "setup"
      | "denied"
      | "authorization"
      | "rate-limit"
      | "unavailable"
      | "invalid"
      | "conflict",
  ) {
    super(
      {
        setup: "This integration needs server configuration.",
        denied: "This resource or connection is unavailable.",
        authorization:
          "Authorization needs attention. Reconnect in Integrations.",
        "rate-limit": "The provider is busy. Try again later.",
        unavailable: "The provider could not be reached. Try again.",
        invalid: "Check the selected resource and try again.",
        conflict: "This connection changed. Reload before continuing.",
      }[category],
    );
  }
}
export function safeIntegrationError(error: unknown) {
  return error instanceof IntegrationError
    ? error.message
    : "Connected resources could not load. Try again.";
}
