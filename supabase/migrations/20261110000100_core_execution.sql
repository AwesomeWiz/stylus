-- Core working material and delivery relationships. No AI or automatic Memory.
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check(length(btrim(title)) between 2 and 160),
  description text not null default '' check(length(description)<=4000),
  target_date date, status text not null default 'PLANNED' check(status in('PLANNED','ACTIVE','COMPLETE')),
  owner_id uuid, created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  archived_at timestamptz, unique(organization_id,id),
  foreign key(organization_id,owner_id) references public.memberships(organization_id,user_id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,updated_by) references public.memberships(organization_id,user_id)
);
create index milestones_attention_idx on public.milestones(organization_id,target_date,id) where archived_at is null;
alter table public.tasks add column milestone_id uuid;
alter table public.tasks add constraint tasks_milestone_tenant_fk foreign key(organization_id,milestone_id) references public.milestones(organization_id,id);
create index tasks_milestone_idx on public.tasks(organization_id,milestone_id,status) where milestone_id is not null;
grant select(milestone_id) on public.tasks to authenticated;
-- Ordinary task writes cannot assign an unchecked foreign/archived checkpoint.
create function private.validate_task_milestone() returns trigger language plpgsql set search_path='' as $$
begin
  if new.milestone_id is not null and (tg_op='INSERT' or new.milestone_id is distinct from old.milestone_id) and not exists(
    select 1 from public.milestones where organization_id=new.organization_id and id=new.milestone_id and archived_at is null
  ) then raise exception 'Milestone unavailable' using errcode='42501';end if;
  return new;
end$$;
create trigger tasks_milestone_guard before insert or update of milestone_id on public.tasks for each row execute function private.validate_task_milestone();
revoke all on function private.validate_task_milestone() from public,anon,authenticated;

create table public.task_dependencies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null, blocked_by_id uuid not null, created_by uuid not null, created_at timestamptz not null default clock_timestamp(),
  primary key(organization_id,task_id,blocked_by_id), check(task_id<>blocked_by_id),
  foreign key(organization_id,task_id) references public.tasks(organization_id,id) on delete cascade,
  foreign key(organization_id,blocked_by_id) references public.tasks(organization_id,id) on delete cascade,
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id)
);
create index task_dependencies_reverse_idx on public.task_dependencies(organization_id,blocked_by_id,task_id);
create table public.notes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check(length(btrim(title)) between 2 and 160), content text not null default '' check(length(content)<=40000),
  created_by uuid not null,updated_by uuid not null, created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),archived_at timestamptz, unique(organization_id,id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,updated_by) references public.memberships(organization_id,user_id)
);
create index notes_recent_idx on public.notes(organization_id,updated_at desc,id desc);
create table public.note_links (
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
  note_id uuid not null,task_id uuid,milestone_id uuid,created_by uuid not null,created_at timestamptz not null default clock_timestamp(),
  check(num_nonnulls(task_id,milestone_id)=1),
  foreign key(organization_id,note_id) references public.notes(organization_id,id) on delete cascade,
  foreign key(organization_id,task_id) references public.tasks(organization_id,id) on delete cascade,
  foreign key(organization_id,milestone_id) references public.milestones(organization_id,id) on delete cascade,
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  unique(note_id,task_id),unique(note_id,milestone_id)
);
create index note_links_task_idx on public.note_links(organization_id,task_id);
create index note_links_milestone_idx on public.note_links(organization_id,milestone_id);
alter table public.milestones enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.notes enable row level security;
alter table public.note_links enable row level security;
create policy milestones_read on public.milestones for select to authenticated using(private.is_organization_member(organization_id));
create policy task_dependencies_read on public.task_dependencies for select to authenticated using(private.is_organization_member(organization_id));
create policy notes_read on public.notes for select to authenticated using(private.is_organization_member(organization_id));
create policy note_links_read on public.note_links for select to authenticated using(private.is_organization_member(organization_id));
revoke all on public.milestones,public.task_dependencies,public.notes,public.note_links from public,anon,authenticated;
grant select on public.milestones,public.task_dependencies,public.notes,public.note_links to authenticated;

