import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { ActivityList } from "@/components/activity/activity-list";
import { PageHeader } from "@/components/ui/page-header";
import type {
  ActivityEventRow,
  TaskMember,
  TaskRow,
} from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { getMarketingOverview } from "@/modules/marketing/server/data";

type MarketingOverview = Awaited<ReturnType<typeof getMarketingOverview>>;

interface HomeDashboardProps {
  activity: ActivityEventRow[];
  canMutate: boolean;
  currentUserId: string;
  marketing: MarketingOverview | null;
  members: TaskMember[];
  nowIso: string;
  organizationName: string;
  tasks: TaskRow[];
}

const activeStatuses = new Set(["TODO", "IN_PROGRESS"]);

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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
  const now = Date.parse(nowIso);
  const next48Hours = now + 48 * 60 * 60 * 1_000;
  const active = tasks.filter((task) => activeStatuses.has(task.status));
  const overdue = active.filter(
    (task) => task.due_at && Date.parse(task.due_at) < now,
  );
  const dueSoon = active.filter((task) => {
    if (!task.due_at) return false;
    const due = Date.parse(task.due_at);
    return due >= now && due <= next48Hours;
  });
  const mine = active.filter((task) => task.assignee_id === currentUserId);
  const priorities = [...overdue, ...dueSoon, ...mine]
    .filter(
      (task, index, all) => all.findIndex(({ id }) => id === task.id) === index,
    )
    .sort((left, right) => {
      const leftDue = left.due_at ? Date.parse(left.due_at) : Number.MAX_VALUE;
      const rightDue = right.due_at
        ? Date.parse(right.due_at)
        : Number.MAX_VALUE;
      return leftDue - rightDue;
    })
    .slice(0, 4);

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        description={`A clear view of what needs attention across ${organizationName}.`}
        eyebrow="Today"
        title="Home"
      />

      <section
        aria-labelledby="priorities-heading"
        className="border-pastel-cream-border bg-pastel-cream text-pastel-cream-foreground overflow-hidden rounded-xl border"
      >
        <div className="bg-pastel-cream-border grid gap-px border-b border-inherit sm:grid-cols-4">
          <Metric icon={CircleAlert} label="Overdue" value={overdue.length} />
          <Metric
            icon={CalendarClock}
            label="Due in 48 hours"
            value={dueSoon.length}
          />
          <Metric
            icon={CheckCircle2}
            label="Assigned to me"
            value={mine.length}
          />
          <Metric icon={Users} label="Active work" value={active.length} />
        </div>
        <div className="p-5 sm:p-6">
          <SectionHeading
            actionHref="/tasks?view=my"
            actionLabel="View tasks"
            description="Your nearest commitments, ordered by deadline."
            id="priorities-heading"
            title="What needs attention"
          />
          {priorities.length ? (
            <ul className="divide-pastel-cream-border mt-5 divide-y">
              {priorities.map((task) => (
                <li key={task.id}>
                  <Link
                    className="group flex min-h-14 items-center gap-3 py-3"
                    href={
                      `/tasks?view=all&task=${encodeURIComponent(task.id)}` as Route
                    }
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        task.due_at && Date.parse(task.due_at) < now
                          ? "bg-tone-coral"
                          : "bg-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-xs opacity-75">
                        {task.due_at
                          ? `Due ${formatDeadline(task.due_at)}`
                          : "No deadline"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-9 text-center">
              <CheckCircle2 className="mx-auto size-6 opacity-60" />
              <p className="mt-2 text-sm font-semibold">You are caught up.</p>
              <p className="mt-1 text-sm opacity-75">
                No overdue, near-due, or assigned work needs attention.
              </p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading">
        <SectionHeading
          description="Move straight into the team’s most common workflows."
          id="quick-actions-heading"
          title="Quick actions"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {canMutate ? (
            <QuickAction
              href="/tasks?create=true"
              icon={Plus}
              label="Create task"
              tone="lilac"
            />
          ) : (
            <QuickAction
              href="/tasks?view=my"
              icon={CheckCircle2}
              label="Review tasks"
              tone="lilac"
            />
          )}
          <QuickAction
            href="/whiteboards"
            icon={Sparkles}
            label="Open whiteboards"
            tone="mint"
          />
          {marketing ? (
            <>
              <QuickAction
                href="/apps/marketing/reel-ideas"
                icon={Lightbulb}
                label="Reel ideas"
                tone="coral"
              />
              <QuickAction
                href="/apps/marketing/council"
                icon={MessageCircleQuestion}
                label="Ask Council"
                tone="pink"
              />
            </>
          ) : (
            <QuickAction
              href="/activity"
              icon={Search}
              label="Review activity"
              tone="coral"
            />
          )}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section aria-labelledby="activity-heading">
          <SectionHeading
            actionHref="/activity"
            actionLabel="All activity"
            description="Recent meaningful changes across the workspace."
            id="activity-heading"
            title="Recent activity"
          />
          <ActivityList events={activity.slice(0, 6)} members={members} />
        </section>

        <section aria-labelledby="pulse-heading">
          <SectionHeading
            actionHref={marketing ? "/apps/marketing" : "/team"}
            actionLabel={marketing ? "Open Marketing" : "Open team"}
            description={
              marketing
                ? "Current creative momentum."
                : "Your active workspace."
            }
            id="pulse-heading"
            title={marketing ? "Marketing pulse" : "Team pulse"}
          />
          {marketing ? (
            <div className="border-pastel-lilac-border bg-pastel-lilac text-pastel-lilac-foreground mt-6 rounded-xl border p-5">
              <div className="grid grid-cols-2 gap-5">
                <PulseValue
                  label="Active campaigns"
                  value={marketing.activeCampaigns}
                />
                <PulseValue
                  label="Ready ideas"
                  value={marketing.ideaCounts.READY}
                />
                <PulseValue
                  label="Ideas in draft"
                  value={marketing.ideaCounts.DRAFT}
                />
                <PulseValue
                  label="Creative briefs"
                  value={marketing.briefCount}
                />
              </div>
              <Link
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                href="/apps/marketing/research"
              >
                <Search className="size-4" /> Start or review research
              </Link>
            </div>
          ) : (
            <div className="border-pastel-mint-border bg-pastel-mint text-pastel-mint-foreground mt-6 rounded-xl border p-5">
              <Users className="size-5" />
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {members.length}
              </p>
              <p className="mt-1 text-sm">organization members</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleAlert;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-pastel-cream flex items-center gap-3 px-4 py-4 sm:px-5">
      <Icon aria-hidden="true" className="size-4 opacity-70" />
      <span>
        <span className="block text-xl leading-none font-semibold">
          {value}
        </span>
        <span className="mt-1 block text-xs opacity-75">{label}</span>
      </span>
    </div>
  );
}

function SectionHeading({
  actionHref,
  actionLabel,
  description,
  id,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight" id={id}>
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-5">
          {description}
        </p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="text-primary hover:text-primary-hover shrink-0 text-sm font-semibold"
          href={actionHref as Route}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

const quickActionTones = {
  coral:
    "border-pastel-coral-border bg-pastel-coral text-pastel-coral-foreground",
  lilac:
    "border-pastel-lilac-border bg-pastel-lilac text-pastel-lilac-foreground",
  mint: "border-pastel-mint-border bg-pastel-mint text-pastel-mint-foreground",
  pink: "border-pastel-pink-border bg-pastel-pink text-pastel-pink-foreground",
};

function QuickAction({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  tone: keyof typeof quickActionTones;
}) {
  return (
    <Link
      className={cn(
        "group flex min-h-20 items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition-transform hover:-translate-y-0.5",
        quickActionTones[tone],
      )}
      href={href as Route}
    >
      <span className="bg-background/70 flex size-9 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function PulseValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-75">{label}</p>
    </div>
  );
}
