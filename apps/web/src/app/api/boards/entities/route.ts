import { readBoardEntities } from "@/modules/whiteboards/server/entities";
const headers = { "Cache-Control": "private, no-store" };
const failure = (status: number) =>
  Response.json(
    {
      status: "error",
      message: "Stylus items could not load. Check access or retry.",
    },
    { status, headers },
  );
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (
      origin &&
      new URL(origin).host !==
        (request.headers.get("host") ?? new URL(request.url).host).toLowerCase()
    )
      return failure(403);
  } catch {
    return failure(403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return failure(415);
  const reader = request.body?.getReader();
  if (!reader) return failure(400);
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return failure(413);
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return failure(400);
    }
    return Response.json(
      { status: "success", data: await readBoardEntities(value) },
      { headers },
    );
  } catch (error) {
    return failure(
      typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "42501"
        ? 403
        : 400,
    );
  } finally {
    reader.releaseLock();
  }
}
