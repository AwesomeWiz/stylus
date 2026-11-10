import "server-only";
import { revalidatePath } from "next/cache";
import { executionMutation } from "../schemas";
import { executionContext } from "./context";
export async function mutateExecution(input: unknown) {
  const value = executionMutation.parse(input),
    { db, org } = await executionContext(true);
  const result = await (async () => {
    switch (value.operation) {
      case "dependency":
        return db.rpc("set_task_dependency", {
          p_organization_id: org,
          p_task_id: value.taskId,
          p_blocked_by_id: value.blockedById,
          p_link: value.link,
        });
      case "assignment":
        return db.rpc("set_task_milestone", {
          p_organization_id: org,
          p_task_id: value.taskId,
          p_milestone_id: value.milestoneId,
        });
      case "milestone":
        return db.rpc("save_milestone", {
          p_organization_id: org,
          p_id: value.id,
          p_title: value.title,
          p_description: value.description,
          p_target_date: value.targetDate,
          p_status: value.status,
          p_owner_id: value.ownerId,
          p_archived: value.archived,
          p_expected_updated_at: value.revision,
        });
      case "note":
        return db.rpc("save_core_note", {
          p_organization_id: org,
          p_id: value.id,
          p_title: value.title,
          p_content: value.content,
          p_archived: value.archived,
          p_expected_updated_at: value.revision,
        });
      case "note-link":
        return db.rpc("set_core_note_link", {
          p_organization_id: org,
          p_note_id: value.noteId,
          p_kind: value.kind,
          p_target_id: value.targetId,
          p_link: value.link,
        });
      case "note-memory":
        return db.rpc("promote_core_note", {
          p_organization_id: org,
          p_note_id: value.noteId,
          p_kind: value.kind,
          p_title: value.title,
          p_content: value.content,
          p_expected_updated_at: value.revision,
        });
    }
  })();
  if (result.error) throw result.error;
  for (const path of ["/", "/tasks", "/notes"]) revalidatePath(path);
  if (value.operation === "note-memory") revalidatePath("/memory");
  return { id: typeof result.data === "string" ? result.data : undefined };
}
