create type public.ai_execution_mode as enum (
  'DISABLED',
  'LOCAL_ONLY',
  'REMOTE_ALLOWED'
);

create type public.ai_logical_tier as enum ('FAST', 'BALANCED', 'REASONING');

create type public.ai_run_status as enum (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT'
);

create type public.ai_error_category as enum (
  'provider_unavailable',
  'authentication_failed',
  'rate_limited',
  'timeout',
  'invalid_response',
  'context_limit',
  'budget_exceeded',
  'policy_denied',
  'cancelled',
  'unknown'
);

create table public.organization_ai_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  execution_mode public.ai_execution_mode not null default 'DISABLED',
  default_tier public.ai_logical_tier not null default 'FAST',
  allowed_provider_ids text[] not null default '{}',
  monthly_remote_cost_limit_usd numeric(12, 4),
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_ai_policies_budget_valid check (
    monthly_remote_cost_limit_usd is null
    or monthly_remote_cost_limit_usd between 0 and 1000000
  ),
  constraint organization_ai_policies_provider_count_valid check (
    cardinality(allowed_provider_ids) <= 20
  ),
  constraint organization_ai_policies_updated_by_membership_fkey
    foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create trigger organization_ai_policies_set_updated_at
before update on public.organization_ai_policies
for each row execute function private.set_updated_at();

create table public.ai_runs (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null,
  plugin_id text,
  operation text not null,
  capability text not null,
  memory_domains text[] not null default '{}',
  requested_tier public.ai_logical_tier not null,
  selected_model_id text,
  provider_id text,
  is_remote boolean,
  status public.ai_run_status not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(14, 8),
  error_category public.ai_error_category,
  parent_run_id uuid,
  trace_metadata jsonb not null default '{}',
  constraint ai_runs_organization_id_id_key unique (organization_id, id),
  constraint ai_runs_actor_membership_fkey
    foreign key (organization_id, actor_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint ai_runs_parent_fkey
    foreign key (organization_id, parent_run_id)
    references public.ai_runs(organization_id, id) on delete restrict,
  constraint ai_runs_plugin_id_valid check (
    plugin_id is null
    or (
      plugin_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
      and char_length(plugin_id) between 2 and 50
    )
  ),
  constraint ai_runs_operation_valid check (
    operation ~ '^[a-z][a-z0-9_]{2,49}$'
  ),
  constraint ai_runs_capability_valid check (
    capability ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    and char_length(capability) <= 100
  ),
  constraint ai_runs_memory_domains_valid check (
    memory_domains <@ array['agency', 'company', 'marketing']::text[]
    and cardinality(memory_domains) <= 3
  ),
  constraint ai_runs_model_id_valid check (
    selected_model_id is null
    or selected_model_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
  ),
  constraint ai_runs_provider_id_valid check (
    provider_id is null
    or provider_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
  ),
  constraint ai_runs_timing_valid check (
    duration_ms is null or duration_ms >= 0
  ),
  constraint ai_runs_usage_valid check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (total_tokens is null or total_tokens >= 0)
    and (
      input_tokens is null
      or output_tokens is null
      or total_tokens is null
      or total_tokens = input_tokens + output_tokens
    )
  ),
  constraint ai_runs_cost_valid check (
    estimated_cost_usd is null or estimated_cost_usd >= 0
  ),
  constraint ai_runs_status_valid check (
    (
      status in ('PENDING', 'RUNNING')
      and completed_at is null
      and error_category is null
    )
    or (
      status = 'SUCCEEDED'
      and completed_at is not null
      and selected_model_id is not null
      and provider_id is not null
      and error_category is null
    )
    or (
      status in ('FAILED', 'CANCELLED', 'TIMED_OUT')
      and completed_at is not null
      and error_category is not null
    )
  ),
  constraint ai_runs_trace_metadata_valid check (
    jsonb_typeof(trace_metadata) = 'object'
    and octet_length(trace_metadata::text) <= 8192
    and not trace_metadata ?| array[
      'prompt', 'response', 'messages', 'input', 'output', 'content'
    ]
    and not jsonb_path_exists(
      trace_metadata,
      '$.**.keyvalue() ? (@.key like_regex "^(prompt|response|messages|input|output|content)$" flag "i")'
    )
  ),
  constraint ai_runs_parent_not_self check (parent_run_id is distinct from id)
);

