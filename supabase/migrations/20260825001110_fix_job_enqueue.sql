-- The original enqueue function used an uncast CASE expression for the enum
-- status column. PostgreSQL resolves that CASE as text and rejects the INSERT.
create or replace function public.enqueue_job(
  p_organization_id uuid,
  p_plugin_id text,
  p_job_type text,
  p_capability text,
  p_execution_class public.job_execution_class,
  p_priority smallint,
  p_scheduled_at timestamptz,
  p_max_attempts smallint,
  p_timeout_seconds integer,
  p_input_metadata jsonb,
  p_idempotency_key text,
  p_concurrency_group text
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_definition public.job_definitions%rowtype;
  v_job public.jobs%rowtype;
  v_now timestamptz := now();
  v_scheduled_at timestamptz := coalesce(p_scheduled_at, v_now);
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  )) then
    raise exception 'Organization job enqueue permission required' using errcode = '42501';
  end if;

  select * into v_definition
  from public.job_definitions as definition
  where definition.job_type = p_job_type;
  if not found
    or v_definition.plugin_id is distinct from p_plugin_id
    or v_definition.capability is distinct from p_capability
    or v_definition.execution_class is distinct from p_execution_class
    or v_definition.priority is distinct from p_priority
    or v_definition.max_attempts is distinct from p_max_attempts
    or v_definition.timeout_seconds is distinct from p_timeout_seconds
    or v_definition.concurrency_group is distinct from p_concurrency_group
    or (v_definition.idempotency_mode = 'NONE' and p_idempotency_key is not null)
    or (v_definition.idempotency_mode = 'REQUIRED' and p_idempotency_key is null) then
    raise exception 'Registered job definition required' using errcode = '22023';
  end if;

  if v_definition.plugin_id is not null and not exists (
    select 1 from public.organization_plugins as organization_plugin
    where organization_plugin.organization_id = p_organization_id
      and organization_plugin.plugin_id = v_definition.plugin_id
      and organization_plugin.enabled
  ) then
    raise exception 'Enabled organization plugin required' using errcode = '42501';
  end if;

  if v_scheduled_at < v_now - interval '5 minutes'
    or v_scheduled_at > v_now + interval '365 days' then
    raise exception 'Job schedule is invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 1100));

  if p_idempotency_key is not null then
    select * into v_job
    from public.jobs as job
    where job.organization_id = p_organization_id
      and job.job_type = p_job_type
      and job.idempotency_key = p_idempotency_key;
    if found then return v_job; end if;
  end if;

  if (select count(*) from public.jobs as job
      where job.organization_id = p_organization_id
        and job.status in ('QUEUED', 'SCHEDULED', 'RUNNING', 'CANCEL_REQUESTED')) >= 100
    or (select count(*) from public.jobs as job
      where job.organization_id = p_organization_id
        and job.created_by = v_actor
        and job.status in ('QUEUED', 'SCHEDULED', 'RUNNING', 'CANCEL_REQUESTED')) >= 25 then
    raise exception 'Organization job queue limit reached' using errcode = '54000';
  end if;

  insert into public.jobs (
    organization_id, plugin_id, job_type, capability, execution_class, status,
    priority, created_by, scheduled_at, next_attempt_at, max_attempts,
    timeout_seconds, input_metadata, idempotency_key, concurrency_group
  ) values (
    p_organization_id, v_definition.plugin_id, v_definition.job_type,
    v_definition.capability, v_definition.execution_class,
    case
      when v_scheduled_at > v_now then 'SCHEDULED'::public.job_status
      else 'QUEUED'::public.job_status
    end,
    v_definition.priority, v_actor, v_scheduled_at, v_scheduled_at,
    v_definition.max_attempts, v_definition.timeout_seconds,
    coalesce(p_input_metadata, '{}'), p_idempotency_key,
    v_definition.concurrency_group
  ) returning * into v_job;
  return v_job;
end;
$$;

-- The database-native processor also passed an integer progress literal to a
-- smallint RPC. Keep the hosted executor runnable after enqueue is repaired.
create or replace function public.process_database_jobs(p_limit integer default 10)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_job public.jobs%rowtype; v_processed integer := 0; v_executor constant text := 'supabase-cron/database';
begin
  if p_limit not between 1 and 25 then raise exception 'Database job limit is invalid' using errcode = '22023'; end if;
  perform private.recover_stale_jobs(now());
  for v_index in 1..p_limit loop
    v_job := public.claim_next_job(v_executor, 'DATABASE', 60);
    exit when v_job.id is null;
    begin
      if v_job.job_type = 'core.test.echo'
        and jsonb_typeof(v_job.input_metadata->'message') = 'string'
        and char_length(v_job.input_metadata->>'message') between 1 and 80 then
        perform public.report_job_progress(
          v_job.id,
          v_executor,
          50::smallint,
          'Validated example job.'
        );
        perform public.complete_job(v_job.id, v_executor, jsonb_build_object('acknowledged', true));
      else
        perform public.report_job_failure(v_job.id, v_executor, 'validation_failed', false);
      end if;
    exception when others then
      perform public.report_job_failure(v_job.id, v_executor, 'internal_error', true);
    end;
    v_processed := v_processed + 1;
  end loop;
  return v_processed;
end;
$$;
