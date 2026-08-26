export const aiErrorCategories = [
  "provider_unavailable",
  "authentication_failed",
  "rate_limited",
  "timeout",
  "invalid_response",
  "context_limit",
  "budget_exceeded",
  "policy_denied",
  "cancelled",
  "unknown",
] as const;

export type AIErrorCategory = (typeof aiErrorCategories)[number];

const publicMessages: Record<AIErrorCategory, string> = {
  authentication_failed: "The configured AI provider could not authenticate.",
  budget_exceeded: "The organization AI budget has been reached.",
  cancelled: "The AI request was cancelled.",
  context_limit: "The AI request exceeds the selected model context limit.",
  invalid_response: "The AI provider returned an invalid response.",
  policy_denied: "The organization AI policy does not allow this request.",
  provider_unavailable: "The configured AI provider is unavailable.",
  rate_limited: "The AI provider is temporarily rate limited.",
  timeout: "The AI request timed out.",
  unknown: "The AI request could not be completed.",
};

export class AIError extends Error {
  constructor(
    readonly category: AIErrorCategory,
    options?: { cause?: unknown; diagnostic?: string },
  ) {
    super(publicMessages[category], { cause: options?.cause });
    this.name = "AIError";
    this.diagnostic = options?.diagnostic;
  }

  readonly diagnostic?: string;
}

export function normalizeAIError(error: unknown) {
  return error instanceof AIError
    ? error
    : new AIError("unknown", { cause: error });
}

export function isRetryableAIError(error: AIError) {
  return (
    error.category === "provider_unavailable" ||
    error.category === "rate_limited" ||
    error.category === "unknown"
  );
}
