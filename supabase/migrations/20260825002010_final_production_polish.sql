-- Final production polish: owner-controlled tenant deletion and tenant-qualified board presence.

create or replace function public.delete_owned_organization(
  p_organization_id uuid,
  p_confirmation_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_name text;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select organization_record.name
  into v_name
  from public.organizations as organization_record
  where organization_record.id = p_organization_id
  for update;

  if v_name is null then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;
  if p_confirmation_name is distinct from v_name then
    raise exception 'confirmation does not match' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.memberships as membership_record
    where membership_record.organization_id = p_organization_id
      and membership_record.user_id = v_actor_id
      and membership_record.role = 'OWNER'
      and membership_record.removed_at is null
  ) then
    raise exception 'owner permission required' using errcode = '42501';
  end if;

  delete from public.organizations as organization_record
  where organization_record.id = p_organization_id;
end;
$$;

revoke all on function public.delete_owned_organization(uuid, text)
from public, anon;
grant execute on function public.delete_owned_organization(uuid, text)
to authenticated;

drop policy if exists board_presence_read_for_members on realtime.messages;
drop policy if exists board_presence_write_for_members on realtime.messages;

create policy board_presence_read_for_members
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.boards as board_record
    where (
      'board:' || board_record.organization_id::text || ':' || board_record.id::text
    ) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);

create policy board_presence_write_for_members
on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and realtime.messages.payload ->> 'userId' = (select auth.uid())::text
  and exists (
    select 1 from public.boards as board_record
    where (
      'board:' || board_record.organization_id::text || ':' || board_record.id::text
    ) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);
