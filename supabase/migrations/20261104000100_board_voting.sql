-- Additive structured voting. No existing Board records or schemas are rewritten.
create table public.board_voting_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  board_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ENDED')),
  allowance integer not null check (allowance between 1 and 5),
  eligible_types text[] not null check (
    cardinality(eligible_types) between 1 and 5
    and array_position(eligible_types,null) is null
    and eligible_types <@ array['TEXT','STICKY','IMAGE','SHAPE','GROUP']::text[]
  ),
  started_by uuid references auth.users(id) on delete set null,
  ended_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  ended_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  unique (organization_id,board_id,id),
  foreign key (organization_id,board_id) references public.boards(organization_id,id) on delete cascade,
  check ((status='ACTIVE' and ended_at is null and ended_by is null) or (status='ENDED' and ended_at is not null))
);
create unique index board_voting_one_active on public.board_voting_sessions(board_id) where status='ACTIVE';
create index board_voting_latest on public.board_voting_sessions(board_id,created_at desc,id desc);

-- Fixed slots bound every participant's allocation. Inactive rows preserve a
-- version tombstone; a delayed retry cannot overwrite a reused slot.
create table public.board_votes (
  organization_id uuid not null,
  board_id uuid not null,
  session_id uuid not null,
  voter_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check (slot between 1 and 5),
  element_id uuid not null,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  request_id uuid not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (session_id,voter_id,slot),
  foreign key (organization_id,board_id,session_id) references public.board_voting_sessions(organization_id,board_id,id) on delete cascade,
  foreign key (organization_id,board_id,element_id) references public.board_elements(organization_id,board_id,id) on delete cascade
);
create index board_votes_totals on public.board_votes(session_id,element_id,voter_id) where active;
alter table public.board_voting_sessions enable row level security;
alter table public.board_votes enable row level security;
revoke all on public.board_voting_sessions,public.board_votes from public,anon,authenticated;
grant select on public.board_voting_sessions,public.board_votes to authenticated;
create policy board_voting_sessions_read on public.board_voting_sessions for select to authenticated using (
  private.is_organization_member(organization_id) and exists (
    select 1 from public.boards b where b.id=board_id and b.organization_id=board_voting_sessions.organization_id and b.archived_at is null
  )
);
create policy board_votes_read on public.board_votes for select to authenticated using (
  private.is_organization_member(organization_id) and exists (
    select 1 from public.boards b where b.id=board_id and b.organization_id=board_votes.organization_id and b.archived_at is null
  )
);

create function public.start_board_voting(p_board_id uuid,p_allowance integer,p_eligible_types text[])
returns public.board_voting_sessions language plpgsql security definer set search_path='' as $$
declare target public.boards; result public.board_voting_sessions; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Board unavailable' using errcode='42501'; end if;
  select * into target from public.boards where id=p_board_id and archived_at is null for update;
  if target.id is null or not exists(select 1 from public.memberships m where m.organization_id=target.organization_id and m.user_id=actor and m.removed_at is null and m.role in ('OWNER','ADMIN','MEMBER')) then
    raise exception 'Board unavailable' using errcode='42501';
  end if;
  if p_allowance is null or p_allowance not between 1 and 5 or p_eligible_types is null
    or cardinality(p_eligible_types) not between 1 and 5 or array_position(p_eligible_types,null) is not null
    or not (p_eligible_types <@ array['TEXT','STICKY','IMAGE','SHAPE','GROUP']::text[])
    or cardinality(p_eligible_types)<>(select count(distinct x) from unnest(p_eligible_types) x) then
    raise exception 'Invalid voting configuration' using errcode='22023';
  end if;
  if exists(select 1 from public.board_voting_sessions where board_id=target.id and status='ACTIVE') then
    raise exception 'Voting already in progress' using errcode='23505';
  end if;
  insert into public.board_voting_sessions(organization_id,board_id,allowance,eligible_types,started_by)
    values(target.organization_id,target.id,p_allowance,p_eligible_types,actor) returning * into result;
  return result;
