import { isActiveTask, isOverdue } from "@/modules/tasks/filters";
import type { TaskListItem } from "@/modules/tasks/list";

export const HOME_ATTENTION_LIMIT = 6;
export const DUE_SOON_MS = 48 * 60 * 60 * 1000;
export function attentionReason(task: TaskListItem, userId: string, now: Date) {
  if (isOverdue(task, now)) return "Overdue";
  if (task.due_at && Date.parse(task.due_at) <= now.getTime() + DUE_SOON_MS)
    return "Due soon";
  if (task.assignee_id === userId) return "Assigned to you";
  return "Active work";
}
export function homeAttention(
  tasks: TaskListItem[],
  userId: string,
  now: Date,
) {
  const ranks = {
    Overdue: 0,
    "Due soon": 1,
    "Assigned to you": 2,
    "Active work": 3,
  };
  return [
    ...new Map(
      tasks.filter(isActiveTask).map((task) => [task.id, task]),
    ).values(),
  ]
    .sort(
      (a, b) =>
        ranks[attentionReason(a, userId, now)] -
          ranks[attentionReason(b, userId, now)] ||
        (a.due_at ? Date.parse(a.due_at) : Infinity) -
          (b.due_at ? Date.parse(b.due_at) : Infinity) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, HOME_ATTENTION_LIMIT);
}
