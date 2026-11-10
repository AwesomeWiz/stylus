import { NotesWorkspace } from "@/components/execution/notes-workspace";
import { getWorkspaceContext } from "@/modules/onboarding/server/workspace";
import { getNotes, getNote } from "@/modules/execution/server/data";
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getWorkspaceContext(),
    params = Object.fromEntries(
      Object.entries(await searchParams).flatMap(([k, v]) =>
        typeof v === "string" ? [[k, v]] : [],
      ),
    );
  const [page, selected] = await Promise.all([
    getNotes(params),
    params.note ? getNote(params.note) : Promise.resolve(null),
  ]);
  return (
    <NotesWorkspace
      key={`${context.organization.id}:${context.user.id}:${context.membership.role}`}
      page={page}
      selected={selected}
      selectedId={params.note}
      canEdit={context.membership.role !== "VIEWER"}
    />
  );
}

export const metadata = { title: "Notes" };
