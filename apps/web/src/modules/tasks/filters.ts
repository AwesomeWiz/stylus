import type {
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "@/lib/supabase/database.types";

export const taskViewValues = [
  "my",
  "all",
  "upcoming",
  "overdue",
  "completed",
  "archive",
  "calendar",
] as const;
export type TaskView = (typeof taskViewValues)[number];

export interface TaskFilters {
  assigneeId?: string;
  priority?: TaskPriority;
  query?: string;
  status?: TaskStatus;
  view: TaskView;
}

export const RECENT_COMPLETION_DAYS = 14;

export function isActiveTask(task: TaskRow) {
  return task.status !== "COMPLETED" && task.status !== "CANCELLED";
}

export function isOverdue(task: TaskRow, now: Date) {
  return Boolean(
    isActiveTask(task) &&
    task.due_at &&
    Date.parse(task.due_at) < now.getTime(),
  );
}

export function recentCompletionThreshold(now: Date) {
  return new Date(now.getTime() - RECENT_COMPLETION_DAYS * 24 * 60 * 60 * 1000);
}

function actionableRank(task: TaskRow, now: Date) {
  if (isOverdue(task, now)) return 0;
  if (task.due_at) return 1;
  if (task.scheduled_at) return 2;
  return 3;
}

export function sortTasks(tasks: TaskRow[], now: Date) {
  return [...tasks].sort((left, right) => {
    const rankDifference =
      actionableRank(left, now) - actionableRank(right, now);
    if (rankDifference) return rankDifference;
    const leftDate = left.due_at ?? left.scheduled_at;
    const rightDate = right.due_at ?? right.scheduled_at;
    if (leftDate && rightDate) {
      const dateDifference = Date.parse(leftDate) - Date.parse(rightDate);
      if (dateDifference) return dateDifference;
    } else if (leftDate) return -1;
    else if (rightDate) return 1;
    const createdDifference =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    return createdDifference || left.id.localeCompare(right.id);
  });
}

export function filterTasks(
  tasks: TaskRow[],
  filters: TaskFilters,
  currentUserId: string,
  now: Date,
) {
  const threshold = recentCompletionThreshold(now).getTime();
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase();
  const matchingTasks = tasks.filter((task) => {
    if (
      filters.view === "my" &&
      (task.assignee_id !== currentUserId || !isActiveTask(task))
    )
      return false;
    if (filters.view === "upcoming") {
      const nextDate = task.due_at ?? task.scheduled_at;
      if (
        !isActiveTask(task) ||
        !nextDate ||
        Date.parse(nextDate) < now.getTime()
      )
        return false;
    }
    if (filters.view === "overdue" && !isOverdue(task, now)) return false;
    if (
      filters.view === "completed" &&
      (task.status !== "COMPLETED" ||
        !task.completed_at ||
        Date.parse(task.completed_at) < threshold)
    )
      return false;
    if (
      filters.view === "archive" &&
      (task.status !== "COMPLETED" ||
        !task.completed_at ||
        Date.parse(task.completed_at) >= threshold)
    )
      return false;
    if (filters.view === "calendar" && !task.due_at && !task.scheduled_at)
      return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assigneeId === "unassigned" && task.assignee_id) return false;
    if (
      filters.assigneeId &&
      filters.assigneeId !== "unassigned" &&
      task.assignee_id !== filters.assigneeId
    )
      return false;
    if (
      normalizedQuery &&
      !task.title.toLocaleLowerCase().includes(normalizedQuery)
    )
      return false;
    return true;
  });

  if (filters.view === "completed" || filters.view === "archive") {
    return matchingTasks.sort((left, right) => {
      const completedDifference =
        Date.parse(right.completed_at ?? "") -
        Date.parse(left.completed_at ?? "");
      return completedDifference || left.id.localeCompare(right.id);
    });
  }
  if (filters.view === "calendar") {
    return matchingTasks.sort((left, right) => {
      const leftDate = left.due_at ?? left.scheduled_at!;
      const rightDate = right.due_at ?? right.scheduled_at!;
      return (
        Date.parse(leftDate) - Date.parse(rightDate) ||
        left.id.localeCompare(right.id)
      );
    });
  }
  return sortTasks(matchingTasks, now);
}
