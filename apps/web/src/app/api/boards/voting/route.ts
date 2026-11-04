import { readBoardVotingAction } from "@/modules/whiteboards/voting-actions";

const headers = { "Cache-Control": "private, no-store" };
const invalid = (status: number) =>
  Response.json(
    { status: "error", code: "RETRY", message: "Voting request is invalid." },
    { status, headers },
  );

/** Read-only transport: background projections must not queue Board mutations. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      // Next may canonicalize request.url to its listening hostname. The Host
      // received from the browser retains the public origin, including port.
      const host = request.headers.get("host") ?? new URL(request.url).host;
      if (new URL(origin).host !== host.toLowerCase()) return invalid(403);
    } catch {
      return invalid(403);
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return invalid(415);
  const reader = request.body?.getReader();
  if (!reader) return invalid(400);
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        return invalid(413);
      }
      parts.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return invalid(400);
    }
    // Fresh membership/tenant/active-Board checks and bounded output schema are
    // shared with direct server entry. This endpoint cannot start or cast votes.
    const result = await readBoardVotingAction(input);
    return Response.json(result, {
      status:
        result.status === "success"
          ? 200
          : result.code === "ACCESS"
            ? 403
            : 400,
      headers,
    });
  } catch {
    return Response.json(
      { status: "error", code: "RETRY", message: "Voting could not refresh." },
      { status: 503, headers },
    );
  } finally {
    reader.releaseLock();
  }
}
