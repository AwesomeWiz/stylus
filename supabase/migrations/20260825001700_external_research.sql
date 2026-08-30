create type public.marketing_external_research_status as enum (
  'QUEUED', 'RUNNING', 'SYNTHESIZING', 'SUCCEEDED', 'FAILED', 'CANCELLED'
);
create type public.marketing_external_research_adapter as enum ('hacker-news', 'rss-atom');
create type public.marketing_external_research_source_status as enum ('SUCCEEDED', 'FAILED');
create type public.marketing_external_research_source_failure as enum (
  'invalid_source', 'policy_denied', 'rate_limited', 'timeout',
  'transient_failure', 'permanent_failure', 'invalid_content_type',
  'oversized_response', 'malformed_source', 'no_results'
);

create table public.marketing_external_research_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null,
  invocation_key uuid not null,
  request_snapshot jsonb not null check (
    jsonb_typeof(request_snapshot) = 'object' and pg_column_size(request_snapshot) <= 16384
  ),
  status public.marketing_external_research_status not null default 'QUEUED',
  partial boolean not null default false,
  requested_source_count smallint not null check (requested_source_count between 1 and 3),
  successful_source_count smallint not null default 0 check (successful_source_count between 0 and 3),
  failed_source_count smallint not null default 0 check (failed_source_count between 0 and 3),
  retrieved_item_count smallint not null default 0 check (retrieved_item_count between 0 and 60),
  retained_item_count smallint not null default 0 check (retained_item_count between 0 and 20),
  dedupe_count smallint not null default 0 check (dedupe_count between 0 and 60),
  evidence_count smallint not null default 0 check (evidence_count between 0 and 20),
  fetched_bytes integer not null default 0 check (fetched_bytes between 0 and 4194304),
  normalized_characters integer not null default 0 check (normalized_characters between 0 and 24000),
  warning_categories text[] not null default '{}',
  failure_category public.job_error_category,
  failure_stage text check (failure_stage is null or failure_stage in ('retrieval','synthesis','execution')),
  synthesis_ai_run_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, job_id),
  unique (organization_id, created_by, invocation_key),
  foreign key (organization_id, job_id) references public.jobs(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, synthesis_ai_run_id) references public.ai_runs(organization_id, id) on delete restrict,
  check (cardinality(warning_categories) <= 10),
  check (
    (status = 'QUEUED' and started_at is null and completed_at is null and failure_category is null)
    or (status in ('RUNNING','SYNTHESIZING') and started_at is not null and completed_at is null and failure_category is null)
    or (status = 'SUCCEEDED' and started_at is not null and completed_at is not null and failure_category is null and synthesis_ai_run_id is not null)
    or (status in ('FAILED','CANCELLED') and completed_at is not null and failure_category is not null)
  )
);

create unique index marketing_external_research_one_active_org_idx
on public.marketing_external_research_runs(organization_id)
where status in ('QUEUED','RUNNING','SYNTHESIZING');
create index marketing_external_research_history_idx
on public.marketing_external_research_runs(organization_id, created_at desc);

create table public.marketing_external_research_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  source_key text not null check (source_key ~ '^SRC-([1-9]|[12][0-9]|30)$'),
  adapter public.marketing_external_research_adapter not null,
  status public.marketing_external_research_source_status not null,
  native_id text check (native_id is null or char_length(native_id) <= 500),
  canonical_url text check (canonical_url is null or (char_length(canonical_url) <= 1000 and canonical_url ~ '^https://')),
  title text check (title is null or char_length(title) <= 300),
  author text check (author is null or char_length(author) <= 120),
  published_at timestamptz,
  fetched_at timestamptz not null,
  content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  failure_category public.marketing_external_research_source_failure,
  safe_metadata jsonb not null default '{}' check (
    jsonb_typeof(safe_metadata) = 'object' and pg_column_size(safe_metadata) <= 4096
  ),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (run_id, source_key),
  foreign key (organization_id, run_id) references public.marketing_external_research_runs(organization_id, id) on delete restrict,
  check (
    (status = 'SUCCEEDED' and content_hash is not null and failure_category is null)
    or (status = 'FAILED' and content_hash is null and failure_category is not null)
  )
);

