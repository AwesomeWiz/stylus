import "server-only";
import { IntegrationError } from "./errors";

/** Only fixed provider hosts. No redirects, browser cache, raw provider errors or unlimited bodies. */
export async function providerResponse(
  url: string,
  init: RequestInit = {},
): Promise<{ body: string; contentType: string }> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    ![
      "api.github.com",
      "github.com",
      "www.googleapis.com",
      "oauth2.googleapis.com",
      "accounts.google.com",
    ].includes(parsed.hostname)
  )
    throw new IntegrationError("invalid");
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json", ...init.headers },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new IntegrationError(
        response.status === 401 ||
          (response.status === 400 && parsed.pathname === "/token")
          ? "authorization"
          : response.status === 429 ||
              (response.status === 403 &&
                (response.headers.get("x-ratelimit-remaining") === "0" ||
                  response.headers.has("retry-after")))
            ? "rate-limit"
            : response.status === 403
              ? "authorization"
              : response.status === 404 || response.status === 410
                ? "denied"
                : response.status === 409
                  ? "conflict"
                  : response.status === 400
                    ? "invalid"
                    : "unavailable",
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new IntegrationError("unavailable");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512_000) throw new IntegrationError("unavailable");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    return {
      body: Buffer.concat(chunks).toString("utf8"),
      contentType: response.headers.get("content-type") ?? "",
    };
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError("unavailable");
  }
}
export async function providerRequest(
  url: string,
  init: RequestInit = {},
): Promise<unknown> {
  try {
    return JSON.parse((await providerResponse(url, init)).body);
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError("unavailable");
  }
}
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
