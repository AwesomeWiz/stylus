-- TASK-017C: deterministic fashion source plans and typed marketing intelligence.

alter type public.marketing_external_research_adapter
  add value if not exists 'reddit';
alter type public.marketing_external_research_adapter
  add value if not exists 'fashion-editorial';

alter table public.marketing_external_research_evidence
  drop constraint marketing_external_research_evidence_evidence_type_check;
alter table public.marketing_external_research_evidence
  add constraint marketing_external_research_evidence_evidence_type_check
    check (evidence_type in (
      'DISCUSSION', 'FEED_ITEM', 'HN_STORY', 'HN_TEXT', 'HN_COMMENT',
      'ARTICLE_CONTENT', 'REDDIT_POST', 'REDDIT_COMMENT'
    ));

alter table public.marketing_external_research_reports
  drop constraint marketing_external_research_reports_schema_version_check;
alter table public.marketing_external_research_reports
  add constraint marketing_external_research_reports_schema_version_check
    check (schema_version in (
      'marketing-external-research-report-v1',
      'marketing-fashion-research-report-v1'
    ));

-- A source family may produce several bounded item/article/comment request
-- observations. The selected family count remains capped at three, while safe
-- operational success/failure observation counts may reach the existing
-- 30-source persistence ceiling.
alter table public.marketing_external_research_runs
  drop constraint marketing_external_research_runs_successful_source_count_check,
  drop constraint marketing_external_research_runs_failed_source_count_check;
alter table public.marketing_external_research_runs
  add constraint marketing_external_research_runs_successful_source_count_check
    check (successful_source_count between 0 and 30),
  add constraint marketing_external_research_runs_failed_source_count_check
    check (failed_source_count between 0 and 30);

