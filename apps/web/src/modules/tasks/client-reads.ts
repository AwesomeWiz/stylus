import type {
  loadTaskComments as Comments,
  loadTaskDetail as Detail,
} from "./read-actions";
import type { readTaskExecutionAction as Execution } from "@/modules/execution/actions";
import type { loadEntityProvenance as Provenance } from "@/core/entities/actions";

async function read<T>(
  kind: string,
  input: {
    taskId: string;
    organizationId: string;
    before?: { createdAt: string; id: string };
  },
): Promise<T> {
  const query = new URLSearchParams({
    kind,
    organizationId: input.organizationId,
  });
  if (input.before) {
    query.set("beforeCreatedAt", input.before.createdAt);
    query.set("beforeId", input.before.id);
  }
  const response = await fetch(
    `/api/tasks/${encodeURIComponent(input.taskId)}/read?${query}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) throw Error("Task read is unavailable");
  return response.json() as Promise<T>;
}
// Read-only requests can progress independently of Next's mutation-action queue.
// The endpoint rechecks identity/membership and uses the existing authorized reads.
export const loadTaskDetail = (
  input: Parameters<typeof Detail>[0] & {
    taskId: string;
    organizationId: string;
  },
) => read<Awaited<ReturnType<typeof Detail>>>("detail", input);
export const loadTaskComments = (input: {
  taskId: string;
  organizationId: string;
  before?: { createdAt: string; id: string };
}) => read<Awaited<ReturnType<typeof Comments>>>("comments", input);
export const loadTaskExecution = (input: {
  taskId: string;
  organizationId: string;
}) => read<Awaited<ReturnType<typeof Execution>>>("execution", input);
export const loadTaskProvenance = (input: {
  taskId: string;
  organizationId: string;
}) => read<Awaited<ReturnType<typeof Provenance>>>("provenance", input);
