"use client";
import { MessageSquare } from "lucide-react";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  BoardCommentRow,
  BoardElementRow,
  BoardRow,
  TaskMember,
} from "@/lib/supabase/database.types";
import { renameBoardAction } from "@/modules/whiteboards/actions";
import { reconcileBoardComment } from "@/modules/whiteboards/collaboration";
import {
  alignObjects,
  archiveObjects,
  assignSection,
  createLocalObject,
  distributeObjects,
  duplicateObjects,
  groupObjects,
  isObjectLocked,
  layerObjects,
  matchObjectSize,
  moveObjects,
  selectionRoots,
  ungroupObjects,
} from "@/modules/whiteboards/operations";
import {
  readBoardCommentsAction,
  readBoardSnapshotAction,
} from "@/modules/whiteboards/read-actions";

import { BoardInspector, type SelectionAction } from "./board-inspector";
import {
  BoardNavigation,
  focusBoardCanvas,
  type BoardNavigationState,
} from "./board-navigation";
import { BoardOutline } from "./board-outline";
import { BoardPanel } from "./board-panel";
import { useBoardCollaboration } from "./use-board-collaboration";
import { useBoardDocument } from "./use-board-document";
import { useBoardImages } from "./use-board-images";
import { useBoardUploads } from "./use-board-uploads";
import { WhiteboardHeader } from "./whiteboard-chrome";
import { WhiteboardCollaborators } from "./whiteboard-collaborators";
import { WhiteboardCommentsPanel } from "./whiteboard-comments-panel";
import { BoardHelp, BoardLinkDialog, BoardMenu } from "./board-controls";
import type { WhiteboardTool } from "./whiteboard-toolbar";
import { BoardCanvas, type BoardCanvasHandle } from "./board-canvas";

const anonymous = { displayName: "Current user", id: "" };
const emptyMembers: TaskMember[] = [];
type Panel = "INSPECTOR" | "OUTLINE" | "COMMENTS" | null;
type Point = { x: number; y: number };

