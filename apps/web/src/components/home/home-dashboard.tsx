import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { ActivityList } from "@/components/activity/activity-list";
import { buttonVariants } from "@/components/ui/button";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import { taskMemberName } from "@/components/tasks/presentation";
import type {
  ActivityEventRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { attentionReason, homeAttention } from "@/modules/home/attention";
import type { getMarketingOverview } from "@/modules/marketing/server/data";
import type { TaskListItem } from "@/modules/tasks/list";

interface HomeDashboardProps {
  activity: ActivityEventRow[];
  canMutate: boolean;
  currentUserId: string;
  marketing: Awaited<ReturnType<typeof getMarketingOverview>> | null;
  members: TaskMember[];
  nowIso: string;
  organizationName: string;
  tasks: TaskListItem[];
}

export function HomeDashboard({
  activity,
  canMutate,
  currentUserId,
  marketing,
  members,
  nowIso,
  organizationName,
  tasks,
}: HomeDashboardProps) {
  const now = new Date(nowIso);
  const attention = homeAttention(tasks, currentUserId, now);
  const meaningfulMarketing =
    marketing &&
    (marketing.ideaCounts.READY > 0 ||
      marketing.activeCampaigns > 0 ||
      marketing.recentResearch.length > 0 ||
      marketing.recentBriefs.length > 0);
  return (
    <div className="max-w-[1200px] space-y-8 [overflow-wrap:anywhere]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {organizationName}
          </p>
        </div>
        <Link
          className={buttonVariants({
            variant: canMutate ? "primary" : "secondary",
          })}
          href={canMutate ? "/tasks?create=true" : "/tasks"}
        >
          {canMutate ? (
            <>
              <Plus aria-hidden="true" className="size-4" />
              Create task
            </>
          ) : (
            "Review tasks"
          )}
        </Link>
      </header>
      <section aria-labelledby="attention-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold" id="attention-heading">
            Your attention
          </h2>
          <Link
            className="text-primary inline-flex min-h-10 items-center gap-1 text-sm hover:underline"
            href="/tasks?view=all"
          >
            View all tasks
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">
          Overdue first, then due within 48 hours, assigned to you and other
          active work.
        </p>
        {attention.length ? (
          <ul className="divide-y border-y">
            {attention.map((task) => {
              const reason = attentionReason(task, currentUserId, now);
              return (
                <li key={task.id}>
                  <Link
                    className="hover:bg-muted/40 block py-3 pr-2"
                    href={
                      `/tasks?view=all&task=${encodeURIComponent(task.id)}` as Route
                    }
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-medium break-words">
                        {task.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          reason === "Overdue"
                            ? "text-destructive font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {reason}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>{taskMemberName(members, task.assignee_id)}</span>
                      <span>
                        {task.due_at ? (
                          <>
                            Due <ViewerLocalDateTime value={task.due_at} />
                          </>
                        ) : (
                          "No deadline"
                        )}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground border-y py-6 text-sm">
            No active work needs attention.{" "}
            {canMutate
              ? "Create a task when your team has a new commitment."
              : "New team commitments will appear here."}
          </p>
        )}
      </section>
      {meaningfulMarketing && marketing ? (
        <section aria-labelledby="marketing-attention-heading">
          <h2 className="mb-3 font-semibold" id="marketing-attention-heading">
            Continue in Marketing
          </h2>
          <ul className="divide-y border-y text-sm">
            {marketing.ideaCounts.READY > 0 ? (
              <li>
                <Link
                  className="flex min-h-11 items-center justify-between gap-3 py-3 hover:underline"
                  href="/apps/marketing/reel-ideas"
                >
                  <span>Ideas ready to develop</span>
                  <span className="text-muted-foreground">
                    {marketing.ideaCounts.READY}
                  </span>
                </Link>
              </li>
            ) : null}
            {marketing.activeCampaigns > 0 ? (
              <li>
                <Link
                  className="flex min-h-11 items-center justify-between gap-3 py-3 hover:underline"
                  href="/apps/marketing/campaigns"
                >
                  <span>Active campaigns</span>
                  <span className="text-muted-foreground">
                    {marketing.activeCampaigns}
                  </span>
                </Link>
              </li>
            ) : null}
            {marketing.recentResearch.map((note) => (
              <li key={note.id}>
                <Link
                  className="block py-3 hover:underline"
                  href="/apps/marketing/research"
                >
                  <span className="text-muted-foreground mr-2 text-xs">
                    Research note
                  </span>
                  {note.title}
                </Link>
              </li>
            ))}
            {marketing.recentBriefs.map((brief) => (
              <li key={brief.id}>
                <Link
                  className="block py-3 hover:underline"
                  href="/apps/marketing/creative-briefs"
                >
                  <span className="text-muted-foreground mr-2 text-xs">
                    Creative brief
                  </span>
                  {brief.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="recent-activity-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold" id="recent-activity-heading">
            Recent activity
          </h2>
          <Link
            className="text-primary inline-flex min-h-10 items-center text-sm hover:underline"
            href="/activity"
          >
            View all activity
          </Link>
        </div>
        <ActivityList compact events={activity.slice(0, 6)} members={members} />
      </section>
    </div>
  );
}
