import Link from "next/link";
import type { Route } from "next";
import { Plus, ArrowRight } from "lucide-react";
import { attentionGroups, type AttentionItem } from "@/core/attention/public";
import { ActivityList } from "@/components/activity/activity-list";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import { buttonVariants } from "@/components/ui/button";
import { taskMemberName } from "@/components/tasks/presentation";
import type {
  TaskMember,
  ActivityEventRow,
} from "@/lib/supabase/database.types";
function AttentionRows({
  items,
  members,
}: {
  items: AttentionItem[];
  members: TaskMember[];
}) {
  return (
    <ul className="divide-y border-y">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            prefetch={false}
            href={item.href as Route}
            className="hover:bg-muted block min-h-11 py-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-medium break-words">
                {item.title}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.reason}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="capitalize">{item.kind}</span>
              {item.ownerId ? (
                <span>{taskMemberName(members, item.ownerId)}</span>
              ) : null}
              {item.timestamp ? (
                <span>
                  {item.timestamp.length === 10 ? (
                    <>
                      Target{" "}
                      <time dateTime={item.timestamp}>{item.timestamp}</time>
                    </>
                  ) : (
                    <ViewerLocalDateTime value={item.timestamp} />
                  )}
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function HomeDashboard({
  attention,
  activity,
  canMutate,
  members,
  displayName,
  organizationName,
}: {
  attention: AttentionItem[];
  activity: ActivityEventRow[];
  canMutate: boolean;
  members: TaskMember[];
  displayName: string;
  organizationName: string;
}) {
  const groups = attentionGroups(attention);
  return (
    <div className="max-w-[1200px] space-y-8 [overflow-wrap:anywhere]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, {displayName}. Here’s what needs attention at{" "}
            {organizationName}.
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
              <Plus aria-hidden className="size-4" />
              Create task
            </>
          ) : (
            "Review tasks"
          )}
        </Link>
      </header>
      <section aria-labelledby="daily-attention-heading">
        <h2 id="daily-attention-heading" className="font-semibold">
          Needs your attention
        </h2>
        <p className="text-muted-foreground mt-1 mb-4 text-xs">
          Blocked and overdue work first, then evaluations and approaching
          commitments. Only explicit assignments and recorded dates are used.
        </p>
        {groups.personal.length || groups.team.length ? (
          <div className="space-y-6">
            {groups.personal.length ? (
              <section aria-label="For me">
                <h3 className="mb-2 text-sm font-medium">For me</h3>
                <AttentionRows items={groups.personal} members={members} />
              </section>
            ) : null}
            {groups.team.length ? (
              <section aria-label="For the team">
                <h3 className="mb-2 text-sm font-medium">For the team</h3>
                <AttentionRows items={groups.team} members={members} />
              </section>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground border-y py-5 text-sm">
            Nothing needs your attention right now.
          </p>
        )}
        <nav
          aria-label="Daily work"
          className="mt-3 flex flex-wrap gap-x-5 gap-y-1"
        >
          <Link
            className="inline-flex min-h-11 items-center gap-1 text-sm underline"
            href="/tasks?view=my"
          >
            Your tasks
            <ArrowRight aria-hidden className="size-3" />
          </Link>
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href="/tasks?milestones=1"
          >
            Milestones
          </Link>
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href="/notes"
          >
            Working Notes
          </Link>
        </nav>
      </section>
      {groups.learning.length ? (
        <section aria-labelledby="recent-learning-heading">
          <h2 id="recent-learning-heading" className="mb-3 font-semibold">
            Recent learning
          </h2>
          <AttentionRows items={groups.learning} members={members} />
        </section>
      ) : null}
      <section aria-labelledby="recent-activity-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent-activity-heading" className="font-semibold">
            Recent activity
          </h2>
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href="/activity"
          >
            View all activity
          </Link>
        </div>
        <ActivityList compact events={activity} members={members} />
      </section>
    </div>
  );
}