create function private.require_execution_editor(p_org uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_organization_role(p_org,array['OWNER','ADMIN','MEMBER']::public.organization_role[]) then raise exception 'Work unavailable' using errcode='42501';end if;
  return auth.uid();
end$$;
revoke all on function private.require_execution_editor(uuid) from public,anon,authenticated;
create function public.save_milestone(p_organization_id uuid,p_id uuid,p_title text,p_description text,p_target_date date,p_status text,p_owner_id uuid,p_archived boolean,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);old public.milestones;begin
  if p_id is null or p_title is null or p_description is null or p_status is null or p_archived is null then raise exception 'Invalid milestone' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into old from public.milestones where id=p_id and organization_id=p_organization_id for update;
  if old.id is not null and old.updated_at is distinct from p_expected_updated_at then raise exception 'Work changed; reload' using errcode='PT409';end if;
  if old.id is null and (p_expected_updated_at is not null or exists(select 1 from public.milestones where id=p_id)) then raise exception 'Work unavailable' using errcode='42501';end if;
  if p_owner_id is not null and not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=p_owner_id and removed_at is null) then raise exception 'Owner unavailable' using errcode='42501';end if;
  insert into public.milestones(id,organization_id,title,description,target_date,status,owner_id,created_by,updated_by,archived_at)
  values(p_id,p_organization_id,btrim(p_title),p_description,p_target_date,p_status,p_owner_id,actor,actor,case when p_archived then clock_timestamp() end)
  on conflict(id) do update set title=excluded.title,description=excluded.description,target_date=excluded.target_date,status=excluded.status,owner_id=excluded.owner_id,updated_by=actor,updated_at=clock_timestamp(),archived_at=case when p_archived then coalesce(old.archived_at,clock_timestamp()) end;
  return p_id;
end$$;
create function public.set_task_milestone(p_organization_id uuid,p_task_id uuid,p_milestone_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);begin
  if p_milestone_id is not null and not exists(select 1 from public.milestones where organization_id=p_organization_id and id=p_milestone_id and archived_at is null) then raise exception 'Milestone unavailable' using errcode='42501';end if;
  update public.tasks set milestone_id=p_milestone_id,updated_by=actor where organization_id=p_organization_id and id=p_task_id;
  if not found then raise exception 'Task unavailable' using errcode='42501';end if;
end$$;
create function public.set_task_dependency(p_organization_id uuid,p_task_id uuid,p_blocked_by_id uuid,p_link boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);begin
  perform pg_advisory_xact_lock(hashtextextended('task-dependencies:'||p_organization_id::text,0));
  if p_link is null or p_task_id is null or p_blocked_by_id is null or p_task_id=p_blocked_by_id then raise exception 'Invalid prerequisite' using errcode='22023';end if;
  if (select count(*) from public.tasks where organization_id=p_organization_id and id in(p_task_id,p_blocked_by_id))<>2 then raise exception 'Task unavailable' using errcode='42501';end if;
  if not p_link then delete from public.task_dependencies where organization_id=p_organization_id and task_id=p_task_id and blocked_by_id=p_blocked_by_id;return;end if;
  if exists(select 1 from public.task_dependencies where organization_id=p_organization_id and task_id=p_task_id and blocked_by_id=p_blocked_by_id) then raise exception 'Prerequisite already linked' using errcode='23505';end if;
  if (select count(*) from public.task_dependencies where organization_id=p_organization_id and task_id=p_task_id)>=50 or (select count(*) from public.task_dependencies where organization_id=p_organization_id and blocked_by_id=p_blocked_by_id)>=50 then raise exception 'At most 50 related tasks per direction' using errcode='22023';end if;
  if exists(with recursive reachable(id) as (
    select p_blocked_by_id union select edge.blocked_by_id from public.task_dependencies edge join reachable on edge.task_id=reachable.id where edge.organization_id=p_organization_id
  ) select 1 from reachable where id=p_task_id) then raise exception 'Prerequisite creates a cycle' using errcode='22023';end if;
  insert into public.task_dependencies(organization_id,task_id,blocked_by_id,created_by) values(p_organization_id,p_task_id,p_blocked_by_id,actor);
