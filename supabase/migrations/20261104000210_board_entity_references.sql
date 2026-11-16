-- Core reference structure and durable conversion identities. No record snapshots.
create table public.board_entity_conversions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  entity_type text not null check(entity_type ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$' and length(entity_type)<=80),
  entity_id uuid not null default gen_random_uuid(),
  card_id uuid not null default gen_random_uuid(),
  input jsonb not null check(jsonb_typeof(input)='object' and pg_column_size(input)<=16384),
  source_ids uuid[] not null check(cardinality(source_ids) between 1 and 30),
  state text not null default 'PREPARED' check(state in ('PREPARED','CREATED')),
  created_at timestamptz not null default clock_timestamp(),
  unique(organization_id,id), unique(entity_id), unique(card_id),
  foreign key(organization_id,board_id) references public.boards(organization_id,id) deferrable initially deferred,
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id) deferrable initially deferred
);
create index board_entity_conversions_recovery on public.board_entity_conversions(organization_id,board_id,created_by,created_at desc);
alter table public.board_entity_conversions enable row level security;
revoke all on public.board_entity_conversions from public,anon,authenticated;
grant select on public.board_entity_conversions to authenticated;
create policy board_entity_conversions_read on public.board_entity_conversions for select to authenticated using (
  created_by=auth.uid() and private.has_organization_role(organization_id,array['OWNER','ADMIN','MEMBER']::public.organization_role[])
  and exists(select 1 from public.boards b where b.id=board_id and b.organization_id=board_entity_conversions.organization_id and b.archived_at is null)
);

