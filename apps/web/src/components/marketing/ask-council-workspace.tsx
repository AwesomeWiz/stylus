"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Archive,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  MessageSquarePlus,
  Send,
  Sparkles,
} from "lucide-react";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  specialistAccent,
  SpecialistIdentity,
  specialistVisuals,
} from "@/components/marketing/specialist-visuals";
import { Textarea } from "@/components/ui/textarea";
import type {
  MarketingAskCouncilContextRefRow,
  MarketingAskCouncilConversationRow,
  MarketingAskCouncilMessageRow,
  MarketingAskCouncilSpecialistResultRow,
  MarketingAskCouncilTurnRow,
  MarketingExternalResearchReportRow,
  MarketingPerformanceLearningRow,
  MarketingReelBriefVersionRow,
  MarketingStrategicCouncilReviewVersionRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import {
  askCouncilAction,
  setAskCouncilConversationArchivedAction,
} from "@/modules/marketing/ask-council-actions";
import {
  askCouncilIntents,
  initialAskCouncilActionState,
} from "@/modules/marketing/ask-council";
import { canMutateMarketing } from "@/modules/marketing/authorization";

type ReportOption = MarketingExternalResearchReportRow & { question: string };

export function AskCouncilWorkspace({
  briefs,
  contextReferences,
  conversations,
  idempotencyKey,
  messages,
  performance,
  reports,
  reviews,
  role,
  selectedConversation,
  specialistResults,
  turns,
}: {
  briefs: MarketingReelBriefVersionRow[];
  contextReferences: MarketingAskCouncilContextRefRow[];
  conversations: MarketingAskCouncilConversationRow[];
  idempotencyKey: string;
  messages: MarketingAskCouncilMessageRow[];
  performance: MarketingPerformanceLearningRow[];
  reports: ReportOption[];
  reviews: MarketingStrategicCouncilReviewVersionRow[];
  role: OrganizationRole;
  selectedConversation: MarketingAskCouncilConversationRow | null;
  specialistResults: MarketingAskCouncilSpecialistResultRow[];
  turns: MarketingAskCouncilTurnRow[];
}) {
  const writable = canMutateMarketing(role);
  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-md border lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="bg-muted/25 border-b p-3 lg:border-r lg:border-b-0">
        <Link
          className="bg-background hover:bg-muted inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium"
          href={"/apps/marketing/council" as Route}
        >
          <MessageSquarePlus className="size-4" />
          New conversation
        </Link>
        <p className="text-muted-foreground mt-5 px-2 text-xs font-medium tracking-wide uppercase">
          Conversations
        </p>
        <div className="mt-2 space-y-1">
          {conversations.length ? (
            conversations.map((conversation) => (
              <Link
                className={`block rounded-md px-2.5 py-2 text-sm ${selectedConversation?.id === conversation.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                href={
                  `/apps/marketing/council?conversation=${conversation.id}` as Route
                }
                key={conversation.id}
              >
                <span className="line-clamp-2">{conversation.title}</span>
                <span className="mt-1 block text-xs font-normal">
                  {formatDate(conversation.updated_at)}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground px-2 py-4 text-sm">
              No Council conversations yet.
            </p>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {selectedConversation?.title ?? "New Ask Council conversation"}
            </p>
            <p className="text-muted-foreground text-xs">
              Advisory answers only. Create Reel remains a separate workflow.
            </p>
          </div>
          {selectedConversation && writable ? (
            <form action={setAskCouncilConversationArchivedAction}>
              <input
                name="conversationId"
                type="hidden"
                value={selectedConversation.id}
              />
              <Button
                aria-label="Archive conversation"
                size="icon"
                type="submit"
                variant="ghost"
              >
                <Archive className="size-4" />
              </Button>
            </form>
          ) : null}
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {!messages.length ? (
            <div className="mx-auto max-w-xl py-14 text-center">
              <BrainCircuit className="text-muted-foreground mx-auto size-8" />
              <h2 className="mt-4 font-semibold">
                Ask a focused marketing question
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Stylus selects a small specialist set and uses bounded company,
                research, performance, or explicitly attached creative context.
              </p>
            </div>
          ) : null}
          {messages.map((message) => {
            const turn = turns.find(
              (candidate) =>
                candidate.user_message_id === message.id ||
                candidate.assistant_message_id === message.id,
            );
            return (
              <Message
                contextReferences={contextReferences.filter(
                  (reference) => reference.turn_id === turn?.id,
                )}
                key={message.id}
                message={message}
                specialistResults={specialistResults.filter(
                  (result) => result.turn_id === turn?.id,
                )}
                turn={turn ?? null}
              />
            );
          })}
          {turns
            .filter((turn) => turn.status === "FAILED")
            .filter(
              (turn) =>
                !messages.some(
                  (message) => message.id === turn.assistant_message_id,
                ),
            )
            .map((turn) => (
              <div
                className="border-destructive/30 bg-destructive/5 ml-auto max-w-2xl rounded-md border p-4 text-sm"
                key={turn.id}
                role="alert"
              >
                <p className="font-medium">Council response failed safely</p>
                <p className="text-muted-foreground mt-1">
                  Category: {safeLabel(turn.failure_category ?? "unknown")}. No
                  successful assistant answer was created.
                </p>
              </div>
            ))}
        </div>

        <Composer
          briefs={briefs}
          conversationId={selectedConversation?.id ?? null}
          idempotencyKey={idempotencyKey}
          performance={performance}
          reports={reports}
          reviews={reviews}
          writable={writable}
        />
      </section>
    </div>
  );
}

function Composer({
  briefs,
  conversationId,
  idempotencyKey,
  performance,
  reports,
  reviews,
  writable,
}: {
  briefs: MarketingReelBriefVersionRow[];
  conversationId: string | null;
  idempotencyKey: string;
  performance: MarketingPerformanceLearningRow[];
  reports: ReportOption[];
  reviews: MarketingStrategicCouncilReviewVersionRow[];
  writable: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    askCouncilAction,
    initialAskCouncilActionState,
  );
  useEffect(() => {
    if (state.status === "success" && state.conversationId)
      router.replace(
        `/apps/marketing/council?conversation=${state.conversationId}` as Route,
      );
  }, [router, state.conversationId, state.status]);

  if (!writable)
    return (
      <div className="bg-muted/20 border-t p-4 text-sm">
        <p className="font-medium">Read-only access</p>
        <p className="text-muted-foreground mt-1">
          Viewers can read Council history but cannot execute AI.
        </p>
      </div>
    );
  return (
    <form action={action} className="space-y-3 border-t p-4">
      <input name="conversationId" type="hidden" value={conversationId ?? ""} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <label>
          <span className="sr-only">Council intent</span>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            defaultValue="AUTO"
            name="intent"
          >
            <option value="AUTO">Choose intent automatically</option>
            {askCouncilIntents.map((intent) => (
              <option key={intent} value={intent}>
                {safeLabel(intent)}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          aria-label="Marketing question"
          maxLength={2000}
          name="question"
          placeholder="Ask a focused marketing question…"
          required
          rows={3}
        />
      </div>
      <details className="rounded-md border">
        <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
          <BookOpen className="size-4" />
          Context
          <span className="ml-auto text-xs">Optional attachments</span>
          <ChevronDown className="size-4" />
        </summary>
        <div className="grid gap-3 border-t p-3 md:grid-cols-2">
          <ContextSelect
            label="Research Report"
            name="researchReportId"
            options={reports.map((report) => ({
              id: report.id,
              label: report.question,
            }))}
          />
          <ContextSelect
            label="Reel Brief version"
            name="reelBriefVersionId"
            options={briefs.map((brief) => ({
              id: brief.id,
              label: `${brief.title} · v${brief.version_number}`,
            }))}
          />
          <ContextSelect
            label="Strategic Review"
            name="strategicReviewId"
            options={reviews.map((review) => ({
              id: review.id,
              label: `Review v${review.version_number}`,
            }))}
          />
          <fieldset>
            <legend className="text-xs font-medium">
              Performance Learnings
            </legend>
            <div className="mt-1 max-h-28 space-y-1 overflow-y-auto rounded-md border p-2">
              {performance.length ? (
                performance.map((learning) => (
                  <label
                    className="flex items-start gap-2 text-xs"
                    key={learning.id}
                  >
                    <input
                      className="mt-0.5"
                      name="performanceLearningId"
                      type="checkbox"
                      value={learning.id}
                    />
                    <span>
                      {safeLabel(learning.subject_value)} ·{" "}
                      {learning.evidence_strength}
                    </span>
                  </label>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">
                  No persisted learnings available.
                </span>
              )}
            </div>
          </fieldset>
        </div>
      </details>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Automatic context selection is bounded and shown with the answer.
        </p>
        <Button disabled={pending} type="submit">
          {pending ? (
            <Sparkles className="size-4 animate-pulse" />
          ) : (
            <Send className="size-4" />
          )}
          {pending ? "Consulting Council…" : "Ask Council"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function ContextSelect({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <select
        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        defaultValue=""
        name={name}
      >
        <option value="">Automatic / none</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Message({
  contextReferences,
  message,
  specialistResults,
  turn,
}: {
  contextReferences: MarketingAskCouncilContextRefRow[];
  message: MarketingAskCouncilMessageRow;
  specialistResults: MarketingAskCouncilSpecialistResultRow[];
  turn: MarketingAskCouncilTurnRow | null;
}) {
  const assistant = message.role === "ASSISTANT";
  const output = object(message.structured_output);
  return (
    <article
      className={`max-w-3xl ${assistant ? "mr-auto" : "bg-muted/60 ml-auto rounded-md px-4 py-3"}`}
    >
      <p className="text-muted-foreground text-xs font-medium">
        {assistant ? "Ask Council" : "You"}
      </p>
      <p className="mt-1 text-[15px] leading-7 whitespace-pre-wrap">
        {message.content}
      </p>
      {assistant && output ? (
        <div className="mt-4 space-y-3 border-t pt-3">
          <StringList
            label="Recommendations"
            value={output.keyRecommendations}
          />
          <StringList label="Uncertainties" value={output.uncertainties} />
          <StringList label="Disagreements" value={output.disagreements} />
          <StringList
            label="Suggested next actions"
            value={output.suggestedNextSteps}
          />
          <div>
            <p className="text-xs font-medium">Council consulted</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {turn?.selected_specialists.map((id) => (
                <SpecialistIdentity
                  className="bg-muted rounded px-2 py-1 text-xs"
                  id={id}
                  key={id}
                  label={specialistVisuals[id]?.label ?? safeLabel(id)}
                />
              ))}
            </div>
          </div>
          {contextReferences.length ? (
            <div>
              <p className="text-xs font-medium">Context used</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {contextReferences.map((reference) => (
                  <span
                    className="border-border rounded border px-2 py-1 text-xs"
                    key={reference.id}
                    title={reference.model_reference_id}
                  >
                    {safeLabel(reference.reference_type)} · {reference.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {specialistResults.length ? (
            <details>
              <summary className="text-muted-foreground cursor-pointer text-xs font-medium">
                Specialist perspectives
              </summary>
              <div className="mt-2 space-y-2">
                {specialistResults.map((result) => {
                  const perspective = object(result.structured_output);
                  return (
                    <div
                      className={`border-l-2 pl-3 text-sm ${specialistAccent(result.specialist_id).border}`}
                      key={result.id}
                    >
                      <SpecialistIdentity
                        className="font-medium"
                        id={result.specialist_id}
                        label={
                          specialistVisuals[result.specialist_id]?.label ??
                          safeLabel(result.specialist_id)
                        }
                      />
                      <p className="text-muted-foreground mt-2 leading-6">
                        {typeof perspective?.recommendation === "string"
                          ? perspective.recommendation
                          : "Perspective recorded."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StringList({ label, value }: { label: string; value: unknown }) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function object(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function safeLabel(value: string) {
  return value
    .replace(/^marketing\./, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLocaleLowerCase("en-US")
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase("en-US"));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}
