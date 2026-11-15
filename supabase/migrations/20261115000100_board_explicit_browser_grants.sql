-- Forward-only security correction: platform default table grants otherwise
-- override the foundation's intended column grants. No records, constraints,
-- RLS policies or RPC contracts change; service-role access is preserved.
begin;

revoke all privileges on table public.boards, public.board_elements
  from public, anon, authenticated;

grant select on public.boards, public.board_elements to authenticated;
grant insert (title, organization_id, template_key, created_by, updated_by)
  on public.boards to authenticated;
grant update (title, updated_by, archived_at)
  on public.boards to authenticated;

-- Stable client-generated IDs are required by the existing idempotent upload
-- action. They are insert-only; provenance/type/tenant identity stay immutable.
grant insert (
  id, board_id, organization_id, element_type, x, y, width, height, rotation,
  z_index, content, style, metadata, parent_id, locked, created_by, updated_by
) on public.board_elements to authenticated;
grant update (
  x, y, width, height, rotation, z_index, content, style, metadata, parent_id,
  locked, updated_by, archived_at
) on public.board_elements to authenticated;

commit;
