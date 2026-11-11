-- Optional, bounded external references. Additive; no existing rows are rewritten.
-- Registry populated only by trusted migrations, never browser/provider input.
create table private.integration_targets (
  entity_type text primary key, relation regclass not null, archived_column name, plugin_id text
);
insert into private.integration_targets values
 ('core.task','public.tasks',null,null),
 ('core.milestone','public.milestones','archived_at',null),
 ('core.note','public.notes','archived_at',null);
revoke all on private.integration_targets from public,anon,authenticated;

create function private.integration_target_available(p_org uuid,p_type text,p_id uuid,p_edit boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target private.integration_targets; available boolean;begin
  if not private.is_organization_member(p_org) or (p_edit and not private.has_organization_role(p_org,array['OWNER','ADMIN','MEMBER']::public.organization_role[])) then return false;end if;
  select * into target from private.integration_targets where entity_type=p_type;
  if not found then return false;end if;
  if target.plugin_id is not null and not exists(select 1 from public.organization_plugins where organization_id=p_org and plugin_id=target.plugin_id and enabled) then return false;end if;
  execute format('select exists(select 1 from %s where organization_id=$1 and id=$2 %s)',target.relation,
    case when p_edit and target.archived_column is not null then format('and %I is null',target.archived_column) else '' end)
    into available using p_org,p_id;
  return coalesce(available,false);
end$$;
revoke all on function private.integration_target_available(uuid,text,uuid,boolean) from public,anon;
grant execute on function private.integration_target_available(uuid,text,uuid,boolean) to authenticated;

create table public.integration_connections (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  provider text not null check(provider in('github','google-drive','google-calendar')),
  status text not null check(status in('connected','attention','disconnected')),
  display_name text not null check(length(display_name)<=160),account_id text not null check(length(account_id)<=256),
  config jsonb not null default '{}' check(jsonb_typeof(config)='object' and octet_length(config::text)<=20000),
  generation bigint not null default 1 check(generation>0),
  created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
  check((provider='github')=(owner_id is null)),unique(organization_id,id)
);
create unique index integration_connection_owner on public.integration_connections(organization_id,provider,coalesce(owner_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table public.integration_secrets (
  connection_id uuid primary key references public.integration_connections(id) on delete cascade,
  sealed text not null check(length(sealed)<=32000), updated_at timestamptz not null default clock_timestamp()
);
create table public.integration_oauth_states (
  id text primary key check(length(id)<=128), organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in('github','google-drive','google-calendar')),
  purpose text not null check(purpose in('oauth','github-selection')),
  sealed text not null check(length(sealed)<=32000),expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);
create index integration_oauth_expiry on public.integration_oauth_states(expires_at);
create table public.external_resource_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,entity_type text not null references private.integration_targets(entity_type),entity_id uuid not null,
  locator jsonb not null check(jsonb_typeof(locator)='object' and octet_length(locator::text)<=1500),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default clock_timestamp(),
  foreign key(organization_id,connection_id) references public.integration_connections(organization_id,id) on delete cascade,
  unique(organization_id,entity_type,entity_id,connection_id,locator)
);
create index external_resource_target on public.external_resource_links(organization_id,entity_type,entity_id,id);
-- Cache is never directly selectable by members. Shared metadata is released only
-- after current target/connection/owner checks, and expires after 60 seconds.
create table public.integration_resource_cache (
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  resource_key text not null check(length(resource_key)<=1500),generation bigint not null,
  projection jsonb not null check(octet_length(projection::text)<=4000),checked_at timestamptz not null,
  primary key(connection_id,resource_key)
);
create table public.integration_calendar_intents (
  id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,connection_id uuid not null,
  account_id text not null check(length(account_id)<=256),
  entity_type text not null references private.integration_targets(entity_type),entity_id uuid not null,
  input jsonb not null check(octet_length(input::text)<=2000), state text not null default 'pending' check(state in('pending','linked')),created_at timestamptz not null default clock_timestamp(),
  foreign key(organization_id,connection_id) references public.integration_connections(organization_id,id) on delete cascade
);
create unique index integration_calendar_pending on public.integration_calendar_intents(organization_id,actor_id,connection_id,entity_type,entity_id) where state='pending';
do $$declare t text;begin
  foreach t in array array['integration_connections','integration_secrets','integration_oauth_states','external_resource_links','integration_resource_cache','integration_calendar_intents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end$$;
grant select on public.integration_connections,public.external_resource_links to authenticated;
create policy integration_connections_read on public.integration_connections for select to authenticated using(
  private.is_organization_member(organization_id) and (provider='github' or owner_id=auth.uid())
);
create policy external_resource_links_read on public.external_resource_links for select to authenticated using(
  private.integration_target_available(organization_id,entity_type,entity_id,false)
);

create function public.set_external_resource_link(p_organization_id uuid,p_type text,p_entity uuid,p_connection uuid,p_locator jsonb,p_remove boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare connection public.integration_connections; result uuid;begin
  if auth.uid() is null or p_remove is null or not private.integration_target_available(p_organization_id,p_type,p_entity,true) then raise exception 'Resource unavailable' using errcode='42501';end if;
  -- Serializes limits and disconnect/selection changes with concurrent attachments.
  perform pg_advisory_xact_lock(hashtextextended(p_entity::text,812));
  select * into connection from public.integration_connections where id=p_connection and organization_id=p_organization_id for share;
  if not found then raise exception 'Resource unavailable' using errcode='42501';end if;
  if p_remove then
    delete from public.external_resource_links where organization_id=p_organization_id and entity_type=p_type and entity_id=p_entity and connection_id=p_connection and locator=p_locator returning id into result;
    return result;
  end if;
  if connection.status<>'connected' or (connection.provider<>'github' and connection.owner_id<>auth.uid()) or p_locator->>'provider' is distinct from connection.provider then raise exception 'Resource unavailable' using errcode='42501';end if;
  if jsonb_typeof(p_locator)<>'object' or octet_length(p_locator::text)>1500 then raise exception 'Invalid resource' using errcode='22023';end if;
  if connection.provider='github' and not exists(select 1 from jsonb_array_elements(connection.config->'repositories') r where r->>'id'=p_locator->>'repositoryId' and r->>'fullName'=p_locator->>'repository') then raise exception 'Repository unavailable' using errcode='42501';end if;
  select id into result from public.external_resource_links where organization_id=p_organization_id and entity_type=p_type and entity_id=p_entity and connection_id=p_connection and locator=p_locator;
  if result is not null then return result;end if;
  if (select count(*) from public.external_resource_links where organization_id=p_organization_id and entity_type=p_type and entity_id=p_entity)>=20 then raise exception 'At most 20 resources per object' using errcode='22023';end if;
  insert into public.external_resource_links(organization_id,entity_type,entity_id,connection_id,locator,created_by) values(p_organization_id,p_type,p_entity,p_connection,p_locator,auth.uid()) returning id into result;
  return result;
end$$;
revoke all on function public.set_external_resource_link(uuid,text,uuid,uuid,jsonb,boolean) from public,anon;
grant execute on function public.set_external_resource_link(uuid,text,uuid,uuid,jsonb,boolean) to authenticated;

-- Service-only CAS: token refresh cannot resurrect a disconnected connection.
create function public.store_integration_secret(p_id uuid,p_generation bigint,p_sealed text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.integration_connections c join public.memberships m on m.organization_id=c.organization_id and m.user_id=coalesce(c.owner_id,c.created_by) and m.removed_at is null
    where c.id=p_id and c.generation=p_generation and c.status='connected' for update of c;
  if not found then return false;end if;
  insert into public.integration_secrets(connection_id,sealed) values(p_id,p_sealed) on conflict(connection_id) do update set sealed=excluded.sealed,updated_at=clock_timestamp();return true;
end$$;
revoke all on function public.store_integration_secret(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.store_integration_secret(uuid,bigint,text) to service_role;

create function public.disconnect_integration(p_organization_id uuid,p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare connection public.integration_connections;begin
  select * into connection from public.integration_connections where organization_id=p_organization_id and id=p_id for update;
  if not found or not private.is_organization_member(p_organization_id) or
    (connection.provider='github' and not private.has_organization_role(p_organization_id,array['OWNER','ADMIN']::public.organization_role[])) or
    (connection.provider<>'github' and connection.owner_id<>auth.uid()) then raise exception 'Connection unavailable' using errcode='42501';end if;
  update public.integration_connections set status='disconnected',generation=generation+1,display_name='',account_id='',config='{}',updated_at=clock_timestamp() where id=p_id;
  delete from public.integration_secrets where connection_id=p_id;
  delete from public.integration_resource_cache where connection_id=p_id;
  delete from public.integration_oauth_states where organization_id=p_organization_id and provider=connection.provider and (connection.provider='github' or actor_id=connection.owner_id);
end$$;
revoke all on function public.disconnect_integration(uuid,uuid) from public,anon;
grant execute on function public.disconnect_integration(uuid,uuid) to authenticated;

create function public.activate_integration(p_actor uuid,p_org uuid,p_id uuid,p_provider text,p_account text,p_name text,p_config jsonb,p_sealed text,p_expected bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.integration_connections; actor_role public.organization_role;begin
  select role into actor_role from public.memberships where organization_id=p_org and user_id=p_actor and removed_at is null;
  if actor_role is null or p_provider not in('github','google-drive','google-calendar') or (p_provider='github' and actor_role not in('OWNER','ADMIN')) then raise exception 'Connection unavailable' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_provider||case when p_provider='github' then '' else p_actor::text end,813));
  select * into old from public.integration_connections where organization_id=p_org and provider=p_provider and owner_id is not distinct from case when p_provider='github' then null else p_actor end for update;
  if coalesce(old.generation,0) is distinct from p_expected or (old.id is not null and old.id<>p_id) or exists(select 1 from public.integration_connections where id=p_id and organization_id<>p_org) then raise exception 'Connection changed' using errcode='PT409';end if;
  insert into public.integration_connections(id,organization_id,owner_id,provider,status,display_name,account_id,config,created_by)
    values(p_id,p_org,case when p_provider='github' then null else p_actor end,p_provider,'connected',p_name,p_account,p_config,p_actor)
    on conflict(id) do update set status='connected',display_name=excluded.display_name,account_id=excluded.account_id,config=excluded.config,created_by=excluded.created_by,generation=public.integration_connections.generation+1,updated_at=clock_timestamp();
  insert into public.integration_secrets(connection_id,sealed) values(p_id,p_sealed) on conflict(connection_id) do update set sealed=excluded.sealed,updated_at=clock_timestamp();
  delete from public.integration_resource_cache where connection_id=p_id;return p_id;
end$$;
revoke all on function public.activate_integration(uuid,uuid,uuid,text,text,text,jsonb,text,bigint) from public,anon,authenticated;
grant execute on function public.activate_integration(uuid,uuid,uuid,text,text,text,jsonb,text,bigint) to service_role;

create function public.store_integration_cache(p_id uuid,p_generation bigint,p_rows jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare r jsonb;begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5 or octet_length(p_rows::text)>20000 then raise exception 'Bounded cache required' using errcode='22023';end if;
  perform 1 from public.integration_connections where id=p_id and generation=p_generation and status='connected' for share;
  if not found then return;end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.integration_resource_cache(connection_id,resource_key,generation,projection,checked_at) values(p_id,r->>'key',p_generation,r->'projection',clock_timestamp())
      on conflict(connection_id,resource_key) do update set generation=excluded.generation,projection=excluded.projection,checked_at=excluded.checked_at;
  end loop;
end$$;
revoke all on function public.store_integration_cache(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.store_integration_cache(uuid,bigint,jsonb) to service_role;
