create type public.marketing_strategic_review_status as enum (
  'RUNNING', 'SUCCEEDED', 'FAILED'
);
create type public.marketing_strategic_review_stage as enum (
  'AUDIENCE', 'BRAND', 'STRATEGY', 'CHALLENGE', 'JUDGE', 'COMPLETE'
);
create type public.marketing_strategic_review_stage_status as enum (
  'SUCCEEDED', 'FAILED'
);

create table public.marketing_strategic_review_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_id text not null default 'marketing' check (plugin_id = 'marketing'),
  source_reel_brief_version_id uuid not null,
  source_reel_idea_id uuid not null,
  idempotency_key uuid not null,
  workflow_version text not null default 'strategic-review-v1'
    check (workflow_version = 'strategic-review-v1'),
  schema_version text not null default 'strategic-council-review-v1'
    check (schema_version = 'strategic-council-review-v1'),
  context_snapshot jsonb not null check (
    jsonb_typeof(context_snapshot) = 'object'
    and pg_column_size(context_snapshot) <= 49152
  ),
  status public.marketing_strategic_review_status not null default 'RUNNING',
  current_stage public.marketing_strategic_review_stage not null default 'AUDIENCE',
  failed_stage public.marketing_strategic_review_stage,
  failure_category public.ai_error_category,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, created_by, idempotency_key),
  foreign key (organization_id, source_reel_brief_version_id)
    references public.marketing_reel_brief_versions(organization_id, id) on delete restrict,
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

create unique index marketing_strategic_review_one_active_run_idx
on public.marketing_strategic_review_runs(
  organization_id, source_reel_brief_version_id, created_by
) where status = 'RUNNING';
create index marketing_strategic_review_history_idx
on public.marketing_strategic_review_runs(
  organization_id, source_reel_brief_version_id, created_at desc
);

create table public.marketing_strategic_review_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  strategic_review_run_id uuid not null,
  stage public.marketing_strategic_review_stage not null check (stage <> 'COMPLETE'),
  status public.marketing_strategic_review_stage_status not null,
  ai_run_id uuid,
  structured_output jsonb check (
    structured_output is null or (
      jsonb_typeof(structured_output) = 'object'
      and pg_column_size(structured_output) <= 65536
    )
  ),
  failure_category public.ai_error_category,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (strategic_review_run_id, stage),
  foreign key (organization_id, strategic_review_run_id)
    references public.marketing_strategic_review_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, ai_run_id)
    references public.ai_runs(organization_id, id) on delete restrict,
  check (
    (status = 'SUCCEEDED' and ai_run_id is not null and structured_output is not null and failure_category is null)
    or (status = 'FAILED' and structured_output is null and failure_category is not null)
  )
);

create table public.marketing_strategic_council_review_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  strategic_review_run_id uuid not null,
  source_reel_brief_version_id uuid not null,
  source_reel_idea_id uuid not null,
  version_number integer not null check (version_number between 1 and 10000),
  schema_version text not null default 'strategic-council-review-v1'
    check (schema_version = 'strategic-council-review-v1'),
  structured_review jsonb not null check (
    jsonb_typeof(structured_review) = 'object'
    and pg_column_size(structured_review) <= 65536
  ),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, source_reel_brief_version_id, version_number),
  unique (strategic_review_run_id),
  foreign key (organization_id, strategic_review_run_id)
    references public.marketing_strategic_review_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, source_reel_brief_version_id)
    references public.marketing_reel_brief_versions(organization_id, id) on delete restrict,
  foreign key (organization_id, source_reel_idea_id)
    references public.marketing_reel_ideas(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

alter table public.marketing_strategic_review_runs enable row level security;
alter table public.marketing_strategic_review_stages enable row level security;
alter table public.marketing_strategic_council_review_versions enable row level security;

create policy marketing_strategic_review_runs_select
on public.marketing_strategic_review_runs for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_strategic_review_stages_select
on public.marketing_strategic_review_stages for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_strategic_council_review_versions_select
on public.marketing_strategic_council_review_versions for select to authenticated
using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_strategic_review_runs,
  public.marketing_strategic_review_stages,
  public.marketing_strategic_council_review_versions from public, anon, authenticated;
grant select on public.marketing_strategic_review_runs,
  public.marketing_strategic_review_stages,
  public.marketing_strategic_council_review_versions to authenticated;

create function private.assert_marketing_strategic_review_ai_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_ai_run_id uuid,
  p_stage public.marketing_strategic_review_stage,
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
        when p_stage in ('AUDIENCE', 'BRAND') then 'BALANCED'::public.ai_logical_tier
        else 'REASONING'::public.ai_logical_tier
      end
      and (
        (p_require_success and ai.status = 'SUCCEEDED')
        or (not p_require_success and ai.status in ('SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'))
      )
  ) then
    raise exception 'Strategic review AI run provenance invalid' using errcode = '22023';
  end if;
