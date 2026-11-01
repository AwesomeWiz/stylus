import type { TaskRow } from "@/lib/supabase/database.types";

/** List reads deliberately exclude descriptions, authors and comment bodies. */
export const TASK_LIST_COLUMNS =
  "id,title,status,priority,assignee_id,due_at,scheduled_at,completed_at,created_at";

export type TaskListItem = Pick<
  TaskRow,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "assignee_id"
  | "due_at"
  | "scheduled_at"
  | "completed_at"
  | "created_at"
>;