end;
$$;

create function public.set_board_vote(p_session_id uuid,p_element_id uuid,p_slot integer,p_active boolean,p_request_id uuid,p_expected_version integer)
returns public.board_votes language plpgsql security definer set search_path='' as $$
declare session public.board_voting_sessions; target public.boards; previous public.board_votes; result public.board_votes; actor uuid:=auth.uid(); target_board uuid;
begin
  if actor is null then raise exception 'Board unavailable' using errcode='42501'; end if;
  select board_id into target_board from public.board_voting_sessions where id=p_session_id;
  select * into target from public.boards where id=target_board and archived_at is null for update;
  if target.id is null or not exists(select 1 from public.memberships m where m.organization_id=target.organization_id and m.user_id=actor and m.removed_at is null and m.role in ('OWNER','ADMIN','MEMBER')) then
    raise exception 'Board unavailable' using errcode='42501';
  end if;
  select * into session from public.board_voting_sessions where id=p_session_id and board_id=target.id and organization_id=target.organization_id for update;
  if session.id is null or session.status<>'ACTIVE' then raise exception 'Voting has ended' using errcode='55000'; end if;
  if p_slot is null or p_slot not between 1 and session.allowance or p_active is null or p_request_id is null or p_expected_version is null or p_expected_version<0 then
    raise exception 'Invalid vote slot' using errcode='22023';
  end if;
  select * into previous from public.board_votes where session_id=session.id and voter_id=actor and slot=p_slot for update;
  if previous.request_id=p_request_id then return previous; end if;
  if coalesce(previous.version,0)<>p_expected_version then raise exception 'Vote changed; refresh' using errcode='40001'; end if;
  if p_active then
    if previous.active and previous.element_id<>p_element_id then raise exception 'Vote slot is occupied' using errcode='23505'; end if;
    if not exists (
      select 1 from public.board_elements e where e.id=p_element_id and e.board_id=target.id and e.organization_id=target.organization_id
      and e.archived_at is null and e.element_type::text=any(session.eligible_types) and not e.locked
      and not exists(with recursive owners as (
        select p.id,p.parent_id,p.locked from public.board_elements p where p.id=e.parent_id and p.board_id=e.board_id and p.organization_id=e.organization_id
        union all select p.id,p.parent_id,p.locked from public.board_elements p join owners o on p.id=o.parent_id where p.board_id=e.board_id and p.organization_id=e.organization_id
      ) select 1 from owners where locked)
    ) then raise exception 'Object is not eligible' using errcode='22023'; end if;
  elsif previous.session_id is null or previous.element_id<>p_element_id then
    raise exception 'No own vote to remove' using errcode='22023';
  end if;
  insert into public.board_votes(organization_id,board_id,session_id,voter_id,slot,element_id,active,request_id,version)
    values(target.organization_id,target.id,session.id,actor,p_slot,p_element_id,p_active,p_request_id,coalesce(previous.version,0)+1)
    on conflict(session_id,voter_id,slot) do update set element_id=excluded.element_id,active=excluded.active,request_id=excluded.request_id,version=excluded.version,updated_at=clock_timestamp()
    returning * into result;
  update public.board_voting_sessions set revision=revision+1,updated_at=clock_timestamp() where id=session.id;
  return result;
end;
$$;