create index ai_runs_organization_created_idx
on public.ai_runs(organization_id, started_at desc);

create index ai_runs_organization_status_idx
on public.ai_runs(organization_id, status, started_at desc);

create index ai_runs_actor_created_idx
on public.ai_runs(organization_id, actor_id, started_at desc);

create function public.set_organization_ai_policy(
  p_organization_id uuid,
  p_execution_mode public.ai_execution_mode,
  p_default_tier public.ai_logical_tier,
  p_allowed_provider_ids text[],
  p_monthly_remote_cost_limit_usd numeric
)
returns public.organization_ai_policies
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_policy public.organization_ai_policies%rowtype;
  v_provider_ids text[];
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN']::public.organization_role[]
  )) then
    raise exception 'Organization AI policy management permission required'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct lower(btrim(provider_id)) order by lower(btrim(provider_id))), '{}')
  into v_provider_ids
  from unnest(coalesce(p_allowed_provider_ids, '{}')) as provider_id;

  if cardinality(v_provider_ids) > 20
    or exists (
      select 1 from unnest(v_provider_ids) as provider_id
      where provider_id !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
        or char_length(provider_id) > 50
    ) then
    raise exception 'AI provider allowlist is invalid' using errcode = '22023';
  end if;

  if p_monthly_remote_cost_limit_usd is not null
    and p_monthly_remote_cost_limit_usd not between 0 and 1000000 then
    raise exception 'AI remote cost limit is invalid' using errcode = '22023';
  end if;

  insert into public.organization_ai_policies as policy (
    organization_id,
    execution_mode,
    default_tier,
    allowed_provider_ids,
    monthly_remote_cost_limit_usd,
    updated_by
  ) values (
    p_organization_id,
    p_execution_mode,
    p_default_tier,
    v_provider_ids,
    p_monthly_remote_cost_limit_usd,
    v_actor
  )
  on conflict (organization_id) do update
  set execution_mode = excluded.execution_mode,
    default_tier = excluded.default_tier,
    allowed_provider_ids = excluded.allowed_provider_ids,
    monthly_remote_cost_limit_usd = excluded.monthly_remote_cost_limit_usd,
    updated_by = v_actor
  returning * into v_policy;

  return v_policy;
end;
$$;

create function public.start_ai_run(
  p_id uuid,
  p_organization_id uuid,
  p_plugin_id text,
  p_operation text,
  p_capability text,
  p_memory_domains text[],
  p_requested_tier public.ai_logical_tier,
  p_parent_run_id uuid,
  p_trace_metadata jsonb
)
returns public.ai_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_run public.ai_runs%rowtype;
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  )) then
    raise exception 'Organization AI execution permission required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.organization_ai_policies as policy
    where policy.organization_id = p_organization_id
      and policy.execution_mode <> 'DISABLED'
  ) then
    raise exception 'Organization AI policy denies execution'
      using errcode = '42501';
  end if;

  if (p_plugin_id is null and p_capability !~ '^core\.')
    or (p_plugin_id is not null and p_capability !~ ('^' || p_plugin_id || '\.')) then
    raise exception 'AI capability identity is invalid' using errcode = '22023';
  end if;

  if p_plugin_id is not null and not exists (
    select 1 from public.organization_plugins as organization_plugin
    where organization_plugin.organization_id = p_organization_id
      and organization_plugin.plugin_id = p_plugin_id
      and organization_plugin.enabled
  ) then
    raise exception 'Enabled organization plugin required' using errcode = '42501';
  end if;

  insert into public.ai_runs (
    id,
    organization_id,
    actor_id,
    plugin_id,
    operation,
    capability,
    memory_domains,
    requested_tier,
    status,
    parent_run_id,
    trace_metadata
  ) values (
    p_id,
    p_organization_id,
    v_actor,
    p_plugin_id,
    p_operation,
    p_capability,
    coalesce(p_memory_domains, '{}'),
    p_requested_tier,
    'RUNNING',
    p_parent_run_id,
    coalesce(p_trace_metadata, '{}')
  )
  returning * into v_run;

  return v_run;
