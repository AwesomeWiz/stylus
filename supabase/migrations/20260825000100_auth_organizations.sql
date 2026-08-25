create type public.organization_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

create schema if not exists private;
revoke all on schema private from public;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint organizations_name_length
    check (char_length(btrim(name)) between 2 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.organization_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);

comment on table public.organizations is
  'Private tenant boundary. Every organization is created atomically with an OWNER membership.';
comment on table public.memberships is
  'Links an authenticated user to an organization and establishes the initial role foundation.';

create function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := (select auth.uid());
  organization public.organizations;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(btrim(p_name)) not between 2 and 80 then
    raise exception 'Organization name must be between 2 and 80 characters'
      using errcode = '22023';
  end if;

  insert into public.organizations (name, created_by)
  values (btrim(p_name), authenticated_user_id)
  returning * into organization;

  insert into public.memberships (organization_id, user_id, role)
  values (organization.id, authenticated_user_id, 'OWNER');

  return organization;
end;
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
grant select on table public.organizations to authenticated;
grant update (name) on table public.organizations to authenticated;
grant select on table public.memberships to authenticated;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;

create policy organizations_select_for_members
on public.organizations
for select
to authenticated
using ((select private.is_organization_member(id)));

create policy organizations_update_for_managers
on public.organizations
for update
to authenticated
using ((select private.has_organization_role(id, array['OWNER', 'ADMIN']::public.organization_role[])))
with check ((select private.has_organization_role(id, array['OWNER', 'ADMIN']::public.organization_role[])));

create policy memberships_select_own
on public.memberships
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));
