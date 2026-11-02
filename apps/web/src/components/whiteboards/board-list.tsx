"use client";
import { Archive, Pencil, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ViewerLocalDateTime } from "@/components/ui/viewer-local-date-time";
import type { BoardRow, TaskMember } from "@/lib/supabase/database.types";
import {
  archiveBoardAction,
  createBoardAction,
  renameBoardAction,
} from "@/modules/whiteboards/actions";
import { boardTemplate } from "@/modules/whiteboards/templates";
import { BoardTemplateChooser } from "./board-template-chooser";

export function BoardList({
  boards,
  canMutate,
  currentUserId,
  members = [],
}: {
  boards: BoardRow[];
  canMutate: boolean;
  currentUserId: string;
  members?: TaskMember[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false),
    [editing, setEditing] = useState<BoardRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const person = (id: string) =>
    members.find((row) => row.member_user_id === id)?.display_name ??
    (id === currentUserId ? "You" : "Former member");
  function create(data: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBoardAction(
        String(data.get("title") ?? ""),
        String(data.get("template") ?? "blank"),
      );
      if (result.status === "error") return setError(result.message);
      setCreateOpen(false);
      router.push(`/whiteboards/${result.data.id}` as Route);
    });
  }
  function rename(data: FormData) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await renameBoardAction(
        editing.id,
        String(data.get("title") ?? ""),
      );
      if (result.status === "error") return setError(result.message);
      setEditing(null);
      router.refresh();
    });
  }
  function archive(board: BoardRow) {
    if (
      !window.confirm(
        `Archive "${board.title}"? Its objects and discussion remain in history.`,
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            A visual workspace to turn research, inspiration and ideas into
            decisions and executable work.
          </p>
        </div>
        {canMutate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            New board
          </Button>
        ) : null}
      </header>
      {error && !createOpen && !editing ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!boards.length ? (
        <div className="border-y py-8">
          <h2 className="text-sm font-medium">
            Make room for your team&apos;s ideas
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {canMutate
              ? "Start blank or choose a focused template for visual work."
              : "Boards shared by your team will appear here. You have read-only access."}
          </p>
          {canMutate ? (
            <Button
              className="mt-4"
              onClick={() => setCreateOpen(true)}
              variant="secondary"
            >
              Create your first board
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y border-y" aria-label="Boards">
          {boards.map((board) => (
            <li className="flex items-start gap-3 py-4" key={board.id}>
              <div className="min-w-0 flex-1">
                <Link
                  className="text-sm font-medium break-words hover:underline"
                  href={`/whiteboards/${board.id}` as Route}
                >
                  {board.title}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {boardTemplate(board.template_key)?.name ?? "Board"} · Owner:{" "}
                  {person(board.created_by)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Updated <ViewerLocalDateTime value={board.updated_at} /> ·{" "}
                  {person(board.updated_by)}
                </p>
              </div>
              {canMutate ? (
                <div className="flex shrink-0">
                  <Button
                    aria-label={`Rename ${board.title}`}
                    disabled={pending}
                    onClick={() => setEditing(board)}
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
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
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog
        className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
        description="Choose a name and a native starting layout. Templates create only board objects."
        onOpenChange={(open) => {
          if (!pending) {
            setCreateOpen(open);
            setError(null);
          }
        }}
        open={createOpen}
        title="Create board"
      >
        <form action={create} className="space-y-5 p-6">
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
          <BoardTemplateChooser />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              disabled={pending}
              onClick={() => setCreateOpen(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Creating…" : "Create board"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
        description="Use a short name your team will recognize."
        onOpenChange={(open) => {
          if (!open && !pending) {
            setEditing(null);
            setError(null);
          }
        }}
        open={Boolean(editing)}
        title="Rename board"
      >
        <form action={rename} className="space-y-4 p-6">
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
            <Button
              disabled={pending}
              onClick={() => setEditing(null)}
              variant="ghost"
            >
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
