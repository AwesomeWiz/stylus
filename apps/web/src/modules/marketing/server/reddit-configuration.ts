import "server-only";

export type RedditConfiguration = {
  clientId: string;
  clientSecret: string;
  userAgent: string;
};

export function getRedditConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RedditConfiguration | null {
  if (environment.STYLUS_REDDIT_API_ENABLED !== "true") return null;
  const clientId = environment.STYLUS_REDDIT_CLIENT_ID?.trim();
  const clientSecret = environment.STYLUS_REDDIT_CLIENT_SECRET?.trim();
  const userAgent = environment.STYLUS_REDDIT_USER_AGENT?.trim();
  if (
    !clientId ||
    !clientSecret ||
    !userAgent ||
    clientId.length > 200 ||
    clientSecret.length > 500 ||
    userAgent.length > 200
  )
    return null;
  return { clientId, clientSecret, userAgent };
}
