import { z } from "zod";
import { getAuthenticatedUser } from "@/modules/auth/server/session";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import { loadTaskComments, loadTaskDetail } from "@/modules/tasks/read-actions";
import { readTaskExecutionAction } from "@/modules/execution/actions";
import { loadEntityProvenance } from "@/core/entities/actions";

const selection = z
  .object({
    taskId: z.uuid(),
    organizationId: z.uuid(),
    kind: z.enum(["detail", "comments", "execution", "provenance"]),
    beforeCreatedAt: z.iso.datetime({ offset: true }).optional(),
    beforeId: z.uuid().optional(),
  })
  .strict()
  .refine(
    (value) =>
      (!value.beforeId && !value.beforeCreatedAt) ||
      (value.kind === "comments" &&
        !!value.beforeId &&
        !!value.beforeCreatedAt),
  );
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function unavailable(status: number) {
  return Response.json({ status: "unavailable" }, { status, headers });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const url = new URL(request.url);
  if (url.search.length > 512) return unavailable(400);
  const query = [...url.searchParams];
  if (new Set(query.map(([key]) => key)).size !== query.length)
    return unavailable(400);
  const parsed = selection.safeParse({
    ...Object.fromEntries(query),
    taskId: (await params).taskId,
  });
  if (!parsed.success) return unavailable(400);
  try {
    if (!(await getAuthenticatedUser())) return unavailable(401);
    const context = await getCurrentOrganizationContext();
    if (!context || context.organization.id !== parsed.data.organizationId)
      return unavailable(403);
    const { taskId, organizationId, kind, beforeId, beforeCreatedAt } =
      parsed.data;
    const input = { taskId, organizationId };
    // Each existing helper retains its own fresh tenant/entity checks. Never use
    // a layout, expected organization or frontend role as mutation/read authority.
    const data =
      kind === "detail"
        ? await loadTaskDetail(input)
        : kind === "comments"
          ? await loadTaskComments({
              ...input,
              ...(beforeId && beforeCreatedAt
                ? { before: { id: beforeId, createdAt: beforeCreatedAt } }
                : {}),
            })
          : kind === "execution"
            ? await readTaskExecutionAction({ taskId })
            : await loadEntityProvenance({
                entityType: "core.task",
                entityId: taskId,
              });
    return Response.json(data, { headers });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers });
  }
}
