"use client";

import { Archive, BookOpen, FilePenLine, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeMemoryRow } from "@/lib/supabase/database.types";
import {
  createCompanyMemoryAction,
  setCompanyMemoryArchivedAction,
  updateCompanyMemoryAction,
} from "@/modules/memory/actions";
import type { CompanyKnowledge } from "@/modules/memory/company-knowledge";
import {
  initialMemoryActionState,
  memoryKinds,
  memoryProvenanceValues,
  type MemoryFilters,
} from "@/modules/memory/schemas";

function formatMemoryDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLocaleLowerCase("en-US");
}

function MemoryForm({
  memory,
  onSaved,
}: {
  memory?: KnowledgeMemoryRow;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    memory ? updateCompanyMemoryAction : createCompanyMemoryAction,
    initialMemoryActionState,
  );
  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [onSaved, state.status]);
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  return (
    <form action={action} className="space-y-4 p-5">
      {memory ? (
        <input name="memoryId" type="hidden" value={memory.id} />
      ) : null}
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <Input
          defaultValue={memory?.title}
          maxLength={160}
          name="title"
          required
        />
        {fieldError("title") ? (
          <span className="text-destructive text-xs">
            {fieldError("title")}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Type</span>
        <select
          className="bg-background h-10 rounded-md border px-3"
          defaultValue={memory?.kind ?? "FACT"}
          name="kind"
        >
          {memoryKinds.map((kind) => (
            <option key={kind} value={kind}>
              {label(kind)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Knowledge</span>
        <Textarea
          defaultValue={memory?.content}
          maxLength={10_000}
          name="content"
          required
        />
        {fieldError("content") ? (
          <span className="text-destructive text-xs">
            {fieldError("content")}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Source reference</span>
        <Input
          defaultValue={memory?.source_reference ?? ""}
          maxLength={500}
          name="sourceReference"
          placeholder="Optional document, decision or internal reference"
        />
      </label>
      {state.message ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button onClick={onSaved} type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? "Saving…" : memory ? "Save changes" : "Add memory"}
        </Button>
      </div>
    </form>
  );
}

function LifecycleButton({ memory }: { memory: KnowledgeMemoryRow }) {
  const [, action, pending] = useActionState(
    setCompanyMemoryArchivedAction,
    initialMemoryActionState,
  );
  const archived = memory.archived_at !== null;
  const Icon = archived ? RotateCcw : Archive;
  return (
    <form action={action}>
      <input name="memoryId" type="hidden" value={memory.id} />
      <input name="archived" type="hidden" value={String(!archived)} />
      <Button disabled={pending} type="submit" variant="ghost">
        <Icon aria-hidden="true" className="size-4" />
        {pending ? "Saving…" : archived ? "Restore" : "Archive"}
      </Button>
    </form>
  );
}

export function MemoryWorkspace({
  canMutate,
  companyKnowledge,
  filters,
  memories,
}: {
  canMutate: boolean;
  companyKnowledge: CompanyKnowledge;
  filters: MemoryFilters;
  memories: KnowledgeMemoryRow[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<KnowledgeMemoryRow | null>(null);
  const companyName = companyKnowledge.sections.identity?.companyName;
  return (
    <>
      <PageHeader
        action={
          canMutate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" /> Add memory
            </Button>
          ) : undefined
        }
        description="Maintain explicit, durable company context with provenance. Profile data remains authoritative and is never duplicated here."
        title="Company memory"
      />

      <section
        className="grid gap-4 border-b py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        aria-labelledby="company-knowledge-heading"
      >
        <div className="flex items-start gap-3">
          <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
            <BookOpen aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold" id="company-knowledge-heading">
              Canonical Company Knowledge
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {companyName ? `${companyName}'s` : "Your organization's"}{" "}
              structured profile is composed live from Company Profile.
              {companyKnowledge.incompleteSections.length
                ? ` ${companyKnowledge.incompleteSections.length} section(s) are not yet available.`
                : " All structured sections are available."}
            </p>
          </div>
        </div>
        <Link
          className="bg-card hover:bg-muted inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium"
          href="/company/profile"
        >
          Review profile
        </Link>
      </section>

      <form
        action="/memory"
        className="grid gap-3 border-b py-4 sm:grid-cols-[minmax(12rem,1fr)_11rem_11rem_auto]"
      >
        <SearchInput
          defaultValue={filters.search}
          name="search"
          placeholder="Search company memory"
        />
        <select
          className="bg-background h-9 rounded-md border px-3 text-sm"
          defaultValue={filters.kind ?? ""}
          name="kind"
        >
          <option value="">All types</option>
          {memoryKinds.map((kind) => (
            <option key={kind} value={kind}>
              {label(kind)}
            </option>
          ))}
        </select>
        <select
          className="bg-background h-9 rounded-md border px-3 text-sm"
          defaultValue={filters.provenance ?? ""}
          name="provenance"
        >
          <option value="">All sources</option>
          {memoryProvenanceValues.map((source) => (
            <option key={source} value={source}>
              {label(source)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            name="archived"
            type="hidden"
            value={String(filters.archived)}
          />
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Link
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium"
            href={
              (filters.archived ? "/memory" : "/memory?archived=true") as Route
            }
          >
            {filters.archived ? "Active" : "Archived"}
          </Link>
        </div>
      </form>

      {memories.length ? (
        <div className="divide-y border-b">
          {memories.map((memory) => (
            <article
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              key={memory.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{memory.title}</h3>
                  <span className="text-muted-foreground text-xs">
                    {label(memory.kind)} · Company · {label(memory.provenance)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                  {memory.content}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Updated {formatMemoryDate(memory.updated_at)}
                  {memory.source_reference
                    ? ` · Source: ${memory.source_reference}`
                    : ""}
                </p>
              </div>
              {canMutate && memory.provenance === "HUMAN" ? (
                <div className="flex items-center gap-1">
                  {!memory.archived_at ? (
                    <Button onClick={() => setEditing(memory)} variant="ghost">
                      <FilePenLine aria-hidden="true" className="size-4" /> Edit
                    </Button>
                  ) : null}
                  <LifecycleButton memory={memory} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="border-b px-4 py-14 text-center">
          <BookOpen
            aria-hidden="true"
            className="text-muted-foreground mx-auto size-5"
          />
          <p className="mt-2 text-sm font-medium">
            {filters.archived
              ? "No archived company memory"
              : "No company memory matches this view"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {canMutate && !filters.archived
              ? "Add only durable, approved knowledge—not working notes or AI drafts."
              : "Adjust the filters to review available knowledge."}
          </p>
        </div>
      )}

      <Dialog
        description="Record approved durable context with a clear human source."
        onOpenChange={setCreating}
        open={creating}
        title="Add company memory"
      >
        <MemoryForm onSaved={() => setCreating(false)} />
      </Dialog>
      <Dialog
        description="Update this memory while preserving its creator and lifecycle history."
        onOpenChange={(open) => !open && setEditing(null)}
        open={Boolean(editing)}
        title="Edit company memory"
      >
        {editing ? (
          <MemoryForm memory={editing} onSaved={() => setEditing(null)} />
        ) : null}
      </Dialog>
    </>
  );
}
