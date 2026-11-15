-- Preserve records on deployment. Repair the existing, owner-confirmed tenant
-- deletion boundary without disabling triggers, RLS or referential integrity.
begin;

-- Some immutable child tables have only composite references to another tenant
-- table. Those RESTRICT references protect artifacts but provide no root tenant
-- lifecycle cascade. Add the missing direct ownership edge, validating existing
-- rows; deployment must fail rather than repair/delete any unexpected orphan.
do $$
declare item record;
begin
  for item in
    select n.nspname,c.relname from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped
    where n.nspname='public' and c.relkind='r'
      and not exists(select 1 from pg_catalog.pg_constraint k where k.contype='f' and k.conrelid=c.oid and k.confrelid='public.organizations'::regclass and k.conkey=array[a.attnum]::smallint[])
    order by c.relname
  loop
    execute format('alter table %I.%I add constraint %I foreign key(organization_id) references public.organizations(id) on delete cascade',item.nspname,item.relname,left(item.relname,40)||'_tenant_lifecycle_fkey');
  end loop;
end;
$$;

-- Tenant-to-tenant references must be checkable after the whole authorized
-- cascade. Normal requests still check immediately. CASCADE/SET NULL actions,
-- referenced columns, composite tenant keys and existing deferred modes survive.
do $$
declare item record; definition text;
begin
  for item in
    select k.oid,k.conname,k.confdeltype,k.condeferrable,k.condeferred,
      n.nspname,c.relname
    from pg_catalog.pg_constraint k
    join pg_catalog.pg_class c on c.oid=k.conrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_class parent on parent.oid=k.confrelid
    join pg_catalog.pg_namespace pn on pn.oid=parent.relnamespace
    where k.contype='f' and n.nspname='public' and pn.nspname='public'
      and k.confdeltype in ('a','r')
      and (not k.condeferrable or k.confdeltype='r')
      and exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped)
      and exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=parent.oid and a.attname='organization_id' and not a.attisdropped)
    order by n.nspname,c.relname,k.conname
  loop
    if item.confdeltype='r' then
      -- PostgreSQL RESTRICT actions cannot defer. NO ACTION preserves the
      -- same commit-time FK invariant and can validate a complete cascade.
      definition:=pg_catalog.pg_get_constraintdef(item.oid);
      definition:=replace(definition,' ON DELETE RESTRICT',' ON DELETE NO ACTION');
      definition:=regexp_replace(definition,' DEFERRABLE( INITIALLY (IMMEDIATE|DEFERRED))?','');
      execute format('alter table %I.%I drop constraint %I',item.nspname,item.relname,item.conname);
      execute format('alter table %I.%I add constraint %I %s deferrable initially %s',item.nspname,item.relname,item.conname,definition,case when item.condeferred then 'deferred' else 'immediate' end);
    else
      execute format('alter table %I.%I alter constraint %I deferrable initially immediate',item.nspname,item.relname,item.conname);
    end if;
  end loop;
end;
$$;

-- Immutable artifacts remain immutable while their organization exists. Only
-- a genuine parent-organization deletion permits their FK cascade; no client
-- flag, trigger disable, mutable snapshot or general history deletion is added.
create or replace function private.reject_external_research_history_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old;end if;
  raise exception 'External research history is immutable' using errcode='55000';
end;
$$;

create or replace function private.reject_marketing_performance_history_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old;end if;
  raise exception 'Performance history is immutable' using errcode='42501';
end;
$$;

create or replace function private.reject_marketing_ask_council_history_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old;end if;
  raise exception 'Ask Council history is immutable' using errcode='42501';
end;
$$;

create or replace function private.protect_marketing_ask_council_turn_provenance()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old;end if;
  if tg_op='DELETE'
     or new.organization_id is distinct from old.organization_id
     or new.conversation_id is distinct from old.conversation_id
     or new.user_message_id is distinct from old.user_message_id
     or new.idempotency_key is distinct from old.idempotency_key
     or new.intent is distinct from old.intent
     or new.selected_specialists is distinct from old.selected_specialists
     or new.routing_version is distinct from old.routing_version
     or new.context_version is distinct from old.context_version
     or new.workflow_version is distinct from old.workflow_version
     or new.schema_version is distinct from old.schema_version
     or new.context_snapshot is distinct from old.context_snapshot
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Ask Council turn provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;

create or replace function public.delete_owned_organization(p_organization_id uuid,p_confirmation_name text)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor_id uuid:=auth.uid();v_name text;
begin
  if v_actor_id is null then raise exception 'authentication required' using errcode='42501';end if;
  select name into v_name from public.organizations where id=p_organization_id for update;
  if v_name is null then raise exception 'organization not found' using errcode='P0002';end if;
  if p_confirmation_name is distinct from v_name then raise exception 'confirmation does not match' using errcode='22023';end if;
  if not exists(select 1 from public.memberships where organization_id=p_organization_id and user_id=v_actor_id and role='OWNER' and removed_at is null) then
    raise exception 'owner permission required' using errcode='42501';
  end if;
  set constraints all deferred;
  delete from public.organizations where id=p_organization_id;
  -- Validate all references before returning, without leaving a caller's later
  -- commands in a weaker constraint-checking mode.
  set constraints all immediate;
end;
$$;

revoke all on function public.delete_owned_organization(uuid,text) from public,anon;
grant execute on function public.delete_owned_organization(uuid,text) to authenticated;
commit;