end$$;
create function public.task_execution_summaries(p_organization_id uuid,p_ids uuid[])
returns table(task_id uuid,blocked_count integer,milestone_id uuid,milestone_title text,milestone_archived boolean)
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_organization_member(p_organization_id) then raise exception 'Work unavailable' using errcode='42501';end if;
  if p_ids is null or cardinality(p_ids)>1000 then raise exception 'Bounded task IDs required' using errcode='22023';end if;
  return query select t.id,(select count(*)::integer from public.task_dependencies d join public.tasks prerequisite on prerequisite.organization_id=d.organization_id and prerequisite.id=d.blocked_by_id where d.organization_id=p_organization_id and d.task_id=t.id and prerequisite.status<>'COMPLETED'),m.id,m.title,m.archived_at is not null
  from public.tasks t left join public.milestones m on m.organization_id=t.organization_id and m.id=t.milestone_id where t.organization_id=p_organization_id and t.id=any(p_ids);
end$$;
create function public.milestone_progress(p_organization_id uuid,p_ids uuid[])
returns table(id uuid,completed_count integer,total_count integer)
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_organization_member(p_organization_id) then raise exception 'Work unavailable' using errcode='42501';end if;
  if p_ids is null or cardinality(p_ids)>100 then raise exception 'Bounded milestone IDs required' using errcode='22023';end if;
  return query select m.id,count(t.id) filter(where t.status='COMPLETED')::integer,count(t.id) filter(where t.status<>'CANCELLED')::integer
  from public.milestones m left join public.tasks t on t.organization_id=m.organization_id and t.milestone_id=m.id where m.organization_id=p_organization_id and m.id=any(p_ids) group by m.id;
end$$;
create function public.save_core_note(p_organization_id uuid,p_id uuid,p_title text,p_content text,p_archived boolean,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);old public.notes;begin
  if p_id is null or p_title is null or p_content is null or p_archived is null then raise exception 'Invalid note' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into old from public.notes where organization_id=p_organization_id and id=p_id for update;
  if old.id is not null and old.updated_at is distinct from p_expected_updated_at then raise exception 'Note changed; reload' using errcode='PT409';end if;
  if old.id is null and (p_expected_updated_at is not null or exists(select 1 from public.notes where id=p_id)) then raise exception 'Note unavailable' using errcode='42501';end if;
  insert into public.notes(id,organization_id,title,content,created_by,updated_by,archived_at)
  values(p_id,p_organization_id,btrim(p_title),p_content,actor,actor,case when p_archived then clock_timestamp() end)
  on conflict(id) do update set title=excluded.title,content=excluded.content,updated_by=actor,updated_at=clock_timestamp(),archived_at=case when p_archived then coalesce(old.archived_at,clock_timestamp()) end;
  return p_id;
end$$;
create function public.set_core_note_link(p_organization_id uuid,p_note_id uuid,p_kind text,p_target_id uuid,p_link boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);begin
  perform 1 from public.notes where organization_id=p_organization_id and id=p_note_id and archived_at is null for update;
  if not found or p_kind is null or p_kind not in('task','milestone') or p_link is null or p_target_id is null then raise exception 'Note or link unavailable' using errcode='42501';end if;
  if p_kind='task' and not exists(select 1 from public.tasks where organization_id=p_organization_id and id=p_target_id) or p_kind='milestone' and not exists(select 1 from public.milestones where organization_id=p_organization_id and id=p_target_id and (not p_link or archived_at is null)) then raise exception 'Target unavailable' using errcode='42501';end if;
  if not p_link then delete from public.note_links where organization_id=p_organization_id and note_id=p_note_id and (task_id=p_target_id or milestone_id=p_target_id);return;end if;
  if exists(select 1 from public.note_links where note_id=p_note_id and (task_id=p_target_id or milestone_id=p_target_id)) then return;end if;
  if (select count(*) from public.note_links where note_id=p_note_id)>=30 then raise exception 'At most 30 links' using errcode='22023';end if;
  insert into public.note_links(organization_id,note_id,task_id,milestone_id,created_by) values(p_organization_id,p_note_id,case when p_kind='task' then p_target_id end,case when p_kind='milestone' then p_target_id end,actor);