-- Allocating an identity has no business creation side effect. Providers own creation.
create function public.prepare_board_entity_conversion(p_id uuid,p_board_id uuid,p_entity_type text,p_input jsonb,p_source_ids uuid[])
returns public.board_entity_conversions language plpgsql security definer set search_path='' as $$
declare target public.boards; receipt public.board_entity_conversions; plugin text;
begin
  select * into target from public.boards where id=p_board_id and archived_at is null for update;
  if auth.uid() is null or target.id is null or not private.has_organization_role(target.organization_id,array['OWNER','ADMIN','MEMBER']::public.organization_role[]) then raise exception 'Board unavailable' using errcode='42501'; end if;
  if p_id is null or p_entity_type is null or length(p_entity_type)>80 or p_entity_type !~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    or p_input is null or jsonb_typeof(p_input)<>'object' or pg_column_size(p_input)>16384
    or p_source_ids is null or cardinality(p_source_ids) not between 1 and 30
    or cardinality(p_source_ids)<>(select count(distinct id) from unnest(p_source_ids) id) then raise exception 'Invalid conversion' using errcode='22023'; end if;
  if exists(select 1 from jsonb_each(p_input) field where length(field.key)>40 or field.key !~ '^[a-z][a-zA-Z0-9]*$' or jsonb_typeof(field.value) not in ('string','null') or length(field.value#>>'{}')>8000) then raise exception 'Invalid conversion fields' using errcode='22023'; end if;
  plugin:=split_part(p_entity_type,'.',1);
  if plugin<>'core' and not exists(select 1 from public.organization_plugins op where op.organization_id=target.organization_id and op.plugin_id=plugin and op.enabled) then raise exception 'Item unavailable' using errcode='42501'; end if;
  select * into receipt from public.board_entity_conversions where id=p_id for update;
  if receipt.id is not null then
    if receipt.organization_id<>target.organization_id or receipt.board_id is distinct from target.id or receipt.created_by is distinct from auth.uid()
      or receipt.entity_type<>p_entity_type or receipt.input<>p_input or receipt.source_ids<>p_source_ids then raise exception 'Conversion changed' using errcode='PT409'; end if;
    return receipt;
  end if;
  if (select count(*) from public.board_elements e where e.organization_id=target.organization_id and e.board_id=target.id and e.id=any(p_source_ids) and e.archived_at is null and e.element_type in ('TEXT','STICKY','SHAPE','ARROW','LINK'))<>cardinality(p_source_ids) then raise exception 'Selection unavailable' using errcode='42501'; end if;
  insert into public.board_entity_conversions(id,organization_id,board_id,created_by,entity_type,input,source_ids)
    values(p_id,target.organization_id,target.id,auth.uid(),p_entity_type,p_input,p_source_ids) returning * into receipt;
  return receipt;
end;
$$;
revoke all on function public.prepare_board_entity_conversion(uuid,uuid,text,jsonb,uuid[]) from public,anon;
grant execute on function public.prepare_board_entity_conversion(uuid,uuid,text,jsonb,uuid[]) to authenticated;

-- Explicit provider transaction boundary. Never permits a browser to mark creation.
create function private.require_board_entity_conversion(p_id uuid,p_type text)
returns public.board_entity_conversions language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; target_board uuid;
begin
  select board_id into target_board from public.board_entity_conversions where id=p_id;
  perform 1 from public.boards where id=target_board and archived_at is null for update;
  if not found then raise exception 'Board unavailable' using errcode='42501'; end if;
  select * into receipt from public.board_entity_conversions where id=p_id for update;
  if receipt.id is null or receipt.created_by is distinct from auth.uid() or receipt.entity_type<>p_type
    or not private.has_organization_role(receipt.organization_id,array['OWNER','ADMIN','MEMBER']::public.organization_role[])
    or not exists(select 1 from public.boards where id=receipt.board_id and organization_id=receipt.organization_id and archived_at is null) then raise exception 'Conversion unavailable' using errcode='42501'; end if;
  if split_part(p_type,'.',1)<>'core' and not exists(select 1 from public.organization_plugins where organization_id=receipt.organization_id and plugin_id=split_part(p_type,'.',1) and enabled) then raise exception 'Item unavailable' using errcode='42501'; end if;
  if receipt.state='PREPARED' and (select count(*) from public.board_elements where organization_id=receipt.organization_id and board_id=receipt.board_id and id=any(receipt.source_ids) and archived_at is null and element_type in ('TEXT','STICKY','SHAPE','ARROW','LINK'))<>cardinality(receipt.source_ids) then raise exception 'Selection unavailable' using errcode='42501'; end if;
  return receipt;
end;
$$;
revoke all on function private.require_board_entity_conversion(uuid,text) from public,anon,authenticated;

create function private.enforce_board_creation_link() returns trigger language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions;
begin
  if tg_op='UPDATE' and old.board_conversion_id is not null and (new.id,new.board_conversion_id) is distinct from (old.id,old.board_conversion_id) then raise exception 'Creation identity is immutable' using errcode='42501'; end if;
  if new.board_conversion_id is null or (tg_op='UPDATE' and new.board_conversion_id is not distinct from old.board_conversion_id) then return new; end if;
  select * into receipt from public.board_entity_conversions where id=new.board_conversion_id;
  if receipt.id is null or receipt.entity_type<>tg_argv[0] or receipt.organization_id<>new.organization_id or receipt.entity_id<>new.id or receipt.created_by is distinct from auth.uid() then raise exception 'Creation identity unavailable' using errcode='42501'; end if;
  return new;
end;
$$;
revoke all on function private.enforce_board_creation_link() from public,anon,authenticated;

alter table public.tasks add column board_conversion_id uuid;
alter table public.tasks add constraint tasks_board_conversion_unique unique(organization_id,board_conversion_id);
alter table public.tasks add constraint tasks_board_conversion_fkey foreign key(organization_id,board_conversion_id) references public.board_entity_conversions(organization_id,id) deferrable initially deferred;
create trigger tasks_board_creation_link before insert or update on public.tasks for each row execute function private.enforce_board_creation_link('core.task');
create function public.create_task_from_board(p_conversion_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; assignee uuid; existing uuid;
begin
  receipt:=private.require_board_entity_conversion(p_conversion_id,'core.task');
  if receipt.state='CREATED' then
    select id into existing from public.tasks where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id;
    if existing is null then raise exception 'Created item unavailable' using errcode='PT410'; end if;
    return existing;
  end if;
  assignee:=nullif(receipt.input->>'assigneeId','')::uuid;
  if assignee is not null and not exists(select 1 from public.memberships where organization_id=receipt.organization_id and user_id=assignee and removed_at is null) then raise exception 'Invalid assignee' using errcode='22023'; end if;
  insert into public.tasks(id,organization_id,title,description,priority,assignee_id,scheduled_at,due_at,created_by,updated_by,board_conversion_id)
    values(receipt.entity_id,receipt.organization_id,receipt.input->>'title',nullif(receipt.input->>'description',''),(receipt.input->>'priority')::public.task_priority,assignee,nullif(receipt.input->>'scheduledAt','')::timestamptz,nullif(receipt.input->>'dueAt','')::timestamptz,auth.uid(),auth.uid(),receipt.id) on conflict(id) do nothing;
  if not exists(select 1 from public.tasks where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id) then raise exception 'Created item unavailable' using errcode='PT410'; end if;
  update public.board_entity_conversions set state='CREATED' where id=receipt.id;
  return receipt.entity_id;
end;
$$;
revoke all on function public.create_task_from_board(uuid) from public,anon;
grant execute on function public.create_task_from_board(uuid) to authenticated;

create function private.validate_board_entity_reference() returns trigger language plpgsql security definer set search_path='' as $$
declare ref jsonb; receipt public.board_entity_conversions;
begin
  if new.element_type<>'ENTITY_CARD' then return new; end if;
  ref:=new.content->'reference';
  if jsonb_typeof(ref) is distinct from 'object' or new.content-array['reference']<>'{}'::jsonb or new.style<>'{}'::jsonb or new.metadata-array['conversionId']<>'{}'::jsonb
    or not coalesce(ref ?& array['entityType','entityId','organizationId'],false)
    or ref-array['entityType','entityId','organizationId','sourcePlugin','immutable']<>'{}'::jsonb
    or not coalesce(ref->>'entityType' ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$' and length(ref->>'entityType')<=80,false)
    or not coalesce(ref->>'entityId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
    or ref->>'organizationId' is distinct from new.organization_id::text then raise exception 'Invalid native reference' using errcode='23514'; end if;
  if split_part(ref->>'entityType','.',1)='core' then
    if ref ? 'sourcePlugin' then raise exception 'Invalid native reference' using errcode='23514'; end if;
  elsif ref->>'sourcePlugin' is distinct from split_part(ref->>'entityType','.',1) then raise exception 'Invalid native reference' using errcode='23514'; end if;
  if ref ? 'immutable' and (jsonb_typeof(ref->'immutable') is distinct from 'object' or (ref->'immutable')-array['runId','evidenceId']<>'{}'::jsonb
    or not coalesce(ref#>>'{immutable,runId}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
    or not coalesce(ref#>>'{immutable,evidenceId}' ~ '^EVID-[1-9][0-9]*$' and length(ref#>>'{immutable,evidenceId}')<=24,false)) then raise exception 'Invalid immutable reference' using errcode='23514'; end if;
  if tg_op='UPDATE' and new.content is distinct from old.content then raise exception 'Native reference identity is immutable' using errcode='23514'; end if;
  if new.metadata ? 'conversionId' then
    select * into receipt from public.board_entity_conversions where id=(new.metadata->>'conversionId')::uuid;
    if receipt.id is null or receipt.state<>'CREATED' or receipt.card_id<>new.id or receipt.organization_id<>new.organization_id or receipt.board_id is distinct from new.board_id or receipt.entity_id::text<>ref->>'entityId' or receipt.entity_type<>ref->>'entityType' then raise exception 'Invalid conversion link' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_board_entity_reference() from public,anon,authenticated;
create trigger board_entity_reference_validate before insert or update on public.board_elements for each row execute function private.validate_board_entity_reference();
