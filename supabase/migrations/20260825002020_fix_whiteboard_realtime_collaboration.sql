-- Correct private Whiteboard Realtime authorization for slow Presence state
-- and high-frequency Broadcast cursor events. Realtime evaluates these policies
-- when the client joins the channel, before an individual track/send payload
-- exists, and caches the result for the connection.

drop policy if exists board_presence_read_for_members on realtime.messages;
drop policy if exists board_presence_write_for_members on realtime.messages;
drop policy if exists board_collaboration_read_for_members on realtime.messages;
drop policy if exists board_collaboration_write_for_members on realtime.messages;

create policy board_collaboration_read_for_members
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension in ('presence', 'broadcast')
  and exists (
    select 1 from public.boards as board_record
    where (
      'board:' || board_record.organization_id::text || ':' || board_record.id::text
    ) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);

create policy board_collaboration_write_for_members
on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension in ('presence', 'broadcast')
  and exists (
    select 1 from public.boards as board_record
    where (
      'board:' || board_record.organization_id::text || ':' || board_record.id::text
    ) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);