end$$;
create function public.promote_core_note(p_organization_id uuid,p_note_id uuid,p_kind public.memory_kind,p_title text,p_content text,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_execution_editor(p_organization_id);note public.notes;memory_id uuid;begin
  select * into note from public.notes where organization_id=p_organization_id and id=p_note_id and archived_at is null for update;
  if note.id is null then raise exception 'Note unavailable' using errcode='42501';end if;
  if note.updated_at is distinct from p_expected_updated_at then raise exception 'Note changed; review before promotion' using errcode='PT409';end if;
  select id into memory_id from public.create_company_memory_once(p_organization_id,'core.note:'||note.id::text,p_kind,p_title,p_content,'Note '||note.id::text||'; reviewed revision '||note.updated_at::text);
  return memory_id;
end$$;
revoke all on function public.save_milestone(uuid,uuid,text,text,date,text,uuid,boolean,timestamptz),public.set_task_milestone(uuid,uuid,uuid),public.set_task_dependency(uuid,uuid,uuid,boolean),public.task_execution_summaries(uuid,uuid[]),public.milestone_progress(uuid,uuid[]),public.save_core_note(uuid,uuid,text,text,boolean,timestamptz),public.set_core_note_link(uuid,uuid,text,uuid,boolean),public.promote_core_note(uuid,uuid,public.memory_kind,text,text,timestamptz) from public,anon;
grant execute on function public.save_milestone(uuid,uuid,text,text,date,text,uuid,boolean,timestamptz),public.set_task_milestone(uuid,uuid,uuid),public.set_task_dependency(uuid,uuid,uuid,boolean),public.task_execution_summaries(uuid,uuid[]),public.milestone_progress(uuid,uuid[]),public.save_core_note(uuid,uuid,text,text,boolean,timestamptz),public.set_core_note_link(uuid,uuid,text,uuid,boolean),public.promote_core_note(uuid,uuid,public.memory_kind,text,text,timestamptz) to authenticated;

create function public.daily_core_attention(p_organization_id uuid,p_now timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
  if not private.is_organization_member(p_organization_id) then raise exception 'Work unavailable' using errcode='42501';end if;
  if p_now is null then raise exception 'Reference time required' using errcode='22023';end if;
  with active as (
    select t.id,t.title,t.assignee_id,t.due_at,t.priority,exists(select 1 from public.task_dependencies d join public.tasks prerequisite on prerequisite.organization_id=d.organization_id and prerequisite.id=d.blocked_by_id where d.organization_id=p_organization_id and d.task_id=t.id and prerequisite.status<>'COMPLETED') blocked
    from public.tasks t where t.organization_id=p_organization_id and t.status in('TODO','IN_PROGRESS')
  ),personal as (
    select * from active where assignee_id=auth.uid() order by blocked desc,due_at nulls last,id limit 6
  ),team as (
    select * from active where assignee_id is distinct from auth.uid() and (due_at<=p_now+interval '48 hours' or blocked and priority in('HIGH','URGENT')) order by blocked desc,due_at nulls last,id limit 6
  ),task_rows as (
    select *, 'personal'::text scope from personal union all select *,'team'::text from team
  ),checkpoints as (
    select m.id,m.title,m.target_date,m.owner_id from public.milestones m where m.organization_id=p_organization_id and m.archived_at is null and m.status<>'COMPLETE' and m.target_date<=p_now::date+7 order by m.target_date,m.id limit 6
  ),items as (
    select jsonb_build_object('id','task:'||t.id,'kind','task','title',t.title,'href','/tasks?view=all&task='||t.id,'scope',t.scope,'reason',case when t.blocked then 'Blocked by unfinished work' when t.due_at<=p_now then 'Overdue' when t.due_at<=p_now+interval '48 hours' then 'Due within 48 hours' else 'Assigned to you' end,'timestamp',t.due_at,'ownerId',t.assignee_id,'rank',case when t.blocked then 0 when t.due_at<=p_now then 1 else 3 end) value from task_rows t
    union all select jsonb_build_object('id','milestone:'||m.id,'kind','milestone','title',m.title,'href','/tasks?milestones=1&milestone='||m.id,'scope',case when m.owner_id=auth.uid() then 'personal' else 'team' end,'reason',case when m.target_date<p_now::date then 'Milestone target passed' else 'Milestone target approaching' end,'timestamp',m.target_date,'ownerId',m.owner_id,'rank',2) from checkpoints m
  )select coalesce(jsonb_agg(value order by (value->>'rank')::integer,value->>'id'),'[]') into result from items;
  return result;
end$$;
revoke all on function public.daily_core_attention(uuid,timestamptz) from public,anon;
grant execute on function public.daily_core_attention(uuid,timestamptz) to authenticated;
