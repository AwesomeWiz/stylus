"use client";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TaskMember } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { TaskFilters, TaskView } from "@/modules/tasks/filters";
import { taskPriorityValues, taskStatusValues } from "@/modules/tasks/schemas";
import { taskHref } from "@/modules/tasks/url-state";
import { taskLabel, taskMemberName } from "./presentation";

const primary = [
  ["My tasks", "my"],
  ["All tasks", "all"],
  ["Upcoming", "upcoming"],
  ["Completed", "completed"],
] as const;
const secondary = [
  ["Overdue", "overdue"],
  ["Archive", "archive"],
  ["Calendar", "calendar"],
] as const;
export function TaskToolbar({
  filters,
  members,
  query,
}: {
  filters: TaskFilters;
  members: TaskMember[];
  query: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: Record<string, string | null> = {};
    for (const key of ["query", "assignee", "status", "priority"])
      if (data.has(key))
        patch[key] = String(data.get(key) ?? "").trim() || null;
    router.push(taskHref(query, patch), { scroll: false });
    setOpen(false);
  }
  function viewLink(label: string, view: TaskView) {
    return (
      <Link
        aria-current={filters.view === view ? "page" : undefined}
        className={cn(
          "text-muted-foreground hover:text-foreground inline-flex min-h-10 shrink-0 items-center border-b-2 border-transparent px-2 text-sm font-medium",
          filters.view === view && "border-primary text-foreground",
        )}
        href={taskHref(query, { view }) as Route}
        key={view}
      >
        {label}
      </Link>
    );
  }
  const chips = [
    { key: "query", value: filters.query, label: `Search: ${filters.query}` },
    {
      key: "assignee",
      value: filters.assigneeId,
      label:
        filters.assigneeId === "unassigned"
          ? "Unassigned"
          : taskMemberName(members, filters.assigneeId ?? null),
    },
    {
      key: "status",
      value: filters.status,
      label: taskLabel(filters.status ?? ""),
    },
    {
      key: "priority",
      value: filters.priority,
      label: `${taskLabel(filters.priority ?? "")} priority`,
    },
  ].filter((chip) => chip.value);
  return (
    <>
      <nav
        aria-label="Task views"
        className="mt-5 flex flex-wrap items-center gap-x-1 border-b"
      >
        {primary.map(([label, view]) => viewLink(label, view))}
        <details className="relative ml-1">
          <summary className="text-muted-foreground hover:text-foreground flex min-h-10 cursor-pointer items-center px-2 text-sm">
            {secondary.find(([, view]) => view === filters.view)?.[0] ??
              "More views"}
          </summary>
          <div className="bg-popover absolute top-full right-0 z-20 flex min-w-36 flex-col rounded-md border p-1 shadow-md">
            {secondary.map(([label, view]) => viewLink(label, view))}
          </div>
        </details>
      </nav>
      <div className="my-4 flex gap-2">
        <form
          aria-label="Search tasks"
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={apply}
        >
          <label className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4"
            />
            <span className="sr-only">Search task titles</span>
            <Input
              className="pl-9"
              defaultValue={filters.query}
              key={filters.query ?? ""}
              maxLength={100}
              name="query"
              placeholder="Search tasks"
            />
          </label>
          <Button type="submit" variant="secondary">
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Search</span>
          </Button>
        </form>
        <Button
          aria-expanded={open}
          onClick={() => setOpen(true)}
          variant="secondary"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filter
        </Button>
      </div>
      {chips.length ? (
        <div aria-label="Active filters" className="mb-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Link
              aria-label={`Remove ${chip.label} filter`}
              className="bg-muted inline-flex min-h-10 max-w-full items-center gap-2 rounded-md px-3 text-xs"
              href={taskHref(query, { [chip.key]: null }) as Route}
              key={chip.key}
            >
              <span className="truncate">{chip.label}</span>
              <X aria-hidden="true" className="size-3 shrink-0" />
            </Link>
          ))}
        </div>
      ) : null}
      <Dialog
        mobileSheet
        description="Narrow the current view. Search and task selection are preserved."
        onOpenChange={setOpen}
        open={open}
        title="Filter tasks"
      >
        <form className="space-y-4 p-6" onSubmit={apply}>
          <label className="block text-sm font-medium">
            Assignee
            <select
              className="border-input bg-background mt-1.5 h-11 w-full rounded-md border px-3"
              defaultValue={filters.assigneeId ?? ""}
              name="assignee"
            >
              <option value="">Any assignee</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option
                  key={member.member_user_id}
                  value={member.member_user_id}
                >
                  {member.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Status
            <select
              className="border-input bg-background mt-1.5 h-11 w-full rounded-md border px-3"
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
          </label>
          <label className="block text-sm font-medium">
            Priority
            <select
              className="border-input bg-background mt-1.5 h-11 w-full rounded-md border px-3"
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
          </label>
          <Button className="w-full" type="submit">
            Apply filters
          </Button>
        </form>
      </Dialog>
    </>
  );
}
