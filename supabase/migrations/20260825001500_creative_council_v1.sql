create type public.marketing_creative_council_status as enum (
  'RUNNING', 'SUCCEEDED', 'FAILED'
);
create type public.marketing_creative_council_stage as enum (
  'HOOK', 'SCRIPT', 'CRITIQUE', 'COMPLETE'
);
create type public.marketing_creative_council_stage_status as enum (
  'SUCCEEDED', 'FAILED'
);

create table public.marketing_creative_council_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_reel_idea_id uuid not null,
  idempotency_key uuid not null,
  workflow_version text not null default 'creative-council-v1'
    check (workflow_version = 'creative-council-v1'),
  context_snapshot jsonb not null check (
    jsonb_typeof(context_snapshot) = 'object'
    and pg_column_size(context_snapshot) <= 32768
  ),
  status public.marketing_creative_council_status not null default 'RUNNING',
  current_stage public.marketing_creative_council_stage not null default 'HOOK',
  failed_stage public.marketing_creative_council_stage,
  failure_category public.ai_error_category,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, created_by, idempotency_key),
  foreign key (organization_id, source_reel_idea_id)
    references public.marketing_reel_ideas(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  check (
    (status = 'RUNNING' and completed_at is null and failed_stage is null and failure_category is null)
    or (status = 'SUCCEEDED' and current_stage = 'COMPLETE' and completed_at is not null and failed_stage is null and failure_category is null)
    or (status = 'FAILED' and completed_at is not null and failed_stage is not null and failure_category is not null)
  )
);

create unique index marketing_creative_council_one_active_run_idx
on public.marketing_creative_council_runs(
  organization_id, source_reel_idea_id, created_by
) where status = 'RUNNING';
create index marketing_creative_council_history_idx
on public.marketing_creative_council_runs(
  organization_id, source_reel_idea_id, created_at desc
);

create table public.marketing_creative_council_evidence (
  organization_id uuid not null,
  council_run_id uuid not null,
  analysis_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 3),
  projection jsonb not null check (
    jsonb_typeof(projection) = 'object'
    and pg_column_size(projection) <= 8192
  ),
  created_at timestamptz not null default now(),
  primary key (council_run_id, analysis_id),
  unique (council_run_id, ordinal),
  foreign key (organization_id, council_run_id)
    references public.marketing_creative_council_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, analysis_id)
    references public.marketing_competitor_reel_analyses(organization_id, id) on delete restrict
);

create table public.marketing_creative_council_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  council_run_id uuid not null,
  stage public.marketing_creative_council_stage not null check (stage <> 'COMPLETE'),
  status public.marketing_creative_council_stage_status not null,
  ai_run_id uuid,
  structured_output jsonb check (
    structured_output is null or (
      jsonb_typeof(structured_output) = 'object'
      and pg_column_size(structured_output) <= 32768
    )
  ),
  failure_category public.ai_error_category,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (council_run_id, stage),
  foreign key (organization_id, council_run_id)
    references public.marketing_creative_council_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, ai_run_id)
    references public.ai_runs(organization_id, id) on delete restrict,
  check (
    (status = 'SUCCEEDED' and ai_run_id is not null and structured_output is not null and failure_category is null)
    or (status = 'FAILED' and structured_output is null and failure_category is not null)
  )
);