end;
$$;

create function public.complete_ai_run(
  p_id uuid,
  p_organization_id uuid,
  p_status public.ai_run_status,
  p_selected_model_id text,
  p_provider_id text,
  p_is_remote boolean,
  p_duration_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_estimated_cost_usd numeric,
  p_error_category public.ai_error_category,
  p_trace_metadata jsonb
)
returns public.ai_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_run public.ai_runs%rowtype;
begin
  if p_status not in ('SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT') then
    raise exception 'AI run terminal status required' using errcode = '22023';
  end if;

  update public.ai_runs as ai_run
  set status = p_status,
    selected_model_id = p_selected_model_id,
    provider_id = p_provider_id,
    is_remote = p_is_remote,
    completed_at = now(),
    duration_ms = p_duration_ms,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    total_tokens = p_total_tokens,
    estimated_cost_usd = p_estimated_cost_usd,
    error_category = p_error_category,
    trace_metadata = coalesce(p_trace_metadata, '{}')
  where ai_run.id = p_id
    and ai_run.organization_id = p_organization_id
    and ai_run.actor_id = v_actor
    and ai_run.status = 'RUNNING'
  returning * into v_run;

  if not found then
    raise exception 'Active AI run not found' using errcode = '42501';
  end if;

  return v_run;
end;
$$;

create function public.get_organization_ai_remote_spend(
  p_organization_id uuid,
  p_since timestamptz
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(ai_run.estimated_cost_usd), 0)
  from public.ai_runs as ai_run
  where ai_run.organization_id = p_organization_id
    and ai_run.status = 'SUCCEEDED'
    and ai_run.is_remote
    and ai_run.started_at >= p_since
    and (select private.is_organization_member(p_organization_id));
$$;

alter table public.organization_ai_policies enable row level security;
alter table public.ai_runs enable row level security;

create policy organization_ai_policies_member_select
on public.organization_ai_policies
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy ai_runs_member_select
on public.ai_runs
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on table public.organization_ai_policies from public, anon, authenticated;
revoke all on table public.ai_runs from public, anon, authenticated;
grant select on table public.organization_ai_policies to authenticated;
grant select on table public.ai_runs to authenticated;

revoke all on function public.set_organization_ai_policy(
  uuid, public.ai_execution_mode, public.ai_logical_tier, text[], numeric
) from public, anon;
revoke all on function public.start_ai_run(
  uuid, uuid, text, text, text, text[], public.ai_logical_tier, uuid, jsonb
) from public, anon;
revoke all on function public.complete_ai_run(
  uuid, uuid, public.ai_run_status, text, text, boolean, integer, integer,
  integer, integer, numeric, public.ai_error_category, jsonb
) from public, anon;
revoke all on function public.get_organization_ai_remote_spend(uuid, timestamptz)
from public, anon;

grant execute on function public.set_organization_ai_policy(
  uuid, public.ai_execution_mode, public.ai_logical_tier, text[], numeric
) to authenticated;
grant execute on function public.start_ai_run(
  uuid, uuid, text, text, text, text[], public.ai_logical_tier, uuid, jsonb
) to authenticated;
grant execute on function public.complete_ai_run(
  uuid, uuid, public.ai_run_status, text, text, boolean, integer, integer,
  integer, integer, numeric, public.ai_error_category, jsonb
) to authenticated;
grant execute on function public.get_organization_ai_remote_spend(uuid, timestamptz)
to authenticated;