create table public.marketing_external_research_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  source_id uuid not null,
  evidence_id text not null check (evidence_id ~ '^EVID-([1-9]|1[0-9]|20)$'),
  evidence_type text not null check (evidence_type in ('DISCUSSION','FEED_ITEM')),
  excerpt text not null check (char_length(btrim(excerpt)) between 1 and 800),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (run_id, evidence_id),
  foreign key (organization_id, run_id) references public.marketing_external_research_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, source_id) references public.marketing_external_research_sources(organization_id, id) on delete restrict
);

create table public.marketing_external_research_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  version_number integer not null default 1 check (version_number = 1),
  schema_version text not null default 'marketing-external-research-report-v1'
    check (schema_version = 'marketing-external-research-report-v1'),
  structured_report jsonb not null check (
    jsonb_typeof(structured_report) = 'object' and pg_column_size(structured_report) <= 65536
  ),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (run_id),
  foreign key (organization_id, run_id) references public.marketing_external_research_runs(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict
);

alter table public.marketing_external_research_runs enable row level security;
alter table public.marketing_external_research_sources enable row level security;
alter table public.marketing_external_research_evidence enable row level security;
alter table public.marketing_external_research_reports enable row level security;

create policy marketing_external_research_runs_select
on public.marketing_external_research_runs for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_external_research_sources_select
on public.marketing_external_research_sources for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_external_research_evidence_select
on public.marketing_external_research_evidence for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_external_research_reports_select
on public.marketing_external_research_reports for select to authenticated
using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_external_research_runs,
  public.marketing_external_research_sources,
  public.marketing_external_research_evidence,
  public.marketing_external_research_reports from public, anon, authenticated;
grant select on public.marketing_external_research_runs,
  public.marketing_external_research_sources,
  public.marketing_external_research_evidence,
  public.marketing_external_research_reports to authenticated;

insert into public.job_definitions (
  job_type, plugin_id, capability, execution_class, priority, max_attempts,
  timeout_seconds, idempotency_mode, concurrency_group
) values (
  'marketing.external-research.run', 'marketing',
  'marketing.external-research.execute', 'SERVERLESS', 60, 1, 120,
  'REQUIRED', 'marketing.external-research'
);