create table public.marketing_reel_brief_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  council_run_id uuid not null,
  source_reel_idea_id uuid not null,
  version_number integer not null check (version_number between 1 and 10000),
  schema_version text not null default 'reel-brief-v1'
    check (schema_version = 'reel-brief-v1'),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  primary_hook text not null check (char_length(btrim(primary_hook)) between 1 and 500),
  spoken_script text not null check (char_length(btrim(spoken_script)) between 1 and 5000),
  script_sections jsonb not null check (
    jsonb_typeof(script_sections) = 'array'
    and jsonb_array_length(script_sections) between 1 and 8
    and pg_column_size(script_sections) <= 16384
  ),
  call_to_action text not null check (char_length(btrim(call_to_action)) between 1 and 500),
  caption text not null check (char_length(btrim(caption)) between 1 and 1800),
  visual_directions jsonb not null check (
    jsonb_typeof(visual_directions) = 'array'
    and jsonb_array_length(visual_directions) <= 8
    and pg_column_size(visual_directions) <= 8192
  ),
  critique jsonb not null check (
    jsonb_typeof(critique) = 'object'
    and pg_column_size(critique) <= 32768
  ),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, source_reel_idea_id, version_number),
  unique (council_run_id),
  foreign key (organization_id, council_run_id)
    references public.marketing_creative_council_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, source_reel_idea_id)
    references public.marketing_reel_ideas(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

alter table public.marketing_creative_council_runs enable row level security;
alter table public.marketing_creative_council_evidence enable row level security;
alter table public.marketing_creative_council_stages enable row level security;
alter table public.marketing_reel_brief_versions enable row level security;

create policy marketing_creative_council_runs_select
on public.marketing_creative_council_runs for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_creative_council_evidence_select
on public.marketing_creative_council_evidence for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_creative_council_stages_select
on public.marketing_creative_council_stages for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_reel_brief_versions_select
on public.marketing_reel_brief_versions for select to authenticated
using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_creative_council_runs,
  public.marketing_creative_council_evidence,
  public.marketing_creative_council_stages,
  public.marketing_reel_brief_versions from public, anon, authenticated;
grant select on public.marketing_creative_council_runs,
  public.marketing_creative_council_evidence,
  public.marketing_creative_council_stages,
  public.marketing_reel_brief_versions to authenticated;

create function private.marketing_creative_council_executable(
  p_organization_id uuid,
  p_actor_id uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships as membership
    join public.organization_plugins as plugin
      on plugin.organization_id = membership.organization_id
      and plugin.plugin_id = 'marketing'
      and plugin.enabled
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_id
      and membership.removed_at is null
      and membership.role in ('OWNER', 'ADMIN', 'MEMBER')
  );
$$;

create function public.start_marketing_creative_council_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_source_reel_idea_id uuid,
  p_idempotency_key uuid,
  p_context_snapshot jsonb,
  p_evidence jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_creative_council_runs%rowtype;
  v_item jsonb;
  v_analysis_id uuid;
  v_ordinal integer := 0;
begin
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Creative Council execution denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_context_snapshot) <> 'object'
     or pg_column_size(p_context_snapshot) > 32768
     or jsonb_typeof(p_evidence) <> 'array'
     or jsonb_array_length(p_evidence) > 3
     or pg_column_size(p_evidence) > 12288 then
    raise exception 'Creative Council context invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.marketing_reel_ideas as idea
    where idea.organization_id = p_organization_id
      and idea.id = p_source_reel_idea_id
      and idea.archived_at is null
  ) then
    raise exception 'Reel Idea is not eligible' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_source_reel_idea_id::text || ':' || p_actor_id::text,
    1500
  ));

  select * into v_run
  from public.marketing_creative_council_runs as run
  where run.organization_id = p_organization_id
    and run.created_by = p_actor_id
    and run.idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'runId', v_run.id,
      'shouldExecute', false,
      'status', v_run.status
    );
  end if;

  select * into v_run
  from public.marketing_creative_council_runs as run
  where run.organization_id = p_organization_id
    and run.source_reel_idea_id = p_source_reel_idea_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING';
  if found then
    return jsonb_build_object(
      'runId', v_run.id,
      'shouldExecute', false,
      'status', v_run.status
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_evidence)
  loop
    v_ordinal := v_ordinal + 1;
    begin
      v_analysis_id := (v_item ->> 'analysisId')::uuid;
    exception when others then
      raise exception 'Competitor evidence identifier invalid' using errcode = '22023';
    end;
    if not exists (
      select 1
      from public.marketing_competitor_reel_analyses as analysis
      join public.marketing_competitor_reels as reel
        on reel.organization_id = analysis.organization_id
        and reel.id = analysis.competitor_reel_id
      join public.marketing_competitors as competitor
        on competitor.organization_id = reel.organization_id
        and competitor.id = reel.marketing_competitor_id
      where analysis.organization_id = p_organization_id
        and analysis.id = v_analysis_id
        and analysis.status = 'ANALYZED'
        and analysis.completed_at is not null
        and analysis.structured_result is not null
        and reel.archived_at is null
        and competitor.archived_at is null
    ) then
      raise exception 'Competitor analysis is not eligible' using errcode = '22023';
    end if;
  end loop;

  insert into public.marketing_creative_council_runs (
    organization_id, source_reel_idea_id, idempotency_key,
    context_snapshot, created_by
  ) values (
    p_organization_id, p_source_reel_idea_id, p_idempotency_key,
    p_context_snapshot, p_actor_id
  ) returning * into v_run;

  v_ordinal := 0;
  for v_item in select value from jsonb_array_elements(p_evidence)
  loop
    v_ordinal := v_ordinal + 1;
    v_analysis_id := (v_item ->> 'analysisId')::uuid;
    insert into public.marketing_creative_council_evidence (
      organization_id, council_run_id, analysis_id, ordinal, projection
    ) values (
      p_organization_id, v_run.id, v_analysis_id, v_ordinal, v_item
    );
  end loop;

  return jsonb_build_object(
    'runId', v_run.id,
    'shouldExecute', true,
    'status', v_run.status
  );
