create type public.marketing_reel_processing_status as enum (
  'UPLOADING', 'UPLOADED', 'QUEUED', 'PROCESSING', 'ANALYZED', 'FAILED', 'CANCELLED'
);
create type public.marketing_reel_analysis_status as enum (
  'QUEUED', 'PROCESSING', 'ANALYZED', 'FAILED', 'CANCELLED', 'BLOCKED'
);

create table public.marketing_competitor_reels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  marketing_competitor_id uuid not null,
  source_url text check (
    source_url is null or (
      char_length(source_url) <= 500
      and source_url ~* '^https?://'
      and source_url !~* '^https?://[^/]*@'
    )
  ),
  original_filename text check (original_filename is null or char_length(original_filename) <= 255),
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/source\.mp4$'),
  source_size_bytes bigint not null check (source_size_bytes between 1 and 104857600),
  duration_seconds numeric(8,3) check (duration_seconds is null or duration_seconds between 0 and 180),
  width integer check (width is null or width between 1 and 16384),
  height integer check (height is null or height between 1 and 16384),
  frame_rate numeric(8,3) check (frame_rate is null or frame_rate between 0 and 1000),
  scene_count integer check (scene_count is null or scene_count between 0 and 20),
  cuts_per_minute numeric(8,3) check (cuts_per_minute is null or cuts_per_minute between 0 and 1000),
  average_scene_duration numeric(8,3) check (average_scene_duration is null or average_scene_duration between 0 and 180),
  scene_timestamps jsonb check (scene_timestamps is null or (jsonb_typeof(scene_timestamps) = 'array' and jsonb_array_length(scene_timestamps) <= 20)),
  extraction_version text check (extraction_version is null or char_length(extraction_version) <= 40),
  processing_status public.marketing_reel_processing_status not null default 'UPLOADING',
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  unique (storage_path),
  foreign key (organization_id, marketing_competitor_id)
    references public.marketing_competitors(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create table public.marketing_competitor_reel_transcripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  competitor_reel_id uuid not null,
  text text not null check (char_length(text) between 1 and 100000),
  language text check (language is null or char_length(language) between 2 and 20),
  duration_seconds numeric(8,3) not null check (duration_seconds between 0 and 180),
  segments jsonb not null check (
    jsonb_typeof(segments) = 'array' and jsonb_array_length(segments) <= 500
    and pg_column_size(segments) <= 262144
  ),
  engine text not null check (char_length(engine) between 1 and 40),
  model text not null check (char_length(model) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (organization_id, competitor_reel_id),
  foreign key (organization_id, competitor_reel_id)
    references public.marketing_competitor_reels(organization_id, id) on delete restrict
);

create table public.marketing_competitor_reel_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  competitor_reel_id uuid not null,
  analysis_version integer not null check (analysis_version between 1 and 10000),
  job_id uuid,
  ai_run_id uuid references public.ai_runs(id) on delete restrict,
  extraction_version text not null default 'v1' check (char_length(extraction_version) <= 40),
  schema_version text not null default 'v1' check (char_length(schema_version) <= 40),
  status public.marketing_reel_analysis_status not null default 'QUEUED',
  structured_result jsonb check (structured_result is null or pg_column_size(structured_result) <= 65536),
  error_category text check (error_category is null or char_length(error_category) <= 40),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, competitor_reel_id, analysis_version),
  unique (job_id),
  foreign key (organization_id, competitor_reel_id)
    references public.marketing_competitor_reels(organization_id, id) on delete restrict,
  foreign key (organization_id, job_id)
    references public.jobs(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

alter table public.marketing_competitor_reels enable row level security;
alter table public.marketing_competitor_reel_transcripts enable row level security;
alter table public.marketing_competitor_reel_analyses enable row level security;

create policy marketing_competitor_reels_select on public.marketing_competitor_reels
for select to authenticated using (private.marketing_plugin_available(organization_id));
create policy marketing_competitor_reels_insert on public.marketing_competitor_reels
for insert to authenticated with check (private.marketing_plugin_writable(organization_id));
create policy marketing_competitor_reels_update on public.marketing_competitor_reels
for update to authenticated using (private.marketing_plugin_writable(organization_id))
with check (private.marketing_plugin_writable(organization_id));
create policy marketing_competitor_reel_transcripts_select on public.marketing_competitor_reel_transcripts
for select to authenticated using (private.marketing_plugin_available(organization_id));
create policy marketing_competitor_reel_analyses_select on public.marketing_competitor_reel_analyses
for select to authenticated using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_competitor_reels,
  public.marketing_competitor_reel_transcripts,
  public.marketing_competitor_reel_analyses from public, anon, authenticated;
grant select, insert, update on public.marketing_competitor_reels to authenticated;
grant select on public.marketing_competitor_reel_transcripts,
  public.marketing_competitor_reel_analyses to authenticated;

create function private.prepare_marketing_competitor_reel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then
    if tg_op='INSERT' then raise exception 'Marketing mutation permission required' using errcode='42501'; end if;
    new.organization_id:=old.organization_id; new.created_by:=old.created_by;
    new.created_at:=old.created_at; new.updated_at:=now();
    return new;
  end if;
  if not private.marketing_plugin_writable(new.organization_id) then
    raise exception 'Marketing mutation permission required' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.organization_id<>old.organization_id or new.created_by<>old.created_by or new.created_at<>old.created_at
      or new.storage_path<>old.storage_path or new.source_size_bytes<>old.source_size_bytes
      or new.marketing_competitor_id<>old.marketing_competitor_id then
      raise exception 'Reel provenance is immutable' using errcode='42501'; end if;
    if old.archived_at is null and new.archived_at is not null then new.archived_at:=now();
    elsif old.archived_at is not null and new.archived_at is not null then new.archived_at:=old.archived_at; end if;
    new.updated_at:=now(); new.updated_by:=v_actor;
  else new.created_by:=v_actor; new.updated_by:=v_actor; end if;
  return new;
end;
$$;
create trigger marketing_competitor_reels_prepare before insert or update
on public.marketing_competitor_reels for each row execute function private.prepare_marketing_competitor_reel();
create function private.record_competitor_reel_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_event public.activity_event_type; v_action text;
begin
  if tg_op='INSERT' then v_event:='MARKETING_RECORD_CREATED'; v_action:='added';
  elsif old.archived_at is null and new.archived_at is not null then v_event:='MARKETING_RECORD_ARCHIVED'; v_action:='archived';
  elsif old.archived_at is not null and new.archived_at is null then v_event:='MARKETING_RECORD_RESTORED'; v_action:='restored';
  elsif old.processing_status is distinct from new.processing_status then v_event:='MARKETING_RECORD_UPDATED'; v_action:=lower(new.processing_status::text);
  else return new; end if;
  insert into public.activity_events(organization_id,actor_id,event_type,entity_type,entity_id,metadata)
  values(new.organization_id,coalesce(auth.uid(),new.updated_by),v_event,'MARKETING',new.id,
    jsonb_build_object('record_type','competitor Reel','action',v_action));
  return new;
end;
$$;
create trigger marketing_competitor_reels_activity after insert or update
on public.marketing_competitor_reels for each row execute function private.record_competitor_reel_activity();

create index marketing_competitor_reels_competitor_idx
on public.marketing_competitor_reels(organization_id, marketing_competitor_id, created_at desc);
create index marketing_competitor_reel_analyses_reel_idx
on public.marketing_competitor_reel_analyses(organization_id, competitor_reel_id, analysis_version desc);

create function private.sync_competitor_reel_job_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_analysis public.marketing_competitor_reel_analyses%rowtype; v_status public.marketing_reel_analysis_status;
begin
  if new.job_type<>'marketing.competitor-reel.extract' or new.status=old.status
    or new.status not in ('FAILED','DEAD_LETTER','TIMED_OUT','CANCELLED') then return new; end if;
  select * into v_analysis from public.marketing_competitor_reel_analyses a where a.job_id=new.id;
  if not found or v_analysis.status in ('ANALYZED','BLOCKED') then return new; end if;
  v_status:=case when new.status='CANCELLED' then 'CANCELLED'::public.marketing_reel_analysis_status
    else 'FAILED'::public.marketing_reel_analysis_status end;
  update public.marketing_competitor_reel_analyses set status=v_status,
    error_category=coalesce(new.error_category::text,lower(new.status::text)),completed_at=now()
  where id=v_analysis.id;
  update public.marketing_competitor_reels set processing_status=
    case when new.status='CANCELLED' then 'CANCELLED'::public.marketing_reel_processing_status
      else 'FAILED'::public.marketing_reel_processing_status end
  where id=v_analysis.competitor_reel_id;
  return new;
end;
$$;
create trigger jobs_competitor_reel_status after update of status on public.jobs
for each row execute function private.sync_competitor_reel_job_status();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing-reel-media', 'marketing-reel-media', false, 104857600, array['video/mp4'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create function private.marketing_reel_storage_organization_id(object_name text)
returns uuid language plpgsql immutable strict set search_path = '' as $$
declare v_part text := (storage.foldername(object_name))[1];
begin
  if v_part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_part::uuid;
  end if;
  return null;
end;
$$;

create policy marketing_reel_media_select on storage.objects for select to authenticated using (
  bucket_id='marketing-reel-media'
  and private.marketing_plugin_available(private.marketing_reel_storage_organization_id(name))
);
create policy marketing_reel_media_insert on storage.objects for insert to authenticated with check (
  bucket_id='marketing-reel-media'
  and private.marketing_plugin_writable(private.marketing_reel_storage_organization_id(name))
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/source\.mp4$'
  and exists (
    select 1 from public.marketing_competitor_reels reel
    where reel.organization_id=private.marketing_reel_storage_organization_id(name)
      and reel.id::text=(storage.foldername(name))[2]
      and reel.storage_path=name and reel.processing_status='UPLOADING'
      and reel.archived_at is null
  )
);

insert into public.job_definitions (
  job_type, plugin_id, capability, execution_class, priority, max_attempts,
  timeout_seconds, idempotency_mode, concurrency_group
) values (
  'marketing.competitor-reel.extract', 'marketing',
  'marketing.competitor-reels.analyze', 'EXTERNAL_WORKER', 60, 3,
  900, 'REQUIRED', 'marketing.competitor-reel.extract'
);

create or replace function public.create_worker_pairing(
  p_organization_id uuid, p_name text, p_token_hash_hex text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid()); v_id uuid;
begin
  if v_actor is null or not private.has_organization_role(
    p_organization_id, array['OWNER','ADMIN']::public.organization_role[]
  ) then raise exception 'Worker management permission required' using errcode='42501'; end if;
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' then raise exception 'Invalid pairing token hash' using errcode='22023'; end if;
  update public.worker_pairing_requests set revoked_at=now()
  where organization_id=p_organization_id and consumed_at is null and revoked_at is null;
  insert into public.worker_pairing_requests(
    organization_id, worker_name, token_hash, authorized_capabilities, created_by, expires_at
  ) values (
    p_organization_id, btrim(p_name), decode(p_token_hash_hex,'hex'),
    array['core.worker.echo','marketing.competitor-reels.analyze'], v_actor, now()+interval '15 minutes'
  ) returning id into v_id;
  return v_id;
end;
$$;

create function public.enqueue_competitor_reel_analysis(
  p_organization_id uuid, p_reel_id uuid
) returns public.marketing_competitor_reel_analyses
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_reel public.marketing_competitor_reels%rowtype;
  v_analysis public.marketing_competitor_reel_analyses%rowtype; v_job public.jobs%rowtype;
  v_version integer; v_definition public.job_definitions%rowtype;
begin
  if v_actor is null or not private.marketing_plugin_writable(p_organization_id) then
    raise exception 'Marketing analysis permission required' using errcode='42501'; end if;
  select * into v_reel from public.marketing_competitor_reels r
  where r.organization_id=p_organization_id and r.id=p_reel_id and r.archived_at is null for update;
  if not found or v_reel.processing_status not in ('UPLOADED','ANALYZED','FAILED','CANCELLED') then
    raise exception 'Reel is not ready for analysis' using errcode='22023'; end if;
  if exists(select 1 from public.marketing_competitor_reel_analyses a where a.organization_id=p_organization_id
    and a.competitor_reel_id=p_reel_id and a.status in ('QUEUED','PROCESSING')) then
    raise exception 'Analysis already active' using errcode='23505'; end if;
  select * into v_definition from public.job_definitions d
  where d.job_type='marketing.competitor-reel.extract';
  select coalesce(max(a.analysis_version),0)+1 into v_version
  from public.marketing_competitor_reel_analyses a
  where a.organization_id=p_organization_id and a.competitor_reel_id=p_reel_id;
  insert into public.marketing_competitor_reel_analyses(
    organization_id,competitor_reel_id,analysis_version,created_by
  ) values(p_organization_id,p_reel_id,v_version,v_actor) returning * into v_analysis;
  insert into public.jobs(organization_id,plugin_id,job_type,capability,execution_class,
    priority,created_by,max_attempts,timeout_seconds,input_metadata,idempotency_key,concurrency_group)
  values(p_organization_id,'marketing',v_definition.job_type,v_definition.capability,v_definition.execution_class,
    v_definition.priority,v_actor,v_definition.max_attempts,v_definition.timeout_seconds,
    jsonb_build_object('reelId',p_reel_id,'analysisId',v_analysis.id),v_analysis.id::text,
    v_definition.concurrency_group) returning * into v_job;
  update public.marketing_competitor_reel_analyses set job_id=v_job.id where id=v_analysis.id
  returning * into v_analysis;
  update public.marketing_competitor_reels set processing_status='QUEUED',updated_by=v_actor where id=p_reel_id;
  return v_analysis;
end;
$$;

create function public.worker_authorize_reel_media(p_credential text, p_job_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_worker public.worker_registrations%rowtype; v_job public.jobs%rowtype;
  v_reel public.marketing_competitor_reels%rowtype; v_analysis public.marketing_competitor_reel_analyses%rowtype;
begin
  v_worker:=private.worker_by_credential(p_credential);
  select * into v_job from public.jobs j where j.id=p_job_id and j.organization_id=v_worker.organization_id
    and j.claimant_id='windows/'||v_worker.id::text and j.status in ('RUNNING','CANCEL_REQUESTED')
    and j.job_type='marketing.competitor-reel.extract' and j.lease_expires_at>now();
  if not found then raise exception 'Worker job ownership required' using errcode='42501'; end if;
  select * into v_analysis from public.marketing_competitor_reel_analyses a
    where a.id=(v_job.input_metadata->>'analysisId')::uuid and a.job_id=v_job.id
      and a.organization_id=v_job.organization_id;
  select * into v_reel from public.marketing_competitor_reels r
    where r.id=(v_job.input_metadata->>'reelId')::uuid and r.id=v_analysis.competitor_reel_id
      and r.organization_id=v_job.organization_id and r.archived_at is null;
  if not found then raise exception 'Reel media authorization denied' using errcode='42501'; end if;
  update public.marketing_competitor_reel_analyses set status='PROCESSING'
  where id=v_analysis.id and status in ('QUEUED','FAILED');
  update public.marketing_competitor_reels set processing_status='PROCESSING' where id=v_reel.id;
  return jsonb_build_object('reelId',v_reel.id,'analysisId',v_analysis.id,'storagePath',v_reel.storage_path,
    'sourceSizeBytes',v_reel.source_size_bytes);
end;
$$;

create function public.worker_persist_reel_extraction(p_credential text, p_job_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_worker public.worker_registrations%rowtype; v_job public.jobs%rowtype;
  v_reel_id uuid; v_analysis_id uuid; v_enabled boolean;
begin
  v_worker:=private.worker_by_credential(p_credential);
  select * into v_job from public.jobs j where j.id=p_job_id and j.organization_id=v_worker.organization_id
    and j.claimant_id='windows/'||v_worker.id::text and j.status='RUNNING'
    and j.job_type='marketing.competitor-reel.extract' and j.lease_expires_at>now();
  if not found then raise exception 'Worker job ownership required' using errcode='42501'; end if;
  if pg_column_size(p_payload)>524288 or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Extraction result invalid' using errcode='22023'; end if;
  v_reel_id:=(v_job.input_metadata->>'reelId')::uuid;
  v_analysis_id:=(v_job.input_metadata->>'analysisId')::uuid;
  if not exists(select 1 from public.marketing_competitor_reel_analyses a where a.id=v_analysis_id
    and a.competitor_reel_id=v_reel_id and a.job_id=v_job.id and a.organization_id=v_job.organization_id) then
    raise exception 'Extraction result mismatch' using errcode='42501'; end if;
  if (p_payload->>'durationSeconds')::numeric>180 or jsonb_array_length(coalesce(p_payload->'sceneTimestamps','[]'))>20
    or jsonb_array_length(coalesce(p_payload#>'{transcript,segments}','[]'))>500
    or char_length(coalesce(p_payload#>>'{transcript,text}',''))>100000 then
    raise exception 'Extraction result exceeds limits' using errcode='22023'; end if;
  update public.marketing_competitor_reels set
    duration_seconds=(p_payload->>'durationSeconds')::numeric,
    width=(p_payload->>'width')::integer,height=(p_payload->>'height')::integer,
    frame_rate=(p_payload->>'frameRate')::numeric,scene_count=(p_payload->>'sceneCount')::integer,
    cuts_per_minute=(p_payload->>'cutsPerMinute')::numeric,
    average_scene_duration=(p_payload->>'averageSceneDuration')::numeric,
    scene_timestamps=coalesce(p_payload->'sceneTimestamps','[]'),
    extraction_version=left(p_payload->>'extractionVersion',40)
  where id=v_reel_id and organization_id=v_job.organization_id;
  insert into public.marketing_competitor_reel_transcripts(
    organization_id,competitor_reel_id,text,language,duration_seconds,segments,engine,model
  ) values(v_job.organization_id,v_reel_id,p_payload#>>'{transcript,text}',p_payload#>>'{transcript,language}',
    (p_payload#>>'{transcript,durationSeconds}')::numeric,p_payload#>'{transcript,segments}',
    left(p_payload#>>'{transcript,engine}',40),left(p_payload#>>'{transcript,model}',100))
  on conflict(organization_id,competitor_reel_id) do update set
    text=excluded.text,language=excluded.language,duration_seconds=excluded.duration_seconds,
    segments=excluded.segments,engine=excluded.engine,model=excluded.model,created_at=now();
  select exists(select 1 from public.organization_plugins p where p.organization_id=v_job.organization_id
    and p.plugin_id='marketing' and p.enabled) into v_enabled;
  if not v_enabled then
    update public.marketing_competitor_reel_analyses set status='BLOCKED',error_category='plugin_disabled',completed_at=now()
    where id=v_analysis_id;
    update public.marketing_competitor_reels set processing_status='CANCELLED' where id=v_reel_id;
  end if;
  return jsonb_build_object('organizationId',v_job.organization_id,'reelId',v_reel_id,
    'analysisId',v_analysis_id,'actorId',v_job.created_by,'interpretationAllowed',v_enabled);
end;
$$;

create function public.start_marketing_reel_ai_run(
  p_job_id uuid, p_id uuid, p_operation text, p_capability text,
  p_requested_tier public.ai_logical_tier, p_trace_metadata jsonb
) returns public.ai_runs language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype; v_run public.ai_runs%rowtype;
begin
  select * into v_job from public.jobs j where j.id=p_job_id
    and j.job_type='marketing.competitor-reel.extract'
    and j.plugin_id='marketing' and j.capability='marketing.competitor-reels.analyze'
    and j.status='RUNNING' and j.lease_expires_at>now();
  if not found or p_capability<>'marketing.competitor-reels.analyze'
    or p_operation<>'generate_structured'
    or not exists(select 1 from public.marketing_competitor_reel_analyses a
      where a.job_id=v_job.id and a.organization_id=v_job.organization_id and a.status='PROCESSING')
    or not exists(select 1 from public.organization_plugins p where p.organization_id=v_job.organization_id
    and p.plugin_id='marketing' and p.enabled) or not exists(select 1 from public.memberships m
    where m.organization_id=v_job.organization_id and m.user_id=v_job.created_by and m.removed_at is null
      and m.role in ('OWNER','ADMIN','MEMBER')) then
    raise exception 'Trusted Marketing AI continuation denied' using errcode='42501'; end if;
  insert into public.ai_runs(id,organization_id,actor_id,plugin_id,operation,capability,memory_domains,
    requested_tier,status,trace_metadata)
  values(p_id,v_job.organization_id,v_job.created_by,'marketing',p_operation,p_capability,
    array['company','marketing'],p_requested_tier,'RUNNING',coalesce(p_trace_metadata,'{}')) returning * into v_run;
  return v_run;
end;
$$;

create function public.complete_marketing_reel_ai_run(
  p_job_id uuid, p_id uuid, p_status public.ai_run_status, p_selected_model_id text,
  p_provider_id text, p_is_remote boolean, p_duration_ms integer, p_input_tokens integer,
  p_output_tokens integer, p_total_tokens integer, p_estimated_cost_usd numeric,
  p_error_category public.ai_error_category, p_trace_metadata jsonb
) returns public.ai_runs language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype; v_run public.ai_runs%rowtype;
begin
  select * into v_job from public.jobs j where j.id=p_job_id and j.job_type='marketing.competitor-reel.extract';
  if not found or p_status not in ('SUCCEEDED','FAILED','CANCELLED','TIMED_OUT') then
    raise exception 'Trusted Marketing AI completion denied' using errcode='42501'; end if;
  update public.ai_runs r set status=p_status,selected_model_id=p_selected_model_id,provider_id=p_provider_id,
    is_remote=p_is_remote,completed_at=now(),duration_ms=p_duration_ms,input_tokens=p_input_tokens,
    output_tokens=p_output_tokens,total_tokens=p_total_tokens,estimated_cost_usd=p_estimated_cost_usd,
    error_category=p_error_category,trace_metadata=coalesce(p_trace_metadata,'{}')
  where r.id=p_id and r.organization_id=v_job.organization_id and r.actor_id=v_job.created_by
    and r.plugin_id='marketing' and r.status='RUNNING' returning * into v_run;
  if not found then raise exception 'Active Marketing AI run not found' using errcode='42501'; end if;
  return v_run;
end;
$$;

revoke all on function private.marketing_reel_storage_organization_id(text) from public,anon;
revoke all on function private.prepare_marketing_competitor_reel() from public,anon,authenticated;
revoke all on function private.record_competitor_reel_activity() from public,anon,authenticated;
revoke all on function private.sync_competitor_reel_job_status() from public,anon,authenticated;
grant execute on function private.marketing_reel_storage_organization_id(text) to authenticated;
revoke all on function public.enqueue_competitor_reel_analysis(uuid,uuid) from public,anon;
grant execute on function public.enqueue_competitor_reel_analysis(uuid,uuid) to authenticated;
revoke all on function public.worker_authorize_reel_media(text,uuid),
  public.worker_persist_reel_extraction(text,uuid,jsonb),
  public.start_marketing_reel_ai_run(uuid,uuid,text,text,public.ai_logical_tier,jsonb),
  public.complete_marketing_reel_ai_run(uuid,uuid,public.ai_run_status,text,text,boolean,integer,integer,integer,integer,numeric,public.ai_error_category,jsonb)
  from public,anon,authenticated;
grant execute on function public.worker_authorize_reel_media(text,uuid),
  public.worker_persist_reel_extraction(text,uuid,jsonb),
  public.start_marketing_reel_ai_run(uuid,uuid,text,text,public.ai_logical_tier,jsonb),
  public.complete_marketing_reel_ai_run(uuid,uuid,public.ai_run_status,text,text,boolean,integer,integer,integer,integer,numeric,public.ai_error_category,jsonb)
  to service_role;
