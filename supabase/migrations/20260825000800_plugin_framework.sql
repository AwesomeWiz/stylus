create table public.organization_plugins (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_id text not null,
  enabled boolean not null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  enabled_by uuid,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, plugin_id),
  constraint organization_plugins_plugin_id_valid check (
    plugin_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
    and char_length(plugin_id) between 2 and 50
  ),
  constraint organization_plugins_enabled_state_valid check (
    (
      enabled
      and enabled_at is not null
      and disabled_at is null
      and enabled_by is not null
    )
    or (
      not enabled
      and disabled_at is not null
    )
  ),
  constraint organization_plugins_enabled_by_membership_fkey
    foreign key (organization_id, enabled_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint organization_plugins_updated_by_membership_fkey
    foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index organization_plugins_enabled_idx
on public.organization_plugins(organization_id, plugin_id)
where enabled;

create trigger organization_plugins_set_updated_at
before update on public.organization_plugins
for each row execute function private.set_updated_at();

create function public.set_organization_plugin_enabled(
  p_organization_id uuid,
  p_plugin_id text,
  p_enabled boolean
)
returns public.organization_plugins
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_plugin_id text := lower(btrim(p_plugin_id));
  v_state public.organization_plugins%rowtype;
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN']::public.organization_role[]
  )) then
    raise exception 'Organization plugin management permission required'
      using errcode = '42501';
  end if;

  if v_plugin_id !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
    or char_length(v_plugin_id) not between 2 and 50 then
    raise exception 'Plugin ID is invalid' using errcode = '22023';
  end if;

  insert into public.organization_plugins as organization_plugin (
    organization_id,
    plugin_id,
    enabled,
    enabled_at,
    disabled_at,
    enabled_by,
    updated_by
  ) values (
    p_organization_id,
    v_plugin_id,
    p_enabled,
    case when p_enabled then now() else null end,
    case when p_enabled then null else now() end,
    case when p_enabled then v_actor else null end,
    v_actor
  )
  on conflict (organization_id, plugin_id) do update
  set enabled = excluded.enabled,
    enabled_at = case
      when excluded.enabled and not organization_plugin.enabled then now()
      else organization_plugin.enabled_at
    end,
    disabled_at = case when excluded.enabled then null else now() end,
    enabled_by = case
      when excluded.enabled then v_actor
      else organization_plugin.enabled_by
    end,
    updated_by = v_actor
  returning * into v_state;

  return v_state;
end;
$$;

alter table public.organization_plugins enable row level security;

create policy organization_plugins_member_select
on public.organization_plugins
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on table public.organization_plugins from public, anon, authenticated;
grant select on table public.organization_plugins to authenticated;

revoke all on function public.set_organization_plugin_enabled(uuid, text, boolean)
from public, anon;
grant execute on function public.set_organization_plugin_enabled(uuid, text, boolean)
to authenticated;