end;
$$;

create function private.assert_marketing_creative_council_ai_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_ai_run_id uuid,
  p_stage public.marketing_creative_council_stage,
  p_require_success boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.ai_runs as ai
    where ai.organization_id = p_organization_id
      and ai.id = p_ai_run_id
      and ai.actor_id = p_actor_id
      and ai.plugin_id = 'marketing'
      and ai.capability = 'marketing.creative-council.execute'
      and ai.operation = 'generate_structured'
      and ai.requested_tier = case
        when p_stage = 'CRITIQUE' then 'REASONING'::public.ai_logical_tier
        else 'BALANCED'::public.ai_logical_tier
      end
      and (
        (p_require_success and ai.status = 'SUCCEEDED')
        or (not p_require_success and ai.status in ('SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'))
      )
  ) then
    raise exception 'AI run provenance invalid' using errcode = '22023';
  end if;
end;
$$;

create function public.record_marketing_creative_council_stage(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_stage public.marketing_creative_council_stage,
  p_ai_run_id uuid,
  p_structured_output jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v_next public.marketing_creative_council_stage;
begin
  if p_stage not in ('HOOK', 'SCRIPT')
     or jsonb_typeof(p_structured_output) <> 'object'
     or pg_column_size(p_structured_output) > 32768 then
    raise exception 'Creative Council stage invalid' using errcode = '22023';
  end if;
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Creative Council execution denied' using errcode = '42501';
  end if;
  perform 1 from public.marketing_creative_council_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = p_stage
  for update;
  if not found then
    raise exception 'Creative Council stage transition invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_creative_council_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, p_stage, true
  );
  insert into public.marketing_creative_council_stages (
    organization_id, council_run_id, stage, status, ai_run_id, structured_output
  ) values (
    p_organization_id, p_run_id, p_stage, 'SUCCEEDED', p_ai_run_id, p_structured_output
  );
  v_next := case when p_stage = 'HOOK' then 'SCRIPT' else 'CRITIQUE' end;
  update public.marketing_creative_council_runs
  set current_stage = v_next
  where organization_id = p_organization_id and id = p_run_id;
end;
$$;

create function public.complete_marketing_creative_council_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_ai_run_id uuid,
  p_critique jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_creative_council_runs%rowtype;
  v_hook jsonb;
  v_script jsonb;
  v_title text;
  v_version integer;
  v_brief_id uuid;