end;
$$;

create function public.start_marketing_strategic_review(
  p_organization_id uuid,
  p_actor_id uuid,
  p_source_reel_brief_version_id uuid,
  p_idempotency_key uuid,
  p_context_snapshot jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_strategic_review_runs%rowtype;
  v_brief public.marketing_reel_brief_versions%rowtype;
  v_snapshot_brief_id uuid;
begin
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Strategic review execution denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_context_snapshot) <> 'object'
     or pg_column_size(p_context_snapshot) > 49152 then
    raise exception 'Strategic review context invalid' using errcode = '22023';
  end if;
  begin
    v_snapshot_brief_id := (p_context_snapshot #>> '{reelBrief,sourceReelBriefVersionId}')::uuid;
  exception when others then
    raise exception 'Strategic review source snapshot invalid' using errcode = '22023';
  end;
  if v_snapshot_brief_id <> p_source_reel_brief_version_id then
    raise exception 'Strategic review source mismatch' using errcode = '22023';
  end if;
  select * into v_brief
  from public.marketing_reel_brief_versions as brief
  where brief.organization_id = p_organization_id
    and brief.id = p_source_reel_brief_version_id;
  if not found
     or (p_context_snapshot #>> '{reelBrief,versionNumber}')::integer <> v_brief.version_number
     or (p_context_snapshot #>> '{reelBrief,sourceReelIdeaId}')::uuid <> v_brief.source_reel_idea_id then
    raise exception 'Reel Brief version is not eligible' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_source_reel_brief_version_id::text || ':' || p_actor_id::text,
    1600
  ));

  select * into v_run
  from public.marketing_strategic_review_runs as run
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
  from public.marketing_strategic_review_runs as run
  where run.organization_id = p_organization_id
    and run.source_reel_brief_version_id = p_source_reel_brief_version_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING';
  if found then
    return jsonb_build_object(
      'runId', v_run.id,
      'shouldExecute', false,
      'status', v_run.status
    );
  end if;

  insert into public.marketing_strategic_review_runs (
    organization_id, source_reel_brief_version_id, source_reel_idea_id,
    idempotency_key, context_snapshot, created_by
  ) values (
    p_organization_id, p_source_reel_brief_version_id, v_brief.source_reel_idea_id,
    p_idempotency_key, p_context_snapshot, p_actor_id
  ) returning * into v_run;

  return jsonb_build_object(
    'runId', v_run.id,
    'shouldExecute', true,
    'status', v_run.status
  );
end;
$$;

create function public.record_marketing_strategic_review_stage(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_stage public.marketing_strategic_review_stage,
  p_ai_run_id uuid,
  p_structured_output jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v_next public.marketing_strategic_review_stage;
begin
  if p_stage not in ('AUDIENCE', 'BRAND', 'STRATEGY', 'CHALLENGE')
     or jsonb_typeof(p_structured_output) <> 'object'
     or pg_column_size(p_structured_output) > 65536 then
    raise exception 'Strategic review stage invalid' using errcode = '22023';
  end if;
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Strategic review execution denied' using errcode = '42501';
  end if;
  perform 1 from public.marketing_strategic_review_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = p_stage
  for update;
  if not found then
    raise exception 'Strategic review stage transition invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_strategic_review_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, p_stage, true
  );
  insert into public.marketing_strategic_review_stages (
    organization_id, strategic_review_run_id, stage, status, ai_run_id, structured_output
  ) values (
    p_organization_id, p_run_id, p_stage, 'SUCCEEDED', p_ai_run_id, p_structured_output
  );
  v_next := case p_stage
    when 'AUDIENCE' then 'BRAND'::public.marketing_strategic_review_stage
    when 'BRAND' then 'STRATEGY'::public.marketing_strategic_review_stage
    when 'STRATEGY' then 'CHALLENGE'::public.marketing_strategic_review_stage
    else 'JUDGE'::public.marketing_strategic_review_stage
  end;
  update public.marketing_strategic_review_runs
  set current_stage = v_next
  where organization_id = p_organization_id and id = p_run_id;
end;
$$;

create function public.complete_marketing_strategic_review(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_ai_run_id uuid,
  p_review jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_strategic_review_runs%rowtype;
  v_version integer;
  v_review_id uuid;
begin
  if jsonb_typeof(p_review) <> 'object' or pg_column_size(p_review) > 65536 then
    raise exception 'Strategic Council Review invalid' using errcode = '22023';
  end if;
  if not private.marketing_creative_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Strategic review execution denied' using errcode = '42501';
  end if;
  select * into v_run
  from public.marketing_strategic_review_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = 'JUDGE'
  for update;
  if not found then
    raise exception 'Strategic review completion invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_strategic_review_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, 'JUDGE', true
  );
  if (
    select count(*) from public.marketing_strategic_review_stages as stage
    where stage.organization_id = p_organization_id
      and stage.strategic_review_run_id = p_run_id
      and stage.stage in ('AUDIENCE', 'BRAND', 'STRATEGY', 'CHALLENGE')
      and stage.status = 'SUCCEEDED'
  ) <> 4 then
    raise exception 'Strategic review prior stages missing' using errcode = '22023';
  end if;
  insert into public.marketing_strategic_review_stages (
    organization_id, strategic_review_run_id, stage, status, ai_run_id, structured_output
  ) values (
    p_organization_id, p_run_id, 'JUDGE', 'SUCCEEDED', p_ai_run_id, p_review
  );
  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || v_run.source_reel_brief_version_id::text,
    1601
  ));
  select coalesce(max(review.version_number), 0) + 1 into v_version
  from public.marketing_strategic_council_review_versions as review
  where review.organization_id = p_organization_id
    and review.source_reel_brief_version_id = v_run.source_reel_brief_version_id;
  insert into public.marketing_strategic_council_review_versions (
    organization_id, strategic_review_run_id, source_reel_brief_version_id,
    source_reel_idea_id, version_number, structured_review, created_by
  ) values (
    p_organization_id, p_run_id, v_run.source_reel_brief_version_id,
    v_run.source_reel_idea_id, v_version, p_review, p_actor_id
  ) returning id into v_review_id;
  update public.marketing_strategic_review_runs
  set status = 'SUCCEEDED', current_stage = 'COMPLETE', completed_at = now()
  where organization_id = p_organization_id and id = p_run_id;
  return jsonb_build_object(
    'reviewId', v_review_id,
    'runId', p_run_id,
    'versionNumber', v_version
  );
