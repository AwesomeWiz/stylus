"use client";
import "./board-content-fonts.css";
import { MessageSquare } from "lucide-react";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
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
import { dropLayer, type LayerDrop } from "@/modules/whiteboards/layers";
import {
  canMoveObject,
  alignObjects,
  ancestors,
  expandedIds,
  objectBounds,
  objectTitle,
  sectionFromSelection,
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
  indexBoardObjects,
} from "@/modules/whiteboards/operations";
import {
  readBoardCommentsAction,
  readBoardSnapshotAction,
} from "@/modules/whiteboards/read-actions";

import { BoardContextMenu, type BoardCommand } from "./board-context-menu";
import { alignmentCommands, layerCommands } from "./board-arrange-controls";
import { BoardInspector, type SelectionAction } from "./board-inspector";
import {
  BoardNavigation,
  focusBoardCanvas,
  type BoardNavigationState,
} from "./board-navigation";
import { BoardOutline } from "./board-outline";
import { BoardPanel, useBoardDesktop } from "./board-panel";
import { useBoardPanels } from "./use-board-view";
import { useBoardReactions } from "./use-board-reactions";
import { reactionChoices } from "./board-reactions";
import { measureBoardText } from "./measure-board-text";
import { sameElement } from "@/modules/whiteboards/history";
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
import { useBoardEvent } from "./use-board-event";

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
  const desktop = useBoardDesktop();
  const panels = useBoardPanels(currentUser.id);
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
    hasReload,
    getRows,
    getRevision,
    mergeSnapshot,
  } = useBoardDocument(board, elements, canMutate, currentUser.id);
  const objectIndex = useMemo(() => indexBoardObjects(rows), [rows]);
  const [selected, setSelected] = useState<string[]>([]),
    [panel, setPanel] = useState<Panel>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [textLayoutPending, setTextLayoutPending] = useState(false);
  const textLayoutBusy = useRef(false);
  const interactionBusy = useCallback(
    () => isBusy() || textLayoutBusy.current,
    [isBusy],
  );
  const [visibleObjectIds, setVisibleObjectIds] = useState<string[]>([]);
  const visibleIds = useMemo(
    () => [...new Set([...selected, ...visibleObjectIds])],
    [selected, visibleObjectIds],
  );
  const reactionIds = useMemo(() => visibleIds.slice(0, 200), [visibleIds]);
  const reactions = useBoardReactions(
    board,
    currentUser.id,
    reactionIds,
    canMutate,
  );
  const {
    url: imageUrl,
    retry: retryImage,
    accept: acceptImage,
  } = useBoardImages(board, rows, imageUrls, visibleIds);
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
  const [minimap, setMinimap] = useState(false),
    [grid, setGrid] = useState(true);
  const [snapObjects, setSnapObjects] = useState(true),
    [snapGrid, setSnapGrid] = useState(false);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    point: Point;
  } | null>(null);
  const [clipboard, setClipboard] = useState<BoardElementRow[]>([]);
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
  const selectedRows = useMemo(
    () => selectionRoots(rows, selected),
    [rows, selected],
  );

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
  const busy = pending || uploads.pending || titlePending || textLayoutPending;
  const editable = canMutate && !busy && !dirty;
  const focusName = useRef<string | null>(null);
  useEffect(() => {
    if (
      !busy &&
      panel === "INSPECTOR" &&
      focusName.current &&
      selected.includes(focusName.current)
    ) {
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLInputElement>(
          '[aria-label="Name"]',
        );
        if (field) {
          field.focus();
          field.select();
          focusName.current = null;
        }
      });
    }
  }, [busy, panel, selected, rows]);
  const beforeLeave = () =>
    (!isDirty() &&
      !textLayoutBusy.current &&
      !uploads.pending &&
      !uploadFailed &&
      !titlePending &&
      (!renaming || title === board.title)) ||
    window.confirm(
      "This board has unsaved work. Stay to retry saving, or leave and discard unsaved changes?",
    );
  const receiveComment = reactions.receiveComment;
  const onComment = useCallback(
    (row: BoardCommentRow) => {
      if (
        row.organization_id === board.organization_id &&
        row.board_id === board.id
      )
        setComments((rows) => reconcileBoardComment(rows, row));
      receiveComment(row);
    },
    [board.id, board.organization_id, receiveComment],
  );
  const collaboration = useBoardCollaboration(
    board,
    currentUser,
    members,
    receive,
    onComment,
    reactions.receive,
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
        textLayoutPending ||
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
    textLayoutPending,
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
    if (desktop && next === "OUTLINE") panels.show("layers");
    if (desktop && next === "INSPECTOR") panels.show("properties");
    setPanel(next);
    if (next === "COMMENTS" && !commentsLoaded.current) void loadComments();
  }
  function toggleSidebars() {
    if (panel === "COMMENTS") panels.hide();
    else panels.toggleBoth();
    setPanel(null);
  }
  function report(operation: () => BoardElementRow[]) {
    if (!editable) return;
    try {
      setError(null);
      const previousSelection = selected;
      void commit(operation()).then((saved) => {
        if (!saved)
          setSelected(
            previousSelection.filter((id) =>
              getRows().some((row) => row.id === id),
            ),
          );
      });
    } catch (caught) {
      setError((caught as Error).message);
    }
  }
  const update = useCallback(
    async (id: string, patch: Partial<BoardElementRow>) => {
      if (!canMutate || isBusy() || isDirty() || textLayoutBusy.current)
        return null;
      const rows = getRows(),
        row = rows.find((entry) => entry.id === id);
      if (
        !row ||
        (isObjectLocked(row, rows) &&
          !(
            patch.locked === false &&
            row.locked &&
            !ancestors(row, rows).some((parent) => parent.locked)
          ))
      ) {
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
        if (
          ["TEXT", "STICKY"].includes(next.element_type) &&
          next.style.sizing === "auto" &&
          patch.height === undefined
        ) {
          textLayoutBusy.current = true;
          setTextLayoutPending(true);
          try {
            const height = await measureBoardText(next);
            if (
              isBusy() ||
              !sameElement(
                getRows().find((item) => item.id === id) ?? null,
                row,
              )
            ) {
              setError(
                "This object changed while updating its text layout. Retry the property change.",
              );
              return null;
            }
            next = { ...next, height };
          } finally {
            textLayoutBusy.current = false;
            setTextLayoutPending(false);
          }
        }
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
    (id: string, content: Record<string, unknown>, height?: number) => {
      void update(id, { content, ...(height !== undefined ? { height } : {}) });
    },
    [update],
  );
  const onResizeCommit = useCallback(
    (
      id: string,
      bounds: { height: number; width: number; x: number; y: number },
    ) => {
      const row = getRows().find((row) => row.id === id);
      const fixed =
        row &&
        ["TEXT", "STICKY"].includes(row.element_type) &&
        row.style.sizing === "auto" &&
        bounds.height !== row.height;
      void update(id, {
        ...bounds,
        ...(fixed ? { style: { ...row.style, sizing: "fixed" } } : {}),
      });
    },
    [update, getRows],
  );
  const commentCounts = useMemo(() => {
    if (reactions.countsLoaded)
      return new Map(
        reactions.counts.map((row) => [row.element_id, row.total]),
      );
    const counts = new Map<string, number>();
    for (const row of comments)
      if (
        row.element_id &&
        !row.archived_at &&
        !row.parent_id &&
        !row.resolved_at
      )
        counts.set(row.element_id, (counts.get(row.element_id) ?? 0) + 1);
    return counts;
  }, [comments, reactions.counts, reactions.countsLoaded]);
  const select = useCallback((id: string, additive = false) => {
    setSelected((ids) =>
      additive
        ? ids.includes(id)
          ? ids.filter((value) => value !== id)
          : [...ids, id]
        : [id],
    );
  }, []);
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
        case "SECTION": {
          const result = sectionFromSelection(rows, selected, (bounds) =>
            createLocalObject(
              "SECTION",
              board.id,
              board.organization_id,
              currentUser.id,
              rows,
              { x: bounds.x - 32, y: bounds.y - 48 },
              {
                width: Math.max(160, bounds.width + 64),
                height: Math.max(120, bounds.height + 80),
                content: { title: "New Section", collapsed: false },
              },
            ),
          );
          setSelected([result.id]);
          focusName.current = result.id;
          setPanel("INSPECTOR");
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>('[aria-label="Name"]')
                ?.focus(),
            ),
          );
          return result.rows;
        }
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
  function clipboardAction(command: "COPY" | "CUT" | "PASTE", point?: Point) {
    if (command !== "PASTE") {
      const ids = expandedIds(getRows(), selected);
      setClipboard(
        getRows()
          .filter((row) => ids.has(row.id))
          .map((row) => structuredClone(row)),
      );
      if (command === "CUT" && editable)
        report(() => archiveObjects(getRows(), selected));
      return;
    }
    if (!editable || !clipboard.length) return;
    const copied = duplicateObjects(
      clipboard,
      clipboard
        .filter((row) => !clipboard.some((p) => p.id === row.parent_id))
        .map((row) => row.id),
      currentUser.id,
    );
    const copies = copied.rows.filter(
        (row) => !clipboard.some((old) => old.id === row.id),
      ),
      bounds = objectBounds(selectionRoots(copies, copied.ids)),
      at = point ?? canvasApi.current?.center() ?? { x: 0, y: 0 };
    const after = moveObjects(
      copies.map((row) => ({ ...row, locked: false })),
      copied.ids,
      at.x - bounds.x,
      at.y - bounds.y,
    ).map((row) => ({
      ...row,
      locked: copies.find((c) => c.id === row.id)!.locked,
    }));
    void commit([...getRows(), ...after]).then((ok) => {
      if (ok) setSelected(copied.ids);
    });
  }
  function contextCommands(): BoardCommand[] {
    const selection = selectedRows,
      one = selection.length === 1 ? selection[0] : undefined,
      allFree = selection.every((row) => canMoveObject(row, rows));
    const make = (label: string, value: SelectionAction): BoardCommand => ({
      label,
      run: () => action(value),
    });
    const commands: BoardCommand[] = [];
    if (!selection.length) {
      if (editable && clipboard.length)
        commands.push({
          label: "Paste here",
          run: () => clipboardAction("PASTE", context?.point),
        });
      if (editable)
        for (const [label, type] of [
          ["Add sticky", "STICKY"],
          ["Add text", "TEXT"],
          ["Add Section", "SECTION"],
        ] as const)
          commands.push({
            label,
            run: () => {
              const row = createLocalObject(
                type,
                board.id,
                board.organization_id,
                currentUser.id,
                getRows(),
                context?.point ?? { x: 0, y: 0 },
              );
              void commit([...getRows(), row]).then((ok) => {
                if (ok) setSelected([row.id]);
              });
            },
          });
      if (editable)
        commands.push({
          label: "Add image",
          run: () => {
            imagePosition.current = context?.point ?? { x: 0, y: 0 };
            replacement.current = undefined;
            picker.current?.click();
          },
        });
      commands.push(
        {
          label: "Select all",
          run: () =>
            setSelected(rows.filter((r) => !r.parent_id).map((r) => r.id)),
        },
        { label: "Fit board", run: () => canvasApi.current?.fit() },
        { label: "Dot grid", checked: grid, run: () => setGrid((v) => !v) },
        {
          label: "Minimap",
          checked: minimap,
          run: () => setMinimap((v) => !v),
        },
      );
      return commands;
    }
    commands.push({ label: "Copy", run: () => clipboardAction("COPY") });
    commands.push({ label: "Comment", run: () => openPanel("COMMENTS") });
    if (canMutate && one)
      commands.push({
        label: "React",
        children: reactionChoices.map((choice) => ({
          label: choice.label,
          run: () => void reactions.toggle(one.id, choice.kind),
        })),
      });
    if (editable) {
      if (allFree)
        commands.push({ label: "Cut", run: () => clipboardAction("CUT") });
      if (clipboard.length)
        commands.push({
          label: "Paste here",
          run: () => clipboardAction("PASTE", context?.point),
        });
      commands.push(make("Duplicate", "DUPLICATE"));
      if (one && ["GROUP", "SECTION"].includes(one.element_type))
        commands.push({
          label: "Rename",
          run: () => {
            openPanel("INSPECTOR");
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>('[aria-label="Name"]')
                  ?.focus(),
              0,
            );
          },
        });
      if (one?.element_type === "GROUP" && allFree)
        commands.push(make("Ungroup", "UNGROUP"));
      if (
        selection.length >= 2 &&
        allFree &&
        selection.every(
          (r) => !["GROUP", "SECTION"].includes(r.element_type),
        ) &&
        new Set(selection.map((r) => r.parent_id)).size === 1 &&
        !ancestors(selection[0]!, rows).some((r) => r.element_type === "GROUP")
      )
        commands.push(make("Group selection", "GROUP"));
      if (
        allFree &&
        selection.every((r) => !r.parent_id && r.element_type !== "SECTION")
      )
        commands.push(make("Create section from selection", "SECTION"));
      if (selection.length >= 2 && allFree)
        commands.push({
          label: "Alignment",
          children: alignmentCommands.map(([value, label]) => ({
            label,
            run: () => report(() => alignObjects(getRows(), selected, value)),
          })),
        });
      if (selection.length >= 3 && allFree)
        commands.push({
          label: "Distribution",
          children: [
            make("Distribute horizontally", "DISTRIBUTE_X"),
            make("Distribute vertically", "DISTRIBUTE_Y"),
          ],
        });
      if (
        selection.length >= 2 &&
        allFree &&
        selection.every(
          (r) => !["SECTION", "GROUP", "ARROW"].includes(r.element_type),
        )
      )
        commands.push({
          label: "Match size",
          children: [
            make("Same width", "WIDTH"),
            make("Same height", "HEIGHT"),
          ],
        });
      if (allFree)
        commands.push({
          label: "Arrange",
          children: layerCommands.map(([value, label]) => make(label, value)),
        });
      commands.push(
        make(selection.every((r) => r.locked) ? "Unlock" : "Lock", "LOCK"),
      );
      if (
        allFree &&
        selection.every(
          (r) =>
            r.element_type !== "SECTION" &&
            ancestors(r, rows)[0]?.element_type !== "GROUP",
        )
      )
        commands.push({
          label: "Move to section",
          children: [
            {
              label: "Loose objects",
              run: () => report(() => assignSection(getRows(), selected, null)),
            },
            ...rows
              .filter((r) => r.element_type === "SECTION" && !r.locked)
              .map((r) => ({
                label: objectTitle(r),
                run: () =>
                  report(() => assignSection(getRows(), selected, r.id)),
              })),
          ],
        });
      if (one?.element_type === "SECTION")
        commands.push(
          {
            label: one.content.collapsed ? "Expand" : "Collapse",
            run: () =>
              void update(one.id, {
                content: { ...one.content, collapsed: !one.content.collapsed },
              }),
          },
          {
            label: "Select contents",
            run: () =>
              setSelected(
                rows.filter((r) => r.parent_id === one.id).map((r) => r.id),
              ),
          },
          {
            label: "Archive Section",
            children: [
              {
                label: "Keep children on board",
                danger: true,
                run: () => archive(true),
              },
              {
                label: "Archive contents",
                danger: true,
                run: () => archive(false),
              },
            ],
          },
        );
      else if (allFree)
        commands.push({ ...make("Delete", "ARCHIVE"), danger: true });
    }
    commands.push({ label: "Properties", run: () => openPanel("INSPECTOR") });
    return commands;
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
  const handleLayerDrop = useBoardEvent(
    (id: string, target: string | null, place: LayerDrop) => {
      if (!editable || isBusy()) return Promise.resolve(false);
      return commit(dropLayer(getRows(), id, target, place));
    },
  );
  const handleLayerBusy = useBoardEvent(() => !editable || interactionBusy());
  const handleLayerContext = useBoardEvent(
    (id: string, x: number, y: number) => {
      if (!selected.includes(id)) select(id);
      setContext({
        x,
        y,
        point: canvasApi.current?.center() ?? { x: 0, y: 0 },
      });
    },
  );
  const handleLayerLocate = useBoardEvent((id: string) => {
    canvasApi.current?.locate(id);
    setPanel(null);
    requestAnimationFrame(focusBoardCanvas);
  });
  const handleObjectComment = useBoardEvent((id: string) => {
    select(id);
    openPanel("COMMENTS");
  });
  const handleStyle = useBoardEvent(
    async (id: string, style: Record<string, unknown>) =>
      !!(await update(id, { style })),
  );
  const handleCanvasContext = useBoardEvent<
    Parameters<ComponentProps<typeof BoardCanvas>["onContext"]>,
    void
  >((event, id, point) => {
    event.preventDefault();
    event.stopPropagation();
    if (id && !selected.includes(id)) select(id);
    if (!id) setSelected([]);
    setContext({ x: event.clientX, y: event.clientY, point });
  });
  return (
    <div
      onKeyDownCapture={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.code === "Backslash" &&
          !(event.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable=true]",
          )
        ) {
          event.preventDefault();
          toggleSidebars();
        }
      }}
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
          documentError || uploadFailed
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
              snapObjects={snapObjects}
              onSnapObjects={() => setSnapObjects((value) => !value)}
              snapGrid={snapGrid}
              onSnapGrid={() => setSnapGrid((value) => !value)}
              onToggleSidebars={toggleSidebars}
              sidebarsVisible={
                panels.layers || panels.properties || panel === "COMMENTS"
              }
              onOutline={() => openPanel("OUTLINE")}
              grid={grid}
              onGrid={() => setGrid((v) => !v)}
              onFit={() => canvasApi.current?.fit()}
              onFitSelection={() => canvasApi.current?.fit(true)}
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
      {reactions.error ? (
        <div
          role="alert"
          className="bg-background flex items-center gap-2 border-b px-3 py-2 text-sm"
        >
          <p>{reactions.error}</p>
          <Button variant="ghost" onClick={reactions.retry}>
            Retry reactions
          </Button>
        </div>
      ) : null}
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
          {hasReload ? (
            <Button
              onClick={() => {
                dismissError();
                refreshBoard();
              }}
              variant="secondary"
            >
              Reload latest state
            </Button>
          ) : null}
        </div>
      ) : null}
      <main
        className="relative flex min-h-0 flex-1"
        aria-label="Board workspace"
      >
        {desktop || panel === "OUTLINE" ? (
          <BoardPanel
            title="Layers"
            visible={!desktop || panels.layers}
            docked
            side="left"
            tab="OUTLINE"
            onTab={desktop ? undefined : openPanel}
            onClose={() => (desktop ? panels.toggle("layers") : setPanel(null))}
          >
            <BoardOutline
              active={!desktop || panels.layers}
              rows={rows}
              objectIndex={objectIndex}
              selected={selected}
              onUpdate={canMutate ? update : undefined}
              onHover={setHovered}
              onDrop={canMutate ? handleLayerDrop : undefined}
              isBusy={handleLayerBusy}
              onContext={handleLayerContext}
              onSelect={select}
              onLocate={handleLayerLocate}
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
        <BoardCanvas
          ref={canvasApi}
          objectIndex={objectIndex}
          board={board}
          userId={currentUser.id}
          rows={rows}
          highlighted={hovered}
          reactions={reactions.rows}
          reactionPending={reactions.pending}
          members={members}
          onReaction={reactions.toggle}
          onVisibleObjects={setVisibleObjectIds}
          onStyle={handleStyle}
          onReplace={imageRequest}
          onObjectComment={handleObjectComment}
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
          grid={grid}
          snapObjects={snapObjects}
          snapGrid={snapGrid}
          onContext={handleCanvasContext}
          onClipboard={clipboardAction}
          hasClipboard={clipboard.length > 0}
          onSectionDraw={(bounds) => {
            const row = createLocalObject(
              "SECTION",
              board.id,
              board.organization_id,
              currentUser.id,
              getRows(),
              bounds,
              bounds,
            );
            void commit([...getRows(), row]).then((ok) => {
              if (ok) setSelected([row.id]);
            });
            setTool("SELECT");
          }}
          commentCounts={commentCounts}
          imageUrl={imageUrl}
          retryImage={retryImage}
          onContentCommit={onContentCommit}
          onResizeCommit={onResizeCommit}
          startInteraction={startInteraction}
          cancelInteraction={cancelInteraction}
          getRows={getRows}
          isBusy={interactionBusy}
          commit={commit}
          onError={setError}
        />
        {(
          desktop
            ? panels.properties && panel !== "COMMENTS"
            : panel === "INSPECTOR"
        ) ? (
          <BoardPanel
            title="Properties"
            docked
            tab="INSPECTOR"
            onTab={desktop ? undefined : openPanel}
            onClose={() =>
              desktop ? panels.toggle("properties") : setPanel(null)
            }
          >
            {!selectedRows.length ? (
              <div className="space-y-4 text-sm">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">
                  {rows.length} objects · Select on the canvas or in Layers to
                  edit.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => canvasApi.current?.fit()}
                >
                  Fit board
                </Button>
                <label className="flex min-h-10 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={grid}
                    onChange={() => setGrid((v) => !v)}
                  />
                  Dot grid
                </label>
              </div>
            ) : (
              <BoardInspector
                key={selectedRows.map((row) => row.id).join(":")}
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
            )}
          </BoardPanel>
        ) : null}
        <WhiteboardCommentsPanel
          docked
          onLocate={(id) => canvasApi.current?.locate(id)}
          objectNames={new Map(rows.map((row) => [row.id, objectTitle(row)]))}
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
      {context ? (
        <BoardContextMenu
          position={context}
          commands={contextCommands}
          onClose={() => setContext(null)}
        />
      ) : null}
      <BoardHelp open={help} onOpenChange={setHelp} />
    </div>
  );
}