begin
  if jsonb_typeof(p_critique) <> 'object' or pg_column_size(p_critique) > 32768 then
    raise exception 'Creative Council critique invalid' using errcode = '22023';
  end if;
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Creative Council execution denied' using errcode = '42501';
  end if;
  select * into v_run
  from public.marketing_creative_council_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = 'CRITIQUE'
  for update;
  if not found then
    raise exception 'Creative Council completion invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_creative_council_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, 'CRITIQUE', true
  );
  select stage.structured_output into v_hook
  from public.marketing_creative_council_stages as stage
  where stage.organization_id = p_organization_id
    and stage.council_run_id = p_run_id
    and stage.stage = 'HOOK'
    and stage.status = 'SUCCEEDED';
  select stage.structured_output into v_script
  from public.marketing_creative_council_stages as stage
  where stage.organization_id = p_organization_id
    and stage.council_run_id = p_run_id
    and stage.stage = 'SCRIPT'
    and stage.status = 'SUCCEEDED';
  if v_hook is null or v_script is null then
    raise exception 'Creative Council prior stages missing' using errcode = '22023';
  end if;
  insert into public.marketing_creative_council_stages (
    organization_id, council_run_id, stage, status, ai_run_id, structured_output
  ) values (
    p_organization_id, p_run_id, 'CRITIQUE', 'SUCCEEDED', p_ai_run_id, p_critique
  );
  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || v_run.source_reel_idea_id::text,
    1501
  ));
  select coalesce(max(brief.version_number), 0) + 1 into v_version
  from public.marketing_reel_brief_versions as brief
  where brief.organization_id = p_organization_id
    and brief.source_reel_idea_id = v_run.source_reel_idea_id;
  select left(idea.title || ' — Creative Council', 240) into v_title
  from public.marketing_reel_ideas as idea
  where idea.organization_id = p_organization_id
    and idea.id = v_run.source_reel_idea_id;
  insert into public.marketing_reel_brief_versions (
    organization_id, council_run_id, source_reel_idea_id, version_number,
    title, primary_hook, spoken_script, script_sections, call_to_action,
    caption, visual_directions, critique, created_by
  ) values (
    p_organization_id, p_run_id, v_run.source_reel_idea_id, v_version,
    v_title, v_hook ->> 'primaryHook', v_script ->> 'spokenScript',
    v_script -> 'sections', v_script ->> 'callToAction',
    v_script ->> 'caption', v_script -> 'visualDirections', p_critique, p_actor_id
  ) returning id into v_brief_id;
  update public.marketing_creative_council_runs
  set status = 'SUCCEEDED', current_stage = 'COMPLETE', completed_at = now()
  where organization_id = p_organization_id and id = p_run_id;
  return jsonb_build_object(
    'briefId', v_brief_id,
    'runId', p_run_id,
    'versionNumber', v_version
  );
end;
$$;

create function public.fail_marketing_creative_council_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_stage public.marketing_creative_council_stage,
  p_failure_category public.ai_error_category,
  p_ai_run_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_stage = 'COMPLETE' then
    raise exception 'Creative Council failed stage invalid' using errcode = '22023';
  end if;
  perform 1 from public.marketing_creative_council_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = p_stage
  for update;
  if not found then return; end if;
  if p_ai_run_id is not null then
    perform private.assert_marketing_creative_council_ai_run(
      p_organization_id, p_actor_id, p_ai_run_id, p_stage, false
    );
  end if;
  insert into public.marketing_creative_council_stages (
    organization_id, council_run_id, stage, status, ai_run_id, failure_category
  ) values (
    p_organization_id, p_run_id, p_stage, 'FAILED', p_ai_run_id, p_failure_category
  );
  update public.marketing_creative_council_runs
  set status = 'FAILED', failed_stage = p_stage,
      failure_category = p_failure_category, completed_at = now()
  where organization_id = p_organization_id and id = p_run_id;
end;
$$;

revoke all on function private.marketing_creative_council_executable(uuid, uuid),
  private.assert_marketing_creative_council_ai_run(uuid, uuid, uuid, public.marketing_creative_council_stage, boolean),
  public.start_marketing_creative_council_run(uuid, uuid, uuid, uuid, jsonb, jsonb),
  public.record_marketing_creative_council_stage(uuid, uuid, uuid, public.marketing_creative_council_stage, uuid, jsonb),
  public.complete_marketing_creative_council_run(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_creative_council_run(uuid, uuid, uuid, public.marketing_creative_council_stage, public.ai_error_category, uuid)
from public, anon, authenticated;

grant execute on function public.start_marketing_creative_council_run(uuid, uuid, uuid, uuid, jsonb, jsonb),
  public.record_marketing_creative_council_stage(uuid, uuid, uuid, public.marketing_creative_council_stage, uuid, jsonb),
  public.complete_marketing_creative_council_run(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_creative_council_run(uuid, uuid, uuid, public.marketing_creative_council_stage, public.ai_error_category, uuid)
to service_role;