end;
$$;

create function public.fail_marketing_strategic_review(
  p_organization_id uuid,
  p_actor_id uuid,
  p_run_id uuid,
  p_stage public.marketing_strategic_review_stage,
  p_failure_category public.ai_error_category,
  p_ai_run_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_stage = 'COMPLETE' then
    raise exception 'Strategic review failed stage invalid' using errcode = '22023';
  end if;
  perform 1 from public.marketing_strategic_review_runs as run
  where run.organization_id = p_organization_id
    and run.id = p_run_id
    and run.created_by = p_actor_id
    and run.status = 'RUNNING'
    and run.current_stage = p_stage
  for update;
  if not found then return; end if;
  if p_ai_run_id is not null then
    perform private.assert_marketing_strategic_review_ai_run(
      p_organization_id, p_actor_id, p_ai_run_id, p_stage, false
    );
  end if;
  insert into public.marketing_strategic_review_stages (
    organization_id, strategic_review_run_id, stage, status, ai_run_id, failure_category
  ) values (
    p_organization_id, p_run_id, p_stage, 'FAILED', p_ai_run_id, p_failure_category
  );
  update public.marketing_strategic_review_runs
  set status = 'FAILED', failed_stage = p_stage,
      failure_category = p_failure_category, completed_at = now()
  where organization_id = p_organization_id and id = p_run_id;
end;
$$;

revoke all on function private.assert_marketing_strategic_review_ai_run(uuid, uuid, uuid, public.marketing_strategic_review_stage, boolean),
  public.start_marketing_strategic_review(uuid, uuid, uuid, uuid, jsonb),
  public.record_marketing_strategic_review_stage(uuid, uuid, uuid, public.marketing_strategic_review_stage, uuid, jsonb),
  public.complete_marketing_strategic_review(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_strategic_review(uuid, uuid, uuid, public.marketing_strategic_review_stage, public.ai_error_category, uuid)
from public, anon, authenticated;

grant execute on function public.start_marketing_strategic_review(uuid, uuid, uuid, uuid, jsonb),
  public.record_marketing_strategic_review_stage(uuid, uuid, uuid, public.marketing_strategic_review_stage, uuid, jsonb),
  public.complete_marketing_strategic_review(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_strategic_review(uuid, uuid, uuid, public.marketing_strategic_review_stage, public.ai_error_category, uuid)
to service_role;