create function public.end_board_voting(p_session_id uuid)
returns public.board_voting_sessions language plpgsql security definer set search_path='' as $$
declare session public.board_voting_sessions; target public.boards; actor uuid:=auth.uid(); target_board uuid;
begin
  if actor is null then raise exception 'Board unavailable' using errcode='42501'; end if;
  select board_id into target_board from public.board_voting_sessions where id=p_session_id;
  select * into target from public.boards where id=target_board and archived_at is null for update;
  select * into session from public.board_voting_sessions where id=p_session_id and board_id=target.id and organization_id=target.organization_id for update;
  if target.id is null or session.id is null or not exists (
    select 1 from public.memberships m where m.organization_id=target.organization_id and m.user_id=actor and m.removed_at is null
    and (m.role in ('OWNER','ADMIN') or (m.role='MEMBER' and session.started_by=actor))
  ) then raise exception 'Board unavailable' using errcode='42501'; end if;
  if session.status='ENDED' then return session; end if;
  update public.board_voting_sessions set status='ENDED',ended_at=clock_timestamp(),ended_by=actor,updated_at=clock_timestamp(),revision=revision+1 where id=session.id returning * into session;
  return session;
end;
$$;

-- A single aggregate statement supplies one consistent snapshot. Own slots are
-- bounded by five; object projection by 200, result page by 100, identities by 20.
create function public.read_board_voting(p_board_id uuid,p_element_ids uuid[],p_after_total integer default null,p_after_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.boards b where b.id=p_board_id and b.archived_at is null and private.is_organization_member(b.organization_id)) then
    raise exception 'Board unavailable' using errcode='42501';
  end if;
  if p_element_ids is null or cardinality(p_element_ids)>200 or (p_after_total is null)<>(p_after_id is null) or p_after_total<1 then
    raise exception 'Invalid voting projection' using errcode='22023';
  end if;
  with current_session as materialized (
    select * from public.board_voting_sessions where board_id=p_board_id order by (status='ACTIVE') desc,created_at desc,id desc limit 1
  ), own as (
    select v.* from public.board_votes v join current_session s on s.id=v.session_id where v.voter_id=auth.uid()
  ), people as materialized (
    select v.element_id,v.voter_id,count(*)::integer as votes from public.board_votes v join current_session s on s.id=v.session_id where v.active group by v.element_id,v.voter_id
  ), totals as materialized (
    select element_id,sum(votes)::integer as total,coalesce(sum(votes) filter(where voter_id=auth.uid()),0)::integer as mine,
      (array_agg(voter_id order by voter_id))[1:20] as participants from people group by element_id
  ), ranked as (
    select *,dense_rank() over(order by total desc)::integer as rank from totals
  ), page as (
    select * from ranked where p_after_total is null or total<p_after_total or (total=p_after_total and element_id>p_after_id)
    order by total desc,element_id limit 101
  ) select jsonb_build_object(
    'session',(select to_jsonb(s) from current_session s),
    'own_votes',coalesce((select jsonb_agg(to_jsonb(o) order by slot) from own o),'[]'::jsonb),
    'summaries',coalesce((select jsonb_agg(to_jsonb(t) order by element_id) from totals t where element_id=any(p_element_ids)),'[]'::jsonb),
    'results',coalesce((select jsonb_agg(to_jsonb(p) order by total desc,element_id) from (select * from page order by total desc,element_id limit 100) p),'[]'::jsonb),
    'has_more',(select count(*)>100 from page)
  ) into result;
  return result;
end;
$$;
revoke all on function public.start_board_voting(uuid,integer,text[]) from public,anon;
revoke all on function public.set_board_vote(uuid,uuid,integer,boolean,uuid,integer) from public,anon;
revoke all on function public.end_board_voting(uuid) from public,anon;
revoke all on function public.read_board_voting(uuid,uuid[],integer,uuid) from public,anon;
grant execute on function public.start_board_voting(uuid,integer,text[]) to authenticated;
grant execute on function public.set_board_vote(uuid,uuid,integer,boolean,uuid,integer) to authenticated;
grant execute on function public.end_board_voting(uuid) to authenticated;
grant execute on function public.read_board_voting(uuid,uuid[],integer,uuid) to authenticated;
-- Every accepted allocation changes the session revision. The existing private
-- Board channel observes this small row and re-reads permission-filtered counts.
alter publication supabase_realtime add table public.board_voting_sessions;
