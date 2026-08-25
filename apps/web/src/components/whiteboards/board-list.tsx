"use client";

import {
  Archive,
  ArrowUpRight,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import type { BoardRow } from "@/lib/supabase/database.types";
import {
  archiveBoardAction,
  createBoardAction,
  renameBoardAction,
} from "@/modules/whiteboards/actions";

interface BoardListProps {
  boards: BoardRow[];
  canMutate: boolean;
  currentUserId: string;
}

function updatedLabel(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function BoardList({
  boards,
  canMutate,
  currentUserId,
}: BoardListProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BoardRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBoardAction(
        String(formData.get("title") ?? ""),
      );
      if (result.status === "error") return setError(result.message);
      setCreateOpen(false);
      router.push(`/whiteboards/${result.data.id}` as Route);
    });
  }

  function rename(formData: FormData) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await renameBoardAction(
        editing.id,
        String(formData.get("title") ?? ""),
      );
      if (result.status === "error") return setError(result.message);
      setEditing(null);
      router.refresh();
    });
  }

  function archive(board: BoardRow) {
    if (
      !window.confirm(
        `Archive "${board.title}"? You can retain its history without deleting it.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await archiveBoardAction(board.id);
      if (result.status === "error") return setError(result.message);
      router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          canMutate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" className="size-4" /> Create board
            </Button>
          ) : undefined
        }
        description="Capture visual ideas, brand references, and plans on a persistent canvas."
        title="Whiteboards"
      />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {boards.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center border border-dashed px-6 text-center">
          <LayoutDashboard
            aria-hidden="true"
            className="text-muted-foreground mb-4 size-8"
          />
          <h2 className="font-semibold">Start a visual workspace</h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
            Create a board for a moodboard, brainstorm, product flow, or
            campaign concept.
          </p>
          {canMutate ? (
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              Create your first board
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <article
              className="group bg-card overflow-hidden rounded-lg border"
              key={board.id}
            >
              <Link
                aria-label={`Open ${board.title}`}
                className="bg-muted/40 hover:bg-muted/60 flex aspect-[16/8] items-center justify-center border-b transition-colors"
                href={`/whiteboards/${board.id}` as Route}
              >
                <div className="text-muted-foreground/70 grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] bg-[size:18px_18px]">
                  <LayoutDashboard aria-hidden="true" className="size-8" />
                </div>
              </Link>
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    className="font-medium hover:underline"
                    href={`/whiteboards/${board.id}` as Route}
                  >
                    {board.title}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {board.created_by === currentUserId
                      ? "Created by you"
                      : "Created by a team member"}{" "}
                    - Updated {updatedLabel(board.updated_at)}
                  </p>
                </div>
                {canMutate ? (
                  <div className="flex shrink-0">
                    <Button
                      aria-label={`Rename ${board.title}`}
                      onClick={() => setEditing(board)}
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      aria-label={`Archive ${board.title}`}
                      disabled={pending}
                      onClick={() => archive(board)}
                      size="icon"
                      variant="ghost"
                    >
                      <Archive aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        description="Give this visual workspace a clear name."
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setError(null);
        }}
        open={createOpen}
        title="Create whiteboard"
      >
        <form action={create} className="space-y-4 p-5">
          <label className="block text-sm font-medium">
            Board name
            <Input
              autoFocus
              className="mt-1.5"
              maxLength={120}
              name="title"
              placeholder="Brand direction"
              required
            />
          </label>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setCreateOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Creating…" : "Create board"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        description="Use a short name your team will recognize."
        onOpenChange={(open) => {
          if (!open) setEditing(null);
          setError(null);
        }}
        open={Boolean(editing)}
        title="Rename whiteboard"
      >
        <form action={rename} className="space-y-4 p-5">
          <label className="block text-sm font-medium">
            Board name
            <Input
              autoFocus
              className="mt-1.5"
              defaultValue={editing?.title}
              key={editing?.id}
              maxLength={120}
              name="title"
              required
            />
          </label>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setEditing(null)} variant="ghost">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
