-- TASK-017B: enrich immutable external-research evidence with explicit provenance.

alter table public.marketing_external_research_evidence
  drop constraint marketing_external_research_evidence_evidence_type_check,
  drop constraint marketing_external_research_evidence_excerpt_check;

alter table public.marketing_external_research_evidence
  add column native_id text check (
    native_id is null or char_length(native_id) between 1 and 500
  ),
  add column parent_native_id text check (
    parent_native_id is null or char_length(parent_native_id) between 1 and 500
  ),
  add column canonical_url text check (
    canonical_url is null or (
      char_length(canonical_url) <= 1000 and canonical_url ~ '^https://'
    )
  ),
  add column title text check (
    title is null or char_length(title) between 1 and 300
  ),
  add column author text check (
    author is null or char_length(author) between 1 and 120
  ),
  add column published_at timestamptz,
  add column fetched_at timestamptz,
  add column content_hash text check (
    content_hash is null or content_hash ~ '^[a-f0-9]{64}$'
  ),
  add column safe_metadata jsonb not null default '{}' check (
    jsonb_typeof(safe_metadata) = 'object'
    and pg_column_size(safe_metadata) <= 4096
  );

alter table public.marketing_external_research_evidence
  add constraint marketing_external_research_evidence_evidence_type_check
    check (evidence_type in (
      'DISCUSSION', 'FEED_ITEM', 'HN_STORY', 'HN_TEXT', 'HN_COMMENT',
      'ARTICLE_CONTENT'
    )),
  add constraint marketing_external_research_evidence_excerpt_check
    check (char_length(btrim(excerpt)) between 1 and 1500),
  add constraint marketing_external_research_evidence_enriched_fetch_check
    check (
      evidence_type in ('DISCUSSION', 'FEED_ITEM')
      or (fetched_at is not null and content_hash is not null)
    );

create or replace function public.record_marketing_external_research_retrieval(
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
      organization_id,run_id,source_id,evidence_id,evidence_type,excerpt,
      native_id,parent_native_id,canonical_url,title,author,published_at,
      fetched_at,content_hash,safe_metadata
    ) select run.organization_id,p_run_id,v_source_id,v_evidence->>'evidenceId',
      v_evidence->>'evidenceType',v_evidence->>'excerpt',
      nullif(v_evidence->>'nativeId',''),nullif(v_evidence->>'parentNativeId',''),
      nullif(v_evidence->>'canonicalUrl',''),nullif(v_evidence->>'title',''),
      nullif(v_evidence->>'author',''),nullif(v_evidence->>'publishedAt','')::timestamptz,
      (v_evidence->>'fetchedAt')::timestamptz,
      nullif(v_evidence->>'contentHash',''),
      coalesce(v_evidence->'safeMetadata','{}')
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

revoke all on function public.record_marketing_external_research_retrieval(
  uuid,uuid,jsonb,jsonb,boolean,text[],integer,integer,integer,integer
) from public,anon,authenticated;
grant execute on function public.record_marketing_external_research_retrieval(
  uuid,uuid,jsonb,jsonb,boolean,text[],integer,integer,integer,integer
) to service_role;