create function public.enqueue_marketing_external_research(
  p_organization_id uuid,
  p_actor_id uuid,
  p_request_snapshot jsonb,
  p_invocation_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_external_research_runs%rowtype;
  v_job public.jobs%rowtype;
  v_run_id uuid := gen_random_uuid();
  v_job_id uuid := gen_random_uuid();
  v_source_count integer;
begin
  if p_actor_id is null or p_organization_id is null or not exists (
    select 1 from public.memberships as membership
    join public.organization_plugins as plugin
      on plugin.organization_id = membership.organization_id
     and plugin.plugin_id = 'marketing' and plugin.enabled
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_id and membership.removed_at is null
      and membership.role in ('OWNER','ADMIN','MEMBER')
  ) then
    raise exception 'External research execution denied' using errcode = '42501';
  end if;
  if p_invocation_key is null or jsonb_typeof(p_request_snapshot) <> 'object'
    or pg_column_size(p_request_snapshot) > 16384
    or char_length(btrim(p_request_snapshot->>'question')) not between 10 and 500
    or jsonb_typeof(p_request_snapshot->'queryTerms') <> 'array'
    or jsonb_array_length(p_request_snapshot->'queryTerms') not between 1 and 5
    or coalesce((select bool_and(jsonb_typeof(term.value) = 'string' and char_length(btrim(term.value#>>'{}')) between 1 and 80)
      from jsonb_array_elements(p_request_snapshot->'queryTerms') as term), false) is not true
    or p_request_snapshot->>'objective' not in (
      'AUDIENCE_PAINS','AUDIENCE_LANGUAGE','RECURRING_QUESTIONS','OBJECTIONS',
      'TREND_EVIDENCE','CONTENT_OBSERVATIONS','COMPETITOR_PUBLIC'
    )
    or jsonb_typeof(p_request_snapshot->'rssFeedUrls') <> 'array'
    or jsonb_array_length(p_request_snapshot->'rssFeedUrls') > 2 then
    raise exception 'External research request invalid' using errcode = '22023';
  end if;
  v_source_count := case when p_request_snapshot->>'hackerNewsStream' in ('top','new','ask') then 1 else 0 end
    + jsonb_array_length(p_request_snapshot->'rssFeedUrls');
  if v_source_count not between 1 and 3 then
    raise exception 'External research sources invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_request_snapshot->'rssFeedUrls') as feed(url)
    where char_length(feed.url) > 500 or feed.url !~ '^https://'
  ) then raise exception 'External research feed invalid' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 1700));
  select * into v_run from public.marketing_external_research_runs as run
  where run.organization_id = p_organization_id and run.created_by = p_actor_id
    and run.invocation_key = p_invocation_key;
  if found then
    return jsonb_build_object('runId',v_run.id,'jobId',v_run.job_id,'duplicate',true);
  end if;
  if exists (select 1 from public.marketing_external_research_runs as run
    where run.organization_id = p_organization_id
      and run.status in ('QUEUED','RUNNING','SYNTHESIZING')) then
    raise exception 'An external research run is already active' using errcode = '54000';
  end if;
  if (select count(*) from public.marketing_external_research_runs as run
    where run.organization_id = p_organization_id
      and run.created_at >= now() - interval '1 hour') >= 5 then
    raise exception 'External research hourly limit reached' using errcode = '54000';
  end if;
  insert into public.jobs (
    id, organization_id, plugin_id, job_type, capability, execution_class,
    status, priority, created_by, scheduled_at, next_attempt_at, max_attempts,
    timeout_seconds, input_metadata, idempotency_key, concurrency_group
  ) values (
    v_job_id, p_organization_id, 'marketing', 'marketing.external-research.run',
    'marketing.external-research.execute', 'SERVERLESS', 'QUEUED', 60, p_actor_id,
    now(), now(), 1, 120, jsonb_build_object('runId',v_run_id),
    'external-research/' || p_invocation_key::text, 'marketing.external-research'
  ) returning * into v_job;
  insert into public.marketing_external_research_runs (
    id, organization_id, job_id, invocation_key, request_snapshot,
    requested_source_count, created_by
  ) values (
    v_run_id, p_organization_id, v_job.id, p_invocation_key,
    p_request_snapshot, v_source_count, p_actor_id
  ) returning * into v_run;
  return jsonb_build_object('runId',v_run.id,'jobId',v_job.id,'duplicate',false);
end;
$$;

create function public.begin_marketing_external_research(
  p_job_id uuid, p_run_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.marketing_external_research_runs as run
  set status = 'RUNNING', started_at = now()
  from public.jobs as job
  where run.id = p_run_id and run.job_id = p_job_id
    and job.id = p_job_id and job.organization_id = run.organization_id
    and job.job_type = 'marketing.external-research.run'
    and job.capability = 'marketing.external-research.execute'
    and job.plugin_id = 'marketing' and job.execution_class = 'SERVERLESS'
    and job.status = 'RUNNING' and job.lease_expires_at > now()
    and run.status = 'QUEUED'
    and exists (select 1 from public.organization_plugins as plugin
      where plugin.organization_id=run.organization_id and plugin.plugin_id='marketing' and plugin.enabled)
    and exists (select 1 from public.memberships as membership
      where membership.organization_id=run.organization_id and membership.user_id=run.created_by
        and membership.removed_at is null and membership.role in ('OWNER','ADMIN','MEMBER'));
  if not found then raise exception 'External research start denied' using errcode='42501'; end if;
end;
$$;

create function public.record_marketing_external_research_retrieval(
  p_job_id uuid, p_run_id uuid, p_sources jsonb, p_evidence jsonb,
  p_partial boolean, p_warning_categories text[], p_retrieved_count integer,
  p_dedupe_count integer, p_fetched_bytes integer, p_normalized_characters integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_source jsonb; v_evidence jsonb; v_source_id uuid;
begin
  if jsonb_typeof(p_sources)<>'array' or jsonb_array_length(p_sources)>30
    or jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence) not between 0 and 20
    or cardinality(coalesce(p_warning_categories,'{}'))>10
    or p_retrieved_count not between 0 and 60 or p_dedupe_count not between 0 and 60
    or p_fetched_bytes not between 0 and 4194304
    or p_normalized_characters not between 0 and 24000 then
    raise exception 'External research retrieval invalid' using errcode='22023';
  end if;
  perform 1 from public.marketing_external_research_runs as run
  join public.jobs as job on job.id=run.job_id and job.organization_id=run.organization_id
  where run.id=p_run_id and run.job_id=p_job_id and run.status='RUNNING'
    and job.status='RUNNING' and job.lease_expires_at>now()
    and exists(select 1 from public.organization_plugins as plugin
      where plugin.organization_id=run.organization_id and plugin.plugin_id='marketing' and plugin.enabled)
    and exists(select 1 from public.memberships as membership
      where membership.organization_id=run.organization_id and membership.user_id=run.created_by
        and membership.removed_at is null and membership.role in ('OWNER','ADMIN','MEMBER'))
  for update of run;
  if not found then raise exception 'External research retrieval denied' using errcode='42501'; end if;
  for v_source in select value from jsonb_array_elements(p_sources) loop
    insert into public.marketing_external_research_sources(
      organization_id,run_id,source_key,adapter,status,native_id,canonical_url,
      title,author,published_at,fetched_at,content_hash,failure_category,safe_metadata
    ) select run.organization_id,p_run_id,v_source->>'sourceKey',
      (v_source->>'adapter')::public.marketing_external_research_adapter,
      (v_source->>'status')::public.marketing_external_research_source_status,
      nullif(v_source->>'nativeId',''),nullif(v_source->>'canonicalUrl',''),
      nullif(v_source->>'title',''),nullif(v_source->>'author',''),
      nullif(v_source->>'publishedAt','')::timestamptz,(v_source->>'fetchedAt')::timestamptz,
      nullif(v_source->>'contentHash',''),
      nullif(v_source->>'failureCategory','')::public.marketing_external_research_source_failure,
      coalesce(v_source->'safeMetadata','{}')
    from public.marketing_external_research_runs as run where run.id=p_run_id;
  end loop;
  for v_evidence in select value from jsonb_array_elements(p_evidence) loop
    select source.id into v_source_id from public.marketing_external_research_sources as source
    where source.run_id=p_run_id and source.source_key=v_evidence->>'sourceKey';
    if v_source_id is null then raise exception 'External research evidence source invalid' using errcode='22023'; end if;
    insert into public.marketing_external_research_evidence(
      organization_id,run_id,source_id,evidence_id,evidence_type,excerpt
    ) select run.organization_id,p_run_id,v_source_id,v_evidence->>'evidenceId',
      v_evidence->>'evidenceType',v_evidence->>'excerpt'
    from public.marketing_external_research_runs as run where run.id=p_run_id;
  end loop;
  update public.marketing_external_research_runs as run set
    status=case when jsonb_array_length(p_evidence)>0
      then 'SYNTHESIZING'::public.marketing_external_research_status
      else 'RUNNING'::public.marketing_external_research_status end,
    partial=p_partial,
    successful_source_count=(select count(distinct source.safe_metadata->>'sourceRequest')
      from public.marketing_external_research_sources as source where source.run_id=p_run_id and source.status='SUCCEEDED'),
    failed_source_count=(select count(*) from public.marketing_external_research_sources as source where source.run_id=p_run_id and source.status='FAILED'),
    retrieved_item_count=p_retrieved_count, retained_item_count=jsonb_array_length(p_evidence),
    dedupe_count=p_dedupe_count,evidence_count=jsonb_array_length(p_evidence),
    fetched_bytes=p_fetched_bytes,normalized_characters=p_normalized_characters,
    warning_categories=coalesce(p_warning_categories,'{}')
  where run.id=p_run_id;
end;
$$;

create function public.start_marketing_external_research_ai_run(
  p_job_id uuid, p_id uuid, p_operation text, p_capability text,
  p_requested_tier public.ai_logical_tier, p_trace_metadata jsonb
) returns public.ai_runs language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype; v_run public.ai_runs%rowtype;
begin
  select * into v_job from public.jobs as job where job.id=p_job_id
    and job.job_type='marketing.external-research.run' and job.plugin_id='marketing'
    and job.capability='marketing.external-research.execute' and job.status='RUNNING'
    and job.lease_expires_at>now();
  if not found or p_capability<>'marketing.external-research.execute'
    or p_operation<>'generate_structured' or p_requested_tier<>'BALANCED'
    or not exists(select 1 from public.marketing_external_research_runs as research
      where research.job_id=v_job.id and research.organization_id=v_job.organization_id
        and research.status='SYNTHESIZING') then
    raise exception 'Trusted external research AI continuation denied' using errcode='42501';
  end if;
  insert into public.ai_runs(id,organization_id,actor_id,plugin_id,operation,capability,
    memory_domains,requested_tier,status,trace_metadata)
  values(p_id,v_job.organization_id,v_job.created_by,'marketing',p_operation,p_capability,
    array['company','marketing'],p_requested_tier,'RUNNING',coalesce(p_trace_metadata,'{}'))
  returning * into v_run;
  return v_run;
end;
$$;

create function public.complete_marketing_external_research_ai_run(
  p_job_id uuid, p_id uuid, p_status public.ai_run_status, p_selected_model_id text,
  p_provider_id text, p_is_remote boolean, p_duration_ms integer, p_input_tokens integer,
  p_output_tokens integer, p_total_tokens integer, p_estimated_cost_usd numeric,
  p_error_category public.ai_error_category, p_trace_metadata jsonb
) returns public.ai_runs language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype; v_run public.ai_runs%rowtype;
begin
  select * into v_job from public.jobs as job where job.id=p_job_id
    and job.job_type='marketing.external-research.run'
    and job.plugin_id='marketing' and job.capability='marketing.external-research.execute'
    and job.execution_class='SERVERLESS' and job.status='RUNNING'
    and job.lease_expires_at>now();
  if not found or p_status not in ('SUCCEEDED','FAILED','CANCELLED','TIMED_OUT') then
    raise exception 'Trusted external research AI completion denied' using errcode='42501'; end if;
  update public.ai_runs as ai set status=p_status,selected_model_id=p_selected_model_id,
    provider_id=p_provider_id,is_remote=p_is_remote,completed_at=now(),duration_ms=p_duration_ms,
    input_tokens=p_input_tokens,output_tokens=p_output_tokens,total_tokens=p_total_tokens,
    estimated_cost_usd=p_estimated_cost_usd,error_category=p_error_category,
    trace_metadata=coalesce(p_trace_metadata,'{}')
  where ai.id=p_id and ai.organization_id=v_job.organization_id and ai.actor_id=v_job.created_by
    and ai.plugin_id='marketing' and ai.capability='marketing.external-research.execute'
    and ai.status='RUNNING' returning * into v_run;
  if not found then raise exception 'Active external research AI run not found' using errcode='42501'; end if;
  return v_run;
end;
$$;

create function public.complete_marketing_external_research(
  p_job_id uuid, p_run_id uuid, p_ai_run_id uuid, p_report jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_run public.marketing_external_research_runs%rowtype; v_report_id uuid; v_section text;
begin
  if jsonb_typeof(p_report)<>'object' or pg_column_size(p_report)>65536 then
    raise exception 'External research report invalid' using errcode='22023'; end if;
  select * into v_run from public.marketing_external_research_runs as run
  where run.id=p_run_id and run.job_id=p_job_id and run.status='SYNTHESIZING' for update;
  if not found or not exists(select 1 from public.jobs as job
    where job.id=p_job_id and job.organization_id=v_run.organization_id
      and job.job_type='marketing.external-research.run'
      and job.capability='marketing.external-research.execute'
      and job.plugin_id='marketing' and job.execution_class='SERVERLESS'
      and job.status='RUNNING' and job.lease_expires_at>now())
    or not exists(select 1 from public.organization_plugins as plugin
      where plugin.organization_id=v_run.organization_id and plugin.plugin_id='marketing' and plugin.enabled)
    or not exists(select 1 from public.memberships as membership
      where membership.organization_id=v_run.organization_id and membership.user_id=v_run.created_by
        and membership.removed_at is null and membership.role in ('OWNER','ADMIN','MEMBER'))
    or not exists(select 1 from public.ai_runs as ai
    where ai.id=p_ai_run_id and ai.organization_id=v_run.organization_id
      and ai.actor_id=v_run.created_by and ai.plugin_id='marketing'
      and ai.capability='marketing.external-research.execute'
      and ai.operation='generate_structured' and ai.requested_tier='BALANCED'
      and ai.status='SUCCEEDED') then
    raise exception 'External research completion denied' using errcode='42501'; end if;
  foreach v_section in array array['findings','patterns','disagreements','recommendations'] loop
    if jsonb_typeof(p_report->v_section)<>'array' or exists(
      select 1 from jsonb_array_elements(p_report->v_section) as item
      cross join lateral jsonb_array_elements_text(item->'supportedBy') as reference(evidence_id)
      where not exists(select 1 from public.marketing_external_research_evidence as evidence
        where evidence.run_id=p_run_id and evidence.evidence_id=reference.evidence_id)
    ) then raise exception 'External research evidence reference invalid' using errcode='22023'; end if;
  end loop;
  insert into public.marketing_external_research_reports(
    organization_id,run_id,structured_report,created_by
  ) values(v_run.organization_id,p_run_id,p_report,v_run.created_by) returning id into v_report_id;
  update public.marketing_external_research_runs set status='SUCCEEDED',
    synthesis_ai_run_id=p_ai_run_id,completed_at=now()
  where id=p_run_id;
  return v_report_id;
end;
$$;

create function public.fail_marketing_external_research(
  p_job_id uuid, p_run_id uuid, p_failure_category public.job_error_category,
  p_failure_stage text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_failure_stage not in ('retrieval','synthesis','execution') then
    raise exception 'External research failure stage invalid' using errcode='22023'; end if;
  update public.marketing_external_research_runs as run set
    status=case when p_failure_category='cancelled' then 'CANCELLED'::public.marketing_external_research_status else 'FAILED'::public.marketing_external_research_status end,
    failure_category=p_failure_category,failure_stage=p_failure_stage,completed_at=now(),
    started_at=coalesce(started_at,now())
  where run.id=p_run_id and run.job_id=p_job_id
    and run.status in ('QUEUED','RUNNING','SYNTHESIZING');
end;
$$;

create function private.sync_external_research_job_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.job_type='marketing.external-research.run'
    and new.status in ('FAILED','CANCELLED','TIMED_OUT','DEAD_LETTER') then
    perform public.fail_marketing_external_research(
      new.id,(new.input_metadata->>'runId')::uuid,
      coalesce(new.error_category,'internal_error'::public.job_error_category),'execution'
    );
  end if;
  return new;
end;
$$;
create trigger sync_external_research_job_status
after update of status on public.jobs
for each row execute function private.sync_external_research_job_status();

create function private.reject_external_research_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'External research history is immutable' using errcode='55000'; end;
$$;
create trigger marketing_external_research_sources_immutable
before update or delete on public.marketing_external_research_sources
for each row execute function private.reject_external_research_history_mutation();
create trigger marketing_external_research_evidence_immutable
before update or delete on public.marketing_external_research_evidence
for each row execute function private.reject_external_research_history_mutation();
create trigger marketing_external_research_reports_immutable
before update or delete on public.marketing_external_research_reports
for each row execute function private.reject_external_research_history_mutation();

revoke all on function public.enqueue_marketing_external_research(uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.enqueue_marketing_external_research(uuid,uuid,jsonb,uuid) to service_role;
revoke all on function public.begin_marketing_external_research(uuid,uuid),
  public.record_marketing_external_research_retrieval(uuid,uuid,jsonb,jsonb,boolean,text[],integer,integer,integer,integer),
  public.start_marketing_external_research_ai_run(uuid,uuid,text,text,public.ai_logical_tier,jsonb),
  public.complete_marketing_external_research_ai_run(uuid,uuid,public.ai_run_status,text,text,boolean,integer,integer,integer,integer,numeric,public.ai_error_category,jsonb),
  public.complete_marketing_external_research(uuid,uuid,uuid,jsonb),
  public.fail_marketing_external_research(uuid,uuid,public.job_error_category,text)
from public,anon,authenticated;
grant execute on function public.begin_marketing_external_research(uuid,uuid),
  public.record_marketing_external_research_retrieval(uuid,uuid,jsonb,jsonb,boolean,text[],integer,integer,integer,integer),
  public.start_marketing_external_research_ai_run(uuid,uuid,text,text,public.ai_logical_tier,jsonb),
  public.complete_marketing_external_research_ai_run(uuid,uuid,public.ai_run_status,text,text,boolean,integer,integer,integer,integer,numeric,public.ai_error_category,jsonb),
  public.complete_marketing_external_research(uuid,uuid,uuid,jsonb),
  public.fail_marketing_external_research(uuid,uuid,public.job_error_category,text)
to service_role;
revoke all on function private.sync_external_research_job_status(),
  private.reject_external_research_history_mutation() from public,anon,authenticated;
