-- Social feedback only. Existing board objects/history are preserved.
create table public.board_reactions (
  organization_id uuid not null,
  board_id uuid not null,
  element_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','heart','fire','eyes','celebrate')),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (organization_id, board_id, element_id, user_id, reaction),
  foreign key (organization_id, board_id, element_id)
    references public.board_elements(organization_id, board_id, id) on delete cascade
);
create index board_reactions_active_idx on public.board_reactions(board_id, element_id) where active;
alter table public.board_reactions enable row level security;
revoke all on public.board_reactions from anon, authenticated;
grant select on public.board_reactions to authenticated;
create policy board_reactions_read on public.board_reactions for select to authenticated using (
  private.is_organization_member(organization_id)
  and exists (select 1 from public.boards b where b.id = board_reactions.board_id and b.organization_id = board_reactions.organization_id and b.archived_at is null)
  and exists (select 1 from public.board_elements e where e.id = board_reactions.element_id and e.board_id = board_reactions.board_id and e.organization_id = board_reactions.organization_id and e.archived_at is null)
);

create function public.set_board_reaction(p_board_id uuid, p_element_id uuid, p_reaction text, p_active boolean)
returns public.board_reactions language plpgsql security definer set search_path = '' as $$
declare target public.boards; result public.board_reactions; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_reaction is null or p_reaction not in ('like','heart','fire','eyes','celebrate') or p_active is null then
    raise exception 'Invalid reaction' using errcode = '22023';
  end if;
  select * into target from public.boards where id = p_board_id and archived_at is null for update;
  if target.id is null or not exists (
    select 1 from public.memberships m where m.organization_id = target.organization_id and m.user_id = actor
    and m.removed_at is null and m.role in ('OWNER','ADMIN','MEMBER')
  ) then raise exception 'Board unavailable' using errcode = '42501'; end if;
  if not exists (select 1 from public.board_elements e where e.id = p_element_id and e.board_id = target.id and e.organization_id = target.organization_id and e.archived_at is null) then
    raise exception 'Object unavailable' using errcode = '42501';
  end if;
  insert into public.board_reactions(organization_id,board_id,element_id,user_id,reaction,active)
    values(target.organization_id,target.id,p_element_id,actor,p_reaction,p_active)
    on conflict (organization_id,board_id,element_id,user_id,reaction)
    do update set active = excluded.active, updated_at = now()
    returning * into result;
  return result;
end;
$$;
revoke all on function public.set_board_reaction(uuid,uuid,text,boolean) from public, anon;
grant execute on function public.set_board_reaction(uuid,uuid,text,boolean) to authenticated;

create function public.read_board_reactions(p_board_id uuid, p_element_ids uuid[])
returns table(element_id uuid,reaction text,total integer,mine boolean,participants uuid[])
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.boards b where b.id=p_board_id and b.archived_at is null
      and private.is_organization_member(b.organization_id)
  ) then raise exception 'Board unavailable' using errcode = '42501'; end if;
  if p_element_ids is null or cardinality(p_element_ids) > 200 then raise exception 'Choose up to 200 objects' using errcode = '22023'; end if;
  return query select r.element_id,r.reaction,count(*)::integer,bool_or(r.user_id=auth.uid()),(array_agg(r.user_id order by r.user_id))[1:20]
    from public.board_reactions r where r.board_id=p_board_id and r.element_id=any(p_element_ids) and r.active
    group by r.element_id,r.reaction;
end;
$$;
revoke all on function public.read_board_reactions(uuid,uuid[]) from public, anon;
grant execute on function public.read_board_reactions(uuid,uuid[]) to authenticated;
alter publication supabase_realtime add table public.board_reactions;