export function WhiteboardWorkspace({
  board,
  canMutate,
  comments: initialComments = [],
  currentUser = anonymous,
  elements,
  imageUrls,
  members = emptyMembers,
  shell,
}: {
  board: BoardRow;
  canMutate: boolean;
  comments?: BoardCommentRow[];
  currentUser?: typeof anonymous;
  elements: BoardElementRow[];
  imageUrls: Record<string, string>;
  members?: TaskMember[];
  shell?: BoardNavigationState;
}) {
  const router = useRouter();
  useEffect(() => {
    document.title = `${board.title} · Stylus`;
  }, [board.title]);
  const {
    history,
    rows,
    pending,
    error: documentError,
    commit,
    navigate,
    receive,
    adopt,
    retry,
    startInteraction,
    cancelInteraction,
    isBusy,
    isDirty,
    dirty,
    dismissError,
    hasRetry,
    getRows,
    getRevision,
    mergeSnapshot,
  } = useBoardDocument(board, elements, canMutate);
  const {
    url: imageUrl,
    retry: retryImage,
    accept: acceptImage,
  } = useBoardImages(board, rows, imageUrls);
  const [selected, setSelected] = useState<string[]>([]),
    [panel, setPanel] = useState<Panel>(null);
  const [tool, setTool] = useState<WhiteboardTool>("SELECT"),
    [shape, setShape] = useState("rectangle");
  const [title, setTitle] = useState(board.title),
    [renaming, setRenaming] = useState(false),
    [titlePending, setTitlePending] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [help, setHelp] = useState(false),
    [shortcuts, setShortcuts] = useState(true);
  const [archiveChoice, setArchiveChoice] = useState(false),
    [linkAt, setLinkAt] = useState<Point | null>(null);
  const [minimap, setMinimap] = useState(false);
  const [comments, setComments] = useState(initialComments),
    [commentsLoading, setCommentsLoading] = useState(false),
    [commentsError, setCommentsError] = useState<string | null>(null);
  const commentsLoaded = useRef(initialComments.length > 0),
    commentsBusy = useRef(false);
  const [beforeComment, setBeforeComment] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const canvasApi = useRef<BoardCanvasHandle>(null),
    picker = useRef<HTMLInputElement>(null);
  const imagePosition = useRef<Point>({ x: 0, y: 0 }),
    replacement = useRef<string | undefined>(undefined);
  const selectedRows = selectionRoots(rows, selected);
  const onUploaded = useCallback(
    (row: BoardElementRow, url: string, created: boolean) => {
      adopt(row, created);
      acceptImage(row, url);
      setSelected([row.id]);
      setTool("SELECT");
    },
    [adopt, acceptImage],
  );
  const uploads = useBoardUploads(
    board,
    getRows,
    startInteraction,
    cancelInteraction,
    onUploaded,
  );
  const uploadFailed = uploads.items.some((item) => item.state === "Error");
  const busy = pending || uploads.pending || titlePending;
  const editable = canMutate && !busy && !dirty;
  const beforeLeave = () =>
    (!isDirty() &&
      !uploads.pending &&
      !uploadFailed &&
      !titlePending &&
      (!renaming || title === board.title)) ||
    window.confirm(
      "This board has unsaved work. Stay to retry saving, or leave and discard unsaved changes?",
    );
  const onComment = useCallback(
    (row: BoardCommentRow) => {
      if (
        row.organization_id === board.organization_id &&
        row.board_id === board.id
      )
        setComments((rows) => reconcileBoardComment(rows, row));
    },
    [board.id, board.organization_id],
  );
  const collaboration = useBoardCollaboration(
    board,
    currentUser,
    members,
    receive,
    onComment,
  );
  const refreshBoard = useCallback(() => {
    router.refresh();
    const revision = getRevision();
    void readBoardSnapshotAction({
      boardId: board.id,
      organizationId: board.organization_id,
    })
      .then((result) => {
        if (result.status === "success" && result.canMutate === canMutate)
          mergeSnapshot(result.rows, revision);
        else if (result.status === "error") setError(result.message);
      })
      .catch(() =>
        setError(
          "Board access could not be refreshed. Reload to check access.",
        ),
      );
  }, [
    router,
    getRevision,
    mergeSnapshot,
    board.id,
    board.organization_id,
    canMutate,
  ]);
  const previousConnection = useRef(collaboration.connection);
  useEffect(() => {
    if (
      previousConnection.current === "DEGRADED" &&
      collaboration.connection === "CONNECTED"
    )
      refreshBoard();
    previousConnection.current = collaboration.connection;
  }, [collaboration.connection, refreshBoard]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        isDirty() ||
        uploads.pending ||
        uploadFailed ||
        titlePending ||
        renaming
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("focus", refreshBoard);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("focus", refreshBoard);
    };
  }, [
    isDirty,
    uploads.pending,
    uploadFailed,
    titlePending,
    renaming,
    refreshBoard,
  ]);
  async function loadComments(earlier = false) {
    if (commentsBusy.current) return;
    commentsBusy.current = true;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await readBoardCommentsAction({
        boardId: board.id,
        organizationId: board.organization_id,
        ...(earlier && beforeComment ? { before: beforeComment } : {}),
      });
      if (result.status === "error") throw new Error(result.message);
      setComments((rows) =>
        result.comments.reduce(reconcileBoardComment, rows),
      );
      setBeforeComment(result.before);
      commentsLoaded.current = true;
    } catch (caught) {
      setCommentsError(
        caught instanceof Error
          ? caught.message
          : "Comments could not load. Retry comments.",
      );
    } finally {
      setCommentsLoading(false);
      commentsBusy.current = false;
    }
  }
  function openPanel(next: Panel) {
    setPanel(next);
    if (next === "COMMENTS" && !commentsLoaded.current) void loadComments();
  }
  function report(operation: () => BoardElementRow[]) {
    if (!editable) return;
    try {
      setError(null);
      void commit(operation());
    } catch (caught) {
      setError((caught as Error).message);
    }
  }
  const update = useCallback(
    async (id: string, patch: Partial<BoardElementRow>) => {
      if (!canMutate || isBusy() || isDirty()) return null;
      const rows = getRows(),
        row = rows.find((entry) => entry.id === id);
      if (!row || isObjectLocked(row, rows)) {
        cancelInteraction(id);
        return null;
      }
      let next = { ...row, ...patch };
      if (
        (row.element_type === "IMAGE" && next.style.aspectLock !== false) ||
        (row.element_type === "SHAPE" && next.content.shape === "circle")
      ) {
        if (next.width !== row.width)
          next = {
            ...next,
            height:
              row.element_type === "SHAPE"
                ? next.width
                : (row.height * next.width) / row.width,
          };
        else if (next.height !== row.height)
          next = {
            ...next,
            width:
              row.element_type === "SHAPE"
                ? next.height
                : (row.width * next.height) / row.height,
          };
      }
      try {
        let after = rows;
        if (
          (row.element_type === "SECTION" || row.element_type === "GROUP") &&
          next.width === row.width &&
          next.height === row.height &&
          (next.x !== row.x || next.y !== row.y)
        )
          after = moveObjects(rows, [id], next.x - row.x, next.y - row.y);
        after = after.map((entry) => (entry.id === id ? next : entry));
        const saved = await commit(after);
        return saved
          ? (getRows().find((entry) => entry.id === id) ?? next)
          : null;
      } finally {
        cancelInteraction(id);
      }
    },
    [canMutate, cancelInteraction, commit, getRows, isBusy, isDirty],
  );
  const onContentCommit = useCallback(
    (id: string, content: Record<string, unknown>) => {
      void update(id, { content });
    },
    [update],
  );
  const onResizeCommit = useCallback(
    (
      id: string,
      bounds: { height: number; width: number; x: number; y: number },
    ) => {
      void update(id, bounds);
    },
    [update],
  );
  const commentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of comments)
      if (row.element_id && !row.archived_at)
        counts.set(row.element_id, (counts.get(row.element_id) ?? 0) + 1);
    return counts;
  }, [comments]);
  function select(id: string, additive = false) {
    setSelected((ids) =>
      additive
        ? ids.includes(id)
          ? ids.filter((value) => value !== id)
          : [...ids, id]
        : [id],
    );
  }
  function imageRequest(id?: string) {
    if (!editable) return;
    replacement.current = id;
    imagePosition.current = canvasApi.current?.center() ?? { x: 0, y: 0 };
    if (picker.current) picker.current.multiple = !id;
    picker.current?.click();
  }
  function insert(at: Point) {
    if (!editable || tool === "SELECT" || tool === "PAN") return;
    if (tool === "LINK") {
      setLinkAt(at);
      setTool("SELECT");
      return;
    }
    if (tool === "IMAGE") {
      imageRequest();
      return;
    }
    const row = createLocalObject(
      tool,
      board.id,
      board.organization_id,
      currentUser.id,
      getRows(),
      at,
    );
    if (tool === "SHAPE") {
      row.content = { shape };
      if (shape === "circle") row.height = row.width;
    }
    if (tool === "ARROW") row.content = { line: shape === "line" };
    void commit([...getRows(), row]).then((saved) => {
      if (saved) setSelected([row.id]);
    });
    setTool("SELECT");
  }
  function archive(keep = false) {
    report(() => archiveObjects(getRows(), selected, keep));
    setArchiveChoice(false);
  }
  function action(value: SelectionAction) {
    if (!editable) return;
    if (
      value === "ARCHIVE" &&
      selectedRows.some((row) => row.element_type === "SECTION")
    ) {
      setArchiveChoice(true);
      return;
    }
    report(() => {
      const rows = getRows();
      switch (value) {
        case "ARCHIVE":
          return archiveObjects(rows, selected);
        case "GROUP": {
          let groupId = "";
          const after = groupObjects(rows, selected, (bounds, parent_id) => {
            const group = createLocalObject(
              "GROUP",
              board.id,
              board.organization_id,
              currentUser.id,
              rows,
              { x: bounds.x - 8, y: bounds.y - 32 },
              {
                width: bounds.width + 16,
                height: bounds.height + 40,
                parent_id,
              },
            );
            groupId = group.id;
            return group;
          });
          setSelected([groupId]);
          return after;
        }
        case "UNGROUP":
          return ungroupObjects(rows, selected);
        case "DUPLICATE": {
          const copied = duplicateObjects(rows, selected, currentUser.id);
          setSelected(copied.ids);
          return copied.rows;
        }
        case "LOCK": {
          const ids = new Set(
              selectionRoots(rows, selected).map((row) => row.id),
            ),
            unlock = selectionRoots(rows, selected).every((row) => row.locked);
          return rows.map((row) =>
            ids.has(row.id) ? { ...row, locked: !unlock } : row,
          );
        }
        case "WIDTH":
        case "HEIGHT":
          return matchObjectSize(
            rows,
            selected,
            value === "WIDTH" ? "width" : "height",
          );
        case "DISTRIBUTE_X":
        case "DISTRIBUTE_Y":
          return distributeObjects(
            rows,
            selected,
            value === "DISTRIBUTE_X" ? "x" : "y",
          );
        default:
          return layerObjects(rows, selected, value);
      }
    });
  }
  async function rename() {
    if (!renaming) return;
    setRenaming(false);
    if (title === board.title) return;
    setTitlePending(true);
    try {
      const result = await renameBoardAction(board.id, title);
      if (result.status === "error") throw new Error(result.message);
    } catch (caught) {
      setError((caught as Error).message);
      setRenaming(true);
    } finally {
      setTitlePending(false);
    }
  }
  return (
    <div
      data-board-shell
      className="bg-background flex h-dvh min-h-0 flex-col overflow-hidden max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
    >
      <a
        className="bg-background focus:ring-ring sr-only fixed top-2 left-2 z-[60] rounded border px-4 py-2 focus:not-sr-only focus:ring-2"
        href="#board-canvas"
        onClick={(event) => {
          event.preventDefault();
          focusBoardCanvas();
        }}
      >
        Skip to canvas
      </a>
      <WhiteboardHeader
        canMutate={canMutate && !busy}
        title={title}
        setTitle={setTitle}
        renaming={renaming}
        onRenamingChange={setRenaming}
        onRename={() => void rename()}
        saveState={
          (documentError && dirty) || uploadFailed
            ? "ERROR"
            : busy
              ? "SAVING"
              : renaming
                ? "UNSAVED"
                : "SAVED"
        }
        onRetry={hasRetry ? retry : undefined}
        beforeLeave={beforeLeave}
        navigation={
          shell ? (
            <BoardNavigation state={shell} beforeLeave={beforeLeave} />
          ) : undefined
        }
        actions={
          <>
            <div className="hidden sm:block">
              <WhiteboardCollaborators
                connection={collaboration.connection}
                colorAssignments={collaboration.colors}
                currentUserId={currentUser.id}
                presence={collaboration.presence}
              />
            </div>
            <Button
              aria-label="Open board comments"
              aria-pressed={panel === "COMMENTS"}
              onClick={() =>
                openPanel(panel === "COMMENTS" ? null : "COMMENTS")
              }
              size="icon"
              title="Comments"
              variant="ghost"
            >
              <MessageSquare aria-hidden="true" className="size-4" />
            </Button>
            <BoardMenu
              onOutline={() => openPanel("OUTLINE")}
              onHelp={() => setHelp(true)}
              shortcuts={shortcuts}
              onShortcuts={setShortcuts}
              minimap={minimap}
              onMinimap={() => setMinimap((value) => !value)}
              connection={collaboration.connection}
            />
          </>
        }
      />
      {error || documentError || uploads.error ? (
        <div
          className="bg-background flex items-center justify-between gap-2 border-b px-3 py-2 text-sm"
          role="alert"
        >
          <p>{error ?? documentError ?? uploads.error}</p>
          <Button
            onClick={() => {
              setError(null);
              dismissError();
              uploads.dismiss();
            }}
            variant="ghost"
          >
            Dismiss
          </Button>
          {dirty && !hasRetry ? (
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
            >
              Reload board
            </Button>
          ) : null}
        </div>
      ) : null}
      <main
        className="relative flex min-h-0 flex-1 flex-col"
        aria-label="Board workspace"
      >
        <BoardCanvas
          ref={canvasApi}
          board={board}
          userId={currentUser.id}
          rows={rows}
          selected={selected}
          select={select}
          onSelection={setSelected}
          tool={tool}
          setTool={setTool}
          shape={shape}
          setShape={setShape}
          editable={editable}
          canMutate={canMutate}
          busy={busy}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          navigate={navigate}
          action={action}
          shortcuts={shortcuts}
          onMove={(dx, dy) =>
            report(() => moveObjects(getRows(), selected, dx, dy))
          }
          onInsert={insert}
          onImageRequest={(position) => {
            imagePosition.current = position;
            replacement.current = undefined;
            if (picker.current) picker.current.multiple = true;
            picker.current?.click();
          }}
          onFiles={uploads.add}
          onPanel={openPanel}
          collaboration={collaboration}
          minimap={minimap}
          commentCounts={commentCounts}
          imageUrl={imageUrl}
          retryImage={retryImage}
          onContentCommit={onContentCommit}
          onResizeCommit={onResizeCommit}
          startInteraction={startInteraction}
          cancelInteraction={cancelInteraction}
          getRows={getRows}
          commit={commit}
          onError={setError}
        />
      </main>
      {uploads.items.length ? (
        <div
          aria-label="Image uploads"
          className="bg-background max-h-40 overflow-y-auto border-t px-3 py-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <p>Images · up to 10 MB each</p>
            <Button
              disabled={uploads.pending}
              onClick={uploads.dismiss}
              variant="ghost"
            >
              Dismiss uploads
            </Button>
          </div>
          {uploads.items.map((item) => (
            <div className="flex items-center gap-2 py-1" key={item.id}>
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              <span role={item.state === "Error" ? "alert" : "status"}>
                {item.error ?? item.state}
              </span>
              {item.state === "Error" ? (
                <Button onClick={() => uploads.retry(item.id)} variant="ghost">
                  Retry file
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <input
        accept="image/png,image/jpeg,image/webp"
        aria-label="Upload board images"
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          uploads.add(
            replacement.current ? files.slice(0, 1) : files,
            imagePosition.current,
            replacement.current,
          );
          event.currentTarget.value = "";
          replacement.current = undefined;
        }}
        ref={picker}
        tabIndex={-1}
        type="file"
      />
      {panel === "INSPECTOR" ? (
        <BoardPanel title="Inspector" onClose={() => setPanel(null)}>
          <BoardInspector
            rows={rows}
            selection={selectedRows}
            canMutate={canMutate}
            busy={busy || dirty}
            onUpdate={update}
            onAction={action}
            onAlign={(alignment) =>
              report(() => alignObjects(getRows(), selected, alignment))
            }
            onMembership={(id) =>
              report(() => assignSection(getRows(), selected, id))
            }
            onReplace={imageRequest}
            onSelect={(id) => select(id)}
          />
        </BoardPanel>
      ) : null}
      {panel === "OUTLINE" ? (
        <BoardPanel title="Object outline" onClose={() => setPanel(null)}>
          <BoardOutline
            rows={rows}
            selected={selected}
            onSelect={(id, additive) => select(id, additive)}
            onLocate={(id) => {
              canvasApi.current?.locate(id);
              setPanel(null);
              requestAnimationFrame(focusBoardCanvas);
            }}
          />
          <Button
            className="mt-4 w-full"
            disabled={!selectedRows.length}
            onClick={() => setPanel("INSPECTOR")}
            variant="secondary"
          >
            Inspect selected objects
          </Button>
        </BoardPanel>
      ) : null}
      <WhiteboardCommentsPanel
        boardId={board.id}
        canMutate={canMutate}
        comments={comments}
        currentUserId={currentUser.id}
        members={members}
        onComment={onComment}
        selectedElementId={
          selectedRows.length === 1 ? selectedRows[0]!.id : null
        }
        controlledOpen={panel === "COMMENTS"}
        onOpenChange={(open) => openPanel(open ? "COMMENTS" : null)}
        loading={commentsLoading}
        loadError={commentsError}
        onLoad={() => void loadComments(Boolean(beforeComment))}
        hasEarlier={Boolean(beforeComment)}
      />
      <Dialog
        className="max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
        open={archiveChoice}
        onOpenChange={setArchiveChoice}
        title="Archive Section"
        description="Choose what happens to its children. This is one atomic, undoable operation."
      >
        <div className="flex flex-wrap gap-2 p-5">
          <Button onClick={() => archive(true)} variant="secondary">
            Keep children on board
          </Button>
          <Button onClick={() => archive(false)} variant="destructive">
            Archive Section and children
          </Button>
        </div>
      </Dialog>
      <BoardLinkDialog
        open={Boolean(linkAt)}
        onClose={() => setLinkAt(null)}
        busy={busy}
        onCreate={async (content) => {
          const row = createLocalObject(
            "LINK",
            board.id,
            board.organization_id,
            currentUser.id,
            getRows(),
            linkAt ?? canvasApi.current?.center() ?? { x: 0, y: 0 },
            { content },
          );
          const saved = await commit([...getRows(), row]);
          if (saved) {
            setSelected([row.id]);
            setLinkAt(null);
          }
          return saved;
        }}
      />
      <BoardHelp open={help} onOpenChange={setHelp} />
    </div>
  );
}
