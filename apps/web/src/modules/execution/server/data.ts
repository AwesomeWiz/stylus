import "server-only";
import { z } from "zod";
import { entitySearchPattern } from "@/core/entities/public";
import { findCompanyMemoryCreation } from "@/core/memory/server";
import { executionSelection, executionSearch } from "../schemas";
import { executionContext, checked } from "./context";

export async function getMilestones(
  archived = false,
  after?: string,
  search = "",
) {
  const { db, org } = await executionContext();
  let query = db
    .from("milestones")
    .select("id,title,target_date,status,owner_id,updated_at,archived_at")
    .eq("organization_id", org)
    .ilike("title", entitySearchPattern(search.trim().slice(0, 100)))
    .order("id")
    .limit(26);
  query = archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (after) query = query.gt("id", z.uuid().parse(after));
  const result = checked(await query),
    rows = result.slice(0, 25);
  const progress = rows.length
    ? checked(
        await db.rpc("milestone_progress", {
          p_organization_id: org,
          p_ids: rows.map((r) => r.id),
        }),
      )
    : [];
  return {
    rows: rows.map((row) => ({
      ...row,
      ...progress.find((p) => p.id === row.id),
    })),
    hasMore: result.length > 25,
    cursor: rows.at(-1)?.id,
    ...(after ? { after } : {}),
  };
}
export async function getMilestone(id: string) {
  const { db, org } = await executionContext();
  if (!z.uuid().safeParse(id).success) return null;
  const result = await db
    .from("milestones")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const progress = checked(
    await db.rpc("milestone_progress", { p_organization_id: org, p_ids: [id] }),
  );
  return {
    ...result.data,
    completed_count: progress[0]?.completed_count ?? 0,
    total_count: progress[0]?.total_count ?? 0,
  };
}
export async function getTaskExecution(input: unknown) {
  const { taskId } = executionSelection.parse(input),
    { db, org, context } = await executionContext();
  const task = checked<{ id: string; milestone_id: string | null }>(
    await db
      .from("tasks")
      .select("id,milestone_id")
      .eq("organization_id", org)
      .eq("id", taskId)
      .single(),
  );
  const [before, after, noteLinks] = await Promise.all([
    db
      .from("task_dependencies")
      .select("blocked_by_id")
      .eq("organization_id", org)
      .eq("task_id", taskId)
      .order("blocked_by_id")
      .limit(50),
    db
      .from("task_dependencies")
      .select("task_id")
      .eq("organization_id", org)
      .eq("blocked_by_id", taskId)
      .order("task_id")
      .limit(50),
    db
      .from("note_links")
      .select("note_id")
      .eq("organization_id", org)
      .eq("task_id", taskId)
      .order("id")
      .limit(30),
  ]);
  const blockedIds = checked(before).map((r) => r.blocked_by_id),
    blocksIds = checked(after).map((r) => r.task_id),
    ids = [...new Set([...blockedIds, ...blocksIds])],
    noteIds = checked(noteLinks).map((r) => r.note_id);
  const [tasks, milestone, notes] = await Promise.all([
    ids.length
      ? db
          .from("tasks")
          .select("id,title,status")
          .eq("organization_id", org)
          .in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    task.milestone_id
      ? db
          .from("milestones")
          .select("*")
          .eq("organization_id", org)
          .eq("id", task.milestone_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    noteIds.length
      ? db
          .from("notes")
          .select("id,title,archived_at")
          .eq("organization_id", org)
          .in("id", noteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (milestone.error) throw milestone.error;
  const related = checked(tasks);
  return {
    blockedBy: related.filter((t) => blockedIds.includes(t.id)),
    blocks: related.filter((t) => blocksIds.includes(t.id)),
    milestone: milestone.data,
    notes: checked(notes),
    canEdit: context.membership.role !== "VIEWER",
  };
}
export async function searchExecution(input: unknown) {
  const value = executionSearch.parse(input),
    { db, org } = await executionContext();
  if (value.kind === "task") {
    let query = db
      .from("tasks")
      .select("id,title,status")
      .eq("organization_id", org)
      .ilike("title", entitySearchPattern(value.query))
      .order("id")
      .limit(26);
    if (value.cursor) query = query.gt("id", value.cursor);
    const rows = checked(await query);
    return {
      items: rows
        .slice(0, 25)
        .map((r) => ({ id: r.id, title: r.title, status: r.status })),
      more: rows.length > 25,
      cursor: rows.slice(0, 25).at(-1)?.id,
    };
  }
  let query = db
    .from("milestones")
    .select("id,title,status")
    .eq("organization_id", org)
    .is("archived_at", null)
    .ilike("title", entitySearchPattern(value.query))
    .order("id")
    .limit(26);
  if (value.cursor) query = query.gt("id", value.cursor);
  const rows = checked(await query);
  return {
    items: rows.slice(0, 25),
    more: rows.length > 25,
    cursor: rows.slice(0, 25).at(-1)?.id,
  };
}
const cursor = z.object({
  updatedAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export async function getNotes(params: Record<string, string | undefined>) {
  const { db, org } = await executionContext(),
    query = (params.query ?? "").trim().slice(0, 100),
    archived = params.archived === "true";
  let request = db
    .from("notes")
    .select("id,title,updated_at,created_by,archived_at")
    .eq("organization_id", org)
    .ilike("title", entitySearchPattern(query))
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  request = archived
    ? request.not("archived_at", "is", null)
    : request.is("archived_at", null);
  if (params.before) {
    const before = cursor.parse(JSON.parse(params.before));
    request = request.or(
      `updated_at.lt.${before.updatedAt},and(updated_at.eq.${before.updatedAt},id.lt.${before.id})`,
    );
  }
  const rows = checked(await request),
    page = rows.slice(0, 25),
    last = page.at(-1);
  return {
    rows: page,
    query,
    archived,
    more: rows.length > 25,
    cursor: last
      ? JSON.stringify({ updatedAt: last.updated_at, id: last.id })
      : undefined,
    ...(params.before ? { before: params.before } : {}),
  };
}
export async function getNote(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { db, org } = await executionContext(),
    result = await db
      .from("notes")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const links = checked(
      await db
        .from("note_links")
        .select("*")
        .eq("organization_id", org)
        .eq("note_id", id)
        .order("id")
        .limit(30),
    ),
    taskIds = links.flatMap((l) => (l.task_id ? [l.task_id] : [])),
    milestoneIds = links.flatMap((l) =>
      l.milestone_id ? [l.milestone_id] : [],
    );
  const [tasks, milestones, memory] = await Promise.all([
    taskIds.length
      ? db
          .from("tasks")
          .select("id,title,status")
          .eq("organization_id", org)
          .in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    milestoneIds.length
      ? db
          .from("milestones")
          .select("id,title,status,archived_at")
          .eq("organization_id", org)
          .in("id", milestoneIds)
      : Promise.resolve({ data: [], error: null }),
    findCompanyMemoryCreation("core.note:" + id),
  ]);
  return {
    note: result.data,
    tasks: checked(tasks),
    milestones: checked(milestones),
    memory: memory
      ? { id: memory.id, title: memory.title, archived_at: memory.archived_at }
      : null,
  };
}
