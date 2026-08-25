"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Archive, MessageSquare, Reply, Send, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  BoardCommentRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import {
  archiveBoardCommentAction,
  createBoardCommentAction,
} from "@/modules/whiteboards/actions";

export function WhiteboardCommentsPanel({
  boardId,
  canMutate,
  comments,
  currentUserId,
  members,
  onComment,
  selectedElementId,
}: {
  boardId: string;
  canMutate: boolean;
  comments: BoardCommentRow[];
  currentUserId: string;
  members: TaskMember[];
  onComment: (comment: BoardCommentRow) => void;
  selectedElementId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [elementOnly, setElementOnly] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.member_user_id, member])),
    [members],
  );
  const visible = comments.filter(
    (comment) =>
      (elementOnly && selectedElementId
        ? comment.element_id === selectedElementId
        : comment.element_id === null) && comment.parent_id === null,
  );

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <Button
          aria-label="Open board comments"
          className="h-9"
          variant="secondary"
        >
          <MessageSquare aria-hidden="true" className="size-4" />
          Comments
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/25" />
        <Dialog.Content className="bg-background fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l shadow-xl focus:outline-none">
          <header className="flex items-start justify-between gap-3 border-b p-4">
            <div>
              <Dialog.Title className="font-semibold">Comments</Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Discuss this board or the selected element.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Close comments" size="icon" variant="ghost">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </header>
          <div className="flex gap-1 border-b p-2" role="tablist">
            <Button
              aria-selected={!elementOnly}
              onClick={() => setElementOnly(false)}
              className="h-8"
              variant={!elementOnly ? "secondary" : "ghost"}
            >
              Board
            </Button>
            <Button
              aria-selected={elementOnly}
              disabled={!selectedElementId}
              onClick={() => setElementOnly(true)}
              className="h-8"
              variant={elementOnly ? "secondary" : "ghost"}
            >
              Selected element
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {visible.length ? (
              visible.map((comment) => (
                <CommentThread
                  comment={comment}
                  comments={comments}
                  currentUserId={currentUserId}
                  key={comment.id}
                  memberById={memberById}
                  onArchive={async (id) => {
                    const result = await archiveBoardCommentAction(id);
                    if (result.status === "success") onComment(result.data);
                  }}
                  onReply={() => setReplyTo(comment.id)}
                />
              ))
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No comments yet.
              </p>
            )}
          </div>
          {canMutate ? (
            <CommentComposer
              boardId={boardId}
              elementId={elementOnly ? selectedElementId : null}
              members={members}
              onComment={(comment) => {
                onComment(comment);
                setReplyTo(null);
              }}
              parentId={replyTo}
            />
          ) : (
            <p className="text-muted-foreground border-t p-4 text-sm">
              Viewers can read comments but cannot post.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommentThread({
  comment,
  comments,
  currentUserId,
  memberById,
  onArchive,
  onReply,
}: {
  comment: BoardCommentRow;
  comments: BoardCommentRow[];
  currentUserId: string;
  memberById: Map<string, TaskMember>;
  onArchive: (id: string) => Promise<void>;
  onReply: () => void;
}) {
  const replies = comments.filter(
    (candidate) => candidate.parent_id === comment.id,
  );
  const author =
    memberById.get(comment.author_id)?.display_name ?? "Former member";
  return (
    <article className="space-y-2">
      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">{author}</span>
          <time className="text-muted-foreground" dateTime={comment.created_at}>
            {new Date(comment.created_at).toLocaleString()}
          </time>
        </div>
        <p className="mt-2 text-sm whitespace-pre-wrap">
          {comment.archived_at ? (
            <span className="text-muted-foreground italic">
              Comment removed
            </span>
          ) : (
            comment.body
          )}
        </p>
        {!comment.archived_at ? (
          <div className="mt-2 flex gap-1">
            <Button className="h-8" onClick={onReply} variant="ghost">
              <Reply aria-hidden="true" className="size-3.5" /> Reply
            </Button>
            {comment.author_id === currentUserId ? (
              <Button
                className="h-8"
                onClick={() => void onArchive(comment.id)}
                variant="ghost"
              >
                <Archive aria-hidden="true" className="size-3.5" /> Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {replies.map((reply) => (
        <div className="ml-6 rounded-md border-l-2 p-3 text-sm" key={reply.id}>
          <span className="text-xs font-medium">
            {memberById.get(reply.author_id)?.display_name ?? "Former member"}
          </span>
          <p className="mt-1 whitespace-pre-wrap">
            {reply.archived_at ? "Comment removed" : reply.body}
          </p>
          {!reply.archived_at && reply.author_id === currentUserId ? (
            <Button
              className="mt-1 h-8"
              onClick={() => void onArchive(reply.id)}
              variant="ghost"
            >
              <Archive aria-hidden="true" className="size-3.5" /> Remove
            </Button>
          ) : null}
        </div>
      ))}
    </article>
  );
}

function CommentComposer({
  boardId,
  elementId,
  members,
  onComment,
  parentId,
}: {
  boardId: string;
  elementId: string | null;
  members: TaskMember[];
  onComment: (comment: BoardCommentRow) => void;
  parentId: string | null;
}) {
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const match = body.match(/(?:^|\s)@([^@\n]*)$/);
  const query = match?.[1]?.toLocaleLowerCase() ?? null;
  const suggestions =
    query === null
      ? []
      : members
          .filter((member) =>
            member.display_name.toLocaleLowerCase().includes(query),
          )
          .slice(0, 6);

  function selectMention(member: TaskMember) {
    if (!match) return;
    setBody(
      `${body.slice(0, match.index!)}${match[0].startsWith(" ") ? " " : ""}@${member.display_name} `,
    );
    setMentioned((current) => [
      ...new Set([...current, member.member_user_id]),
    ]);
  }

  return (
    <form
      className="relative border-t p-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await createBoardCommentAction({
            boardId,
            body,
            elementId,
            mentionedUserIds: mentioned,
            parentId,
          });
          if (result.status === "error") return setError(result.message);
          setBody("");
          setMentioned([]);
          onComment(result.data);
        });
      }}
    >
      {parentId ? (
        <p className="text-muted-foreground mb-2 text-xs">
          Replying to a thread
        </p>
      ) : null}
      {suggestions.length ? (
        <div className="bg-background absolute right-4 bottom-full left-4 rounded-md border p-1 shadow-lg">
          {suggestions.map((member) => (
            <button
              className="hover:bg-muted flex w-full justify-between rounded px-2 py-1.5 text-left text-sm"
              key={member.member_user_id}
              onClick={() => selectMention(member)}
              type="button"
            >
              <span>{member.display_name}</span>
              <span className="text-muted-foreground text-xs">
                {member.role.toLowerCase()}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <Textarea
        aria-label="Comment"
        disabled={pending}
        maxLength={2000}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setBody(next);
          setMentioned((current) =>
            current.filter((id) => {
              const member = members.find(
                (candidate) => candidate.member_user_id === id,
              );
              return member ? next.includes(`@${member.display_name}`) : false;
            }),
          );
          setSuggestionIndex(0);
        }}
        onKeyDown={(event) => {
          if (!suggestions.length) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setSuggestionIndex(
              (current) =>
                (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  suggestions.length) %
                suggestions.length,
            );
          } else if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            const member = suggestions[suggestionIndex];
            if (member) selectMention(member);
          } else if (event.key === "Escape") {
            setBody((current) => `${current} `);
          }
        }}
        placeholder="Add a comment. Type @ to mention someone."
        value={body}
      />
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex justify-end">
        <Button
          className="h-9"
          disabled={pending || !body.trim()}
          type="submit"
        >
          <Send aria-hidden="true" className="size-4" />{" "}
          {pending ? "Posting" : "Post"}
        </Button>
      </div>
    </form>
  );
}