create or replace function public.enqueue_marketing_external_research(
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
  v_is_fashion boolean;
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
    or coalesce((
      select bool_and(
        jsonb_typeof(term.value) = 'string'
        and char_length(btrim(term.value#>>'{}')) between 1 and 80
      ) from jsonb_array_elements(p_request_snapshot->'queryTerms') as term
    ), false) is not true then
    raise exception 'External research request invalid' using errcode = '22023';
  end if;

  v_is_fashion := p_request_snapshot ? 'intent';
  if v_is_fashion then
    if p_request_snapshot->>'intent' not in (
      'AUDIENCE_PAIN','AUDIENCE_DESIRE','AUDIENCE_LANGUAGE',
      'PURCHASE_OBJECTION','QUESTION_DEMAND','BELIEF_OR_MISCONCEPTION',
      'CONTROVERSY_OR_DEBATE','TREND_SIGNAL','COMPETITOR_SIGNAL','FASHION_TECH'
    ) or jsonb_typeof(p_request_snapshot->'plan') <> 'object'
      or p_request_snapshot->'plan'->>'version' <> 'marketing-fashion-source-plan-v1'
      or p_request_snapshot->'plan'->>'intent' <> p_request_snapshot->>'intent'
      or jsonb_typeof(p_request_snapshot->'plan'->'selectedSourceFamilies') <> 'array'
      or jsonb_array_length(p_request_snapshot->'plan'->'selectedSourceFamilies') not between 1 and 3
      or (select count(distinct family.value#>>'{}')
          from jsonb_array_elements(p_request_snapshot->'plan'->'selectedSourceFamilies') as family)
         <> jsonb_array_length(p_request_snapshot->'plan'->'selectedSourceFamilies')
      or exists (
        select 1
        from jsonb_array_elements_text(p_request_snapshot->'plan'->'selectedSourceFamilies') as family(value)
        where family.value not in ('REDDIT','EDITORIAL','HACKER_NEWS')
      )
      or jsonb_typeof(p_request_snapshot->'plan'->'reasonCodes') <> 'array'
      or jsonb_array_length(p_request_snapshot->'plan'->'reasonCodes') not between 1 and 7
      or jsonb_typeof(p_request_snapshot->'plan'->'reddit') <> 'object'
      or jsonb_typeof(p_request_snapshot->'plan'->'reddit'->'communityIds') <> 'array'
      or jsonb_array_length(p_request_snapshot->'plan'->'reddit'->'communityIds') > 2
      or jsonb_typeof(p_request_snapshot->'plan'->'reddit'->'queryVariants') <> 'array'
      or jsonb_array_length(p_request_snapshot->'plan'->'reddit'->'queryVariants') > 2
      or jsonb_typeof(p_request_snapshot->'plan'->'editorial') <> 'object'
      or jsonb_typeof(p_request_snapshot->'plan'->'editorial'->'sourceIds') <> 'array'
      or jsonb_array_length(p_request_snapshot->'plan'->'editorial'->'sourceIds') > 2
      or jsonb_typeof(p_request_snapshot->'plan'->'editorial'->'includeSearchDiscovery') <> 'boolean'
      or (
        p_request_snapshot->>'intent' = 'FASHION_TECH'
        and not (p_request_snapshot->'plan'->'selectedSourceFamilies' @> '["HACKER_NEWS"]'::jsonb)
      )
      or (
        p_request_snapshot->>'intent' <> 'FASHION_TECH'
        and p_request_snapshot->'plan'->'selectedSourceFamilies' @> '["HACKER_NEWS"]'::jsonb
      )
      or (
        p_request_snapshot->'plan'->'selectedSourceFamilies' @> '["HACKER_NEWS"]'::jsonb
        and (
          jsonb_typeof(p_request_snapshot->'plan'->'hackerNews') <> 'object'
          or p_request_snapshot->'plan'->'hackerNews'->>'stream' not in ('top','new','ask')
        )
      ) then
      raise exception 'Fashion research source plan invalid' using errcode = '22023';
    end if;
    v_source_count := jsonb_array_length(
      p_request_snapshot->'plan'->'selectedSourceFamilies'
    );
  else
    if p_request_snapshot->>'objective' not in (
      'AUDIENCE_PAINS','AUDIENCE_LANGUAGE','RECURRING_QUESTIONS','OBJECTIONS',
      'TREND_EVIDENCE','CONTENT_OBSERVATIONS','COMPETITOR_PUBLIC'
    ) or jsonb_typeof(p_request_snapshot->'rssFeedUrls') <> 'array'
      or jsonb_array_length(p_request_snapshot->'rssFeedUrls') > 2 then
      raise exception 'External research request invalid' using errcode = '22023';
    end if;
    v_source_count := case
      when p_request_snapshot->>'hackerNewsStream' in ('top','new','ask') then 1
      else 0
    end + jsonb_array_length(p_request_snapshot->'rssFeedUrls');
    if exists (
      select 1
      from jsonb_array_elements_text(p_request_snapshot->'rssFeedUrls') as feed(url)
      where char_length(feed.url) > 500 or feed.url !~ '^https://'
    ) then
      raise exception 'External research feed invalid' using errcode = '22023';
    end if;
  end if;

  if v_source_count not between 1 and 3 then
    raise exception 'External research sources invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 1700));
  select * into v_run from public.marketing_external_research_runs as run
  where run.organization_id = p_organization_id and run.created_by = p_actor_id
    and run.invocation_key = p_invocation_key;
  if found then
    return jsonb_build_object('runId',v_run.id,'jobId',v_run.job_id,'duplicate',true);
  end if;
  if exists (
    select 1 from public.marketing_external_research_runs as run
    where run.organization_id = p_organization_id
      and run.status in ('QUEUED','RUNNING','SYNTHESIZING')
  ) then
    raise exception 'An external research run is already active' using errcode = '54000';
  end if;
  if (
    select count(*) from public.marketing_external_research_runs as run
    where run.organization_id = p_organization_id
      and run.created_at >= now() - interval '1 hour'
  ) >= 5 then
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

create or replace function public.complete_marketing_external_research(
  p_job_id uuid, p_run_id uuid, p_ai_run_id uuid, p_report jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_run public.marketing_external_research_runs%rowtype;
  v_report_id uuid;
  v_schema_version text;
  v_section text;
begin
  if jsonb_typeof(p_report)<>'object' or pg_column_size(p_report)>65536 then
    raise exception 'External research report invalid' using errcode='22023';
  end if;
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
    raise exception 'External research completion denied' using errcode='42501';
  end if;

  v_schema_version := coalesce(
    nullif(p_report->>'schemaVersion',''),
    'marketing-external-research-report-v1'
  );
  if v_schema_version = 'marketing-fashion-research-report-v1' then
    foreach v_section in array array[
      'audienceSignals','languageSignals','trendSignals','objections','debates',
      'contentOpportunities'
    ] loop
      if jsonb_typeof(p_report->v_section)<>'array' or exists(
        select 1 from jsonb_array_elements(p_report->v_section) as item
        cross join lateral jsonb_array_elements_text(item->'evidenceRefs') as reference(evidence_id)
        where not exists(select 1 from public.marketing_external_research_evidence as evidence
          where evidence.run_id=p_run_id and evidence.evidence_id=reference.evidence_id)
      ) then
        raise exception 'External research evidence reference invalid' using errcode='22023';
      end if;
    end loop;
  elsif v_schema_version = 'marketing-external-research-report-v1' then
    foreach v_section in array array['findings','patterns','disagreements','recommendations'] loop
      if jsonb_typeof(p_report->v_section)<>'array' or exists(
        select 1 from jsonb_array_elements(p_report->v_section) as item
        cross join lateral jsonb_array_elements_text(item->'supportedBy') as reference(evidence_id)
        where not exists(select 1 from public.marketing_external_research_evidence as evidence
          where evidence.run_id=p_run_id and evidence.evidence_id=reference.evidence_id)
      ) then
        raise exception 'External research evidence reference invalid' using errcode='22023';
      end if;
    end loop;
  else
    raise exception 'External research report schema invalid' using errcode='22023';
  end if;

  insert into public.marketing_external_research_reports(
    organization_id,run_id,schema_version,structured_report,created_by
  ) values(
    v_run.organization_id,p_run_id,v_schema_version,p_report,v_run.created_by
  ) returning id into v_report_id;
  update public.marketing_external_research_runs set status='SUCCEEDED',
    synthesis_ai_run_id=p_ai_run_id,completed_at=now()
  where id=p_run_id;
  return v_report_id;
end;
$$;

revoke all on function public.enqueue_marketing_external_research(
  uuid,uuid,jsonb,uuid
) from public,anon,authenticated;
grant execute on function public.enqueue_marketing_external_research(
  uuid,uuid,jsonb,uuid
) to service_role;
revoke all on function public.complete_marketing_external_research(
  uuid,uuid,uuid,jsonb
) from public,anon,authenticated;
grant execute on function public.complete_marketing_external_research(
  uuid,uuid,uuid,jsonb
) to service_role;
