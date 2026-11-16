-- A stale application version is a final HTTP 409 conflict, not a PostgreSQL
-- serialization failure. Avoid PostgREST transaction retry loops.
-- Forward-only replacement: no records, schema, privileges or authorization change.
begin;
create or replace function public.set_board_vote(p_session_id uuid,p_element_id uuid,p_slot integer,p_active boolean,p_request_id uuid,p_expected_version integer)
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
  if coalesce(previous.version,0)<>p_expected_version then raise exception 'Vote changed; refresh' using errcode='PT409'; end if;
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


commit;
