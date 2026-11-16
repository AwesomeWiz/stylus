-- Resolution is reversible discussion state; no existing content is rewritten.
alter table public.board_comments add column resolved_at timestamptz;
alter table public.board_comments add column resolved_by uuid;
alter table public.board_comments add constraint board_comments_resolution_pair check ((resolved_at is null) = (resolved_by is null));
alter table public.board_comments add constraint board_comments_resolver_membership_fkey
  foreign key (organization_id,resolved_by) references public.memberships(organization_id,user_id);
create index board_comments_open_element_idx on public.board_comments(board_id,element_id)
  where archived_at is null and resolved_at is null and parent_id is null;

create function public.set_board_comment_resolution(p_board_id uuid,p_comment_id uuid,p_resolved boolean)
returns public.board_comments language plpgsql security definer set search_path = '' as $$
declare target public.boards; result public.board_comments; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_resolved is null then raise exception 'Choose resolution state' using errcode = '22023'; end if;
  select * into target from public.boards where id=p_board_id and archived_at is null for update;
  if target.id is null or not exists (select 1 from public.memberships m where m.organization_id=target.organization_id and m.user_id=actor and m.removed_at is null and m.role in ('OWNER','ADMIN','MEMBER')) then
    raise exception 'Board unavailable' using errcode = '42501';
  end if;
  update public.board_comments c set resolved_at=case when p_resolved then coalesce(c.resolved_at,now()) else null end,
    resolved_by=case when p_resolved then coalesce(c.resolved_by,actor) else null end
    where c.id=p_comment_id and c.board_id=target.id and c.organization_id=target.organization_id and c.parent_id is null and c.archived_at is null
    returning c.* into result;
  if result.id is null then raise exception 'Thread unavailable' using errcode = '42501'; end if;
  return result;
end;
$$;
revoke all on function public.set_board_comment_resolution(uuid,uuid,boolean) from public,anon;
grant execute on function public.set_board_comment_resolution(uuid,uuid,boolean) to authenticated;

create function public.read_board_comment_counts(p_board_id uuid,p_element_ids uuid[])
returns table(element_id uuid,total integer) language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.boards b where b.id=p_board_id and b.archived_at is null and private.is_organization_member(b.organization_id)) then
    raise exception 'Board unavailable' using errcode = '42501';
  end if;
  if p_element_ids is null or cardinality(p_element_ids)>200 then raise exception 'Choose up to 200 objects' using errcode = '22023'; end if;
  return query select c.element_id,count(*)::integer from public.board_comments c
    join public.board_elements e on (e.organization_id,e.board_id,e.id)=(c.organization_id,c.board_id,c.element_id)
    where c.board_id=p_board_id and c.element_id=any(p_element_ids) and c.parent_id is null and c.archived_at is null and c.resolved_at is null and e.archived_at is null
    group by c.element_id;
end;
$$;
revoke all on function public.read_board_comment_counts(uuid,uuid[]) from public,anon;
grant execute on function public.read_board_comment_counts(uuid,uuid[]) to authenticated;
