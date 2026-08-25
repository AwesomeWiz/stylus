import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskMember } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { TaskFilters, TaskView } from "@/modules/tasks/filters";
import { taskPriorityValues, taskStatusValues } from "@/modules/tasks/schemas";

import { taskLabel } from "./presentation";

const views: Array<{ label: string; value: TaskView }> = [
  { label: "My tasks", value: "my" },
  { label: "All tasks", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Overdue", value: "overdue" },
  { label: "Completed", value: "completed" },
  { label: "Archive", value: "archive" },
  { label: "Calendar", value: "calendar" },
];

export function TaskToolbar({
  filters,
  members,
}: {
  filters: TaskFilters;
  members: TaskMember[];
}) {
  return (
    <>
      <div
        className="mt-5 flex gap-1 overflow-x-auto border-b"
        aria-label="Task views"
      >
        {views.map((view) => (
          <Link
            aria-current={filters.view === view.value ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:text-foreground shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium",
              filters.view === view.value && "border-primary text-foreground",
            )}
            href={{ pathname: "/tasks", query: { view: view.value } }}
            key={view.value}
          >
            {view.label}
          </Link>
        ))}
      </div>

      <form
        className="my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,10rem)_auto]"
        method="get"
      >
        <input name="view" type="hidden" value={filters.view} />
        <label className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-3 left-3 size-4"
          />
          <span className="sr-only">Search task titles</span>
          <Input
            className="pl-9"
            defaultValue={filters.query}
            name="query"
            placeholder="Search tasks"
          />
        </label>
        <select
          aria-label="Filter by assignee"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue={filters.assigneeId ?? ""}
          name="assignee"
        >
          <option value="">Any assignee</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.member_user_id} value={member.member_user_id}>
              {member.display_name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue={filters.status ?? ""}
          name="status"
        >
          <option value="">Any status</option>
          {taskStatusValues.map((status) => (
            <option key={status} value={status}>
              {taskLabel(status)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue={filters.priority ?? ""}
          name="priority"
        >
          <option value="">Any priority</option>
          {taskPriorityValues.map((priority) => (
            <option key={priority} value={priority}>
              {taskLabel(priority)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
      </form>
    </>
  );
}
