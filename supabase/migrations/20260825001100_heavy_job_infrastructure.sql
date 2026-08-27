create type public.job_status as enum (
  'QUEUED',
  'SCHEDULED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'TIMED_OUT',
  'DEAD_LETTER'
);

create type public.job_execution_class as enum (
  'DATABASE',
  'SERVERLESS',
  'EXTERNAL_WORKER'
);

create type public.job_error_category as enum (
  'validation_failed',
  'policy_denied',
  'provider_unavailable',
  'rate_limited',
  'timeout',
  'cancelled',
  'transient_failure',
  'permanent_failure',
  'internal_error'
);

create function private.job_metadata_has_forbidden_key(p_value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_child jsonb;
  v_key text;
begin
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in
      select entry.key, entry.value from jsonb_each(p_value) as entry
    loop
      if lower(v_key) = any(array[
        'password', 'secret', 'token', 'api_key', 'apikey', 'authorization',
        'prompt', 'messages', 'raw_response', 'response_body'
      ]) then
        return true;
      end if;
      if private.job_metadata_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select element.value from jsonb_array_elements(p_value) as element
    loop
      if private.job_metadata_has_forbidden_key(v_child) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

create table public.job_definitions (
  job_type text primary key,
  plugin_id text,
  capability text not null,
  execution_class public.job_execution_class not null,
  priority smallint not null,
  max_attempts smallint not null,
  timeout_seconds integer not null,
  idempotency_mode text not null,
  concurrency_group text,
  constraint job_definitions_type_valid check (
    job_type ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    and char_length(job_type) between 5 and 100
  ),
  constraint job_definitions_capability_valid check (
    capability ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    and char_length(capability) between 5 and 100
  ),
  constraint job_definitions_origin_valid check (
    (plugin_id is null and job_type ~ '^core\.' and capability ~ '^core\.')
    or (
      plugin_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
      and char_length(plugin_id) between 2 and 50
      and job_type ~ ('^' || plugin_id || '\.')
      and capability ~ ('^' || plugin_id || '\.')
    )
  ),
  constraint job_definitions_settings_valid check (
    priority between 0 and 100
    and max_attempts between 1 and 10
    and timeout_seconds between 1 and 86400
    and idempotency_mode in ('NONE', 'OPTIONAL', 'REQUIRED')
  ),
  constraint job_definitions_concurrency_group_valid check (
    concurrency_group is null
    or (char_length(concurrency_group) between 3 and 100 and concurrency_group ~ '^[a-z][a-z0-9:._/-]*$')
  )
);

insert into public.job_definitions (
  job_type, plugin_id, capability, execution_class, priority, max_attempts,
  timeout_seconds, idempotency_mode, concurrency_group
) values
('core.test.echo', null, 'core.jobs.test', 'DATABASE', 50, 2, 60, 'OPTIONAL', 'core.test.echo'),
('example.test.greeting', 'example', 'example.hello', 'SERVERLESS', 50, 1, 10, 'OPTIONAL', null);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_id text,
  job_type text not null,
  capability text not null,
  execution_class public.job_execution_class not null,
  status public.job_status not null default 'QUEUED',
  priority smallint not null default 50,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  scheduled_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  heartbeat_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  attempt_count smallint not null default 0,
  max_attempts smallint not null default 1,
  timeout_seconds integer not null,
  progress smallint not null default 0,
  progress_message text,
  progress_updated_at timestamptz,
  input_metadata jsonb not null default '{}',
  result_metadata jsonb,
  error_category public.job_error_category,
  cancellation_requested_at timestamptz,
  cancelled_at timestamptz,
  parent_job_id uuid,
  idempotency_key text,
  claimant_id text,
  concurrency_group text,
  duration_ms integer,
  constraint jobs_organization_id_id_key unique (organization_id, id),
  constraint jobs_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint jobs_parent_fkey
    foreign key (organization_id, parent_job_id)
    references public.jobs(organization_id, id) on delete restrict,
  constraint jobs_parent_not_self check (parent_job_id is distinct from id),
  constraint jobs_type_valid check (
    job_type ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    and char_length(job_type) between 5 and 100
  ),
  constraint jobs_capability_valid check (
    capability ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    and char_length(capability) between 5 and 100
  ),
  constraint jobs_origin_valid check (
    (plugin_id is null and job_type ~ '^core\.' and capability ~ '^core\.')
    or (
      plugin_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
      and char_length(plugin_id) between 2 and 50
      and job_type ~ ('^' || plugin_id || '\.')
      and capability ~ ('^' || plugin_id || '\.')
    )
  ),
  constraint jobs_priority_valid check (priority between 0 and 100),
  constraint jobs_attempts_valid check (
    attempt_count between 0 and 10
    and max_attempts between 1 and 10
    and attempt_count <= max_attempts
  ),
  constraint jobs_timeout_valid check (timeout_seconds between 1 and 86400),
  constraint jobs_progress_valid check (progress between 0 and 100),
  constraint jobs_progress_message_valid check (
    progress_message is null or char_length(progress_message) between 1 and 280
  ),
  constraint jobs_input_metadata_valid check (
    jsonb_typeof(input_metadata) = 'object'
    and octet_length(input_metadata::text) <= 16384
    and not private.job_metadata_has_forbidden_key(input_metadata)
  ),
  constraint jobs_result_metadata_valid check (
    result_metadata is null
    or (
      jsonb_typeof(result_metadata) = 'object'
      and octet_length(result_metadata::text) <= 16384
      and not private.job_metadata_has_forbidden_key(result_metadata)
    )
  ),
  constraint jobs_idempotency_key_valid check (
    idempotency_key is null
    or (
      char_length(idempotency_key) between 1 and 100
      and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9:._/-]*$'
    )
  ),
  constraint jobs_claimant_valid check (
    claimant_id is null
    or (char_length(claimant_id) between 3 and 120 and claimant_id ~ '^[A-Za-z0-9][A-Za-z0-9:._/-]*$')
  ),
  constraint jobs_concurrency_group_valid check (
    concurrency_group is null
    or (char_length(concurrency_group) between 3 and 100 and concurrency_group ~ '^[a-z][a-z0-9:._/-]*$')
  ),
  constraint jobs_duration_valid check (duration_ms is null or duration_ms >= 0),
  constraint jobs_timestamps_valid check (
    next_attempt_at >= scheduled_at
    and (lease_expires_at is null or heartbeat_at is not null)
    and (cancelled_at is null or cancellation_requested_at is not null)
  ),
  constraint jobs_status_valid check (
    (
      status in ('QUEUED', 'SCHEDULED')
      and completed_at is null and claimant_id is null and lease_expires_at is null
    )
    or (
      status in ('RUNNING', 'CANCEL_REQUESTED')
      and completed_at is null and claimant_id is not null
      and heartbeat_at is not null and lease_expires_at is not null
    )
    or (
      status in ('SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'DEAD_LETTER')
      and completed_at is not null and claimant_id is null and lease_expires_at is null
    )
  ),
  constraint jobs_success_valid check (
    status <> 'SUCCEEDED'
    or (progress = 100 and result_metadata is not null and error_category is null)
  ),
  constraint jobs_cancelled_valid check (
    status <> 'CANCELLED'
    or (cancelled_at is not null and error_category = 'cancelled')
  ),
  constraint jobs_failure_valid check (
    status not in ('FAILED', 'CANCELLED', 'TIMED_OUT', 'DEAD_LETTER')
    or error_category is not null
  )
);

create index jobs_organization_status_idx
on public.jobs(organization_id, status, created_at desc);
create index jobs_claimable_idx
on public.jobs(execution_class, priority desc, next_attempt_at, created_at)
where status in ('QUEUED', 'SCHEDULED');
create index jobs_lease_expiry_idx
on public.jobs(lease_expires_at)
where status in ('RUNNING', 'CANCEL_REQUESTED');
create index jobs_creator_idx
on public.jobs(organization_id, created_by, created_at desc);
create index jobs_parent_idx
on public.jobs(organization_id, parent_job_id)
where parent_job_id is not null;
create unique index jobs_idempotency_idx
on public.jobs(organization_id, job_type, idempotency_key)
where idempotency_key is not null;

create function public.enqueue_job(
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
    case when v_scheduled_at > v_now then 'SCHEDULED' else 'QUEUED' end,
    v_definition.priority, v_actor, v_scheduled_at, v_scheduled_at,
    v_definition.max_attempts, v_definition.timeout_seconds,
    coalesce(p_input_metadata, '{}'), p_idempotency_key,
    v_definition.concurrency_group
  ) returning * into v_job;
  return v_job;
end;
$$;

create function private.recover_stale_jobs(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with stale as (
    select job.id
    from public.jobs as job
    where job.status in ('RUNNING', 'CANCEL_REQUESTED')
      and job.lease_expires_at <= p_now
    for update skip locked
  )
  update public.jobs as job
  set status = case
      when job.status = 'CANCEL_REQUESTED' then 'CANCELLED'::public.job_status
      when job.attempt_count < job.max_attempts then 'SCHEDULED'::public.job_status
      else 'TIMED_OUT'::public.job_status
    end,
    next_attempt_at = case
      when job.status <> 'CANCEL_REQUESTED' and job.attempt_count < job.max_attempts
      then p_now + make_interval(secs => least(900, 30 * power(2, greatest(job.attempt_count - 1, 0))::integer))
      else job.next_attempt_at
    end,
    completed_at = case
      when job.status = 'CANCEL_REQUESTED' or job.attempt_count >= job.max_attempts then p_now
      else null
    end,
    cancelled_at = case when job.status = 'CANCEL_REQUESTED' then p_now else null end,
    error_category = case
      when job.status = 'CANCEL_REQUESTED' then 'cancelled'::public.job_error_category
      else 'timeout'::public.job_error_category
    end,
    claimant_id = null,
    lease_expires_at = null,
    heartbeat_at = null,
    duration_ms = greatest(0, floor(extract(epoch from (p_now - job.started_at)) * 1000))::integer
  from stale
  where job.id = stale.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.recover_stale_jobs(p_now timestamptz default now())
returns integer
language sql
security definer
set search_path = ''
as $$ select private.recover_stale_jobs(p_now); $$;

create function public.claim_next_job(
  p_executor_id text,
  p_execution_class public.job_execution_class,
  p_lease_seconds integer default 120
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_now timestamptz := now();
begin
  if p_executor_id is null or char_length(p_executor_id) not between 3 and 120
    or p_executor_id !~ '^[A-Za-z0-9][A-Za-z0-9:._/-]*$'
    or p_lease_seconds not between 15 and 900 then
    raise exception 'Job claim parameters are invalid' using errcode = '22023';
  end if;
  perform private.recover_stale_jobs(v_now);

  select * into v_job
  from public.jobs as job
  where job.execution_class = p_execution_class
    and job.status in ('QUEUED', 'SCHEDULED')
    and job.scheduled_at <= v_now
    and job.next_attempt_at <= v_now
    and job.attempt_count < job.max_attempts
    and job.cancellation_requested_at is null
    and (
      job.concurrency_group is null
      or not exists (
        select 1 from public.jobs as active
        where active.organization_id = job.organization_id
          and active.concurrency_group = job.concurrency_group
          and active.status in ('RUNNING', 'CANCEL_REQUESTED')
      )
    )
  order by job.priority desc, job.next_attempt_at, job.created_at, job.id
  for update skip locked
  limit 1;

  if not found then return null; end if;

  if v_job.concurrency_group is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      v_job.organization_id::text || ':' || v_job.concurrency_group,
      1101
    ));
    if exists (
      select 1 from public.jobs as active
      where active.organization_id = v_job.organization_id
        and active.concurrency_group = v_job.concurrency_group
        and active.id <> v_job.id
        and active.status in ('RUNNING', 'CANCEL_REQUESTED')
    ) then
      return null;
    end if;
  end if;

  update public.jobs as job
  set status = 'RUNNING',
    claimant_id = p_executor_id,
    attempt_count = job.attempt_count + 1,
    started_at = v_now,
    heartbeat_at = v_now,
    lease_expires_at = v_now + make_interval(secs => least(p_lease_seconds, job.timeout_seconds)),
    progress_message = coalesce(job.progress_message, 'Job started.'),
    progress_updated_at = v_now,
    error_category = null
  where job.id = v_job.id
  returning * into v_job;
  return v_job;
end;
$$;

create function public.heartbeat_job(
  p_job_id uuid,
  p_executor_id text,
  p_lease_seconds integer default 120
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare v_job public.jobs%rowtype; v_now timestamptz := now();
begin
  if p_lease_seconds not between 15 and 900 then
    raise exception 'Job lease is invalid' using errcode = '22023';
  end if;
  update public.jobs as job
  set heartbeat_at = v_now,
    lease_expires_at = least(
      v_now + make_interval(secs => p_lease_seconds),
      job.started_at + make_interval(secs => job.timeout_seconds)
    )
  where job.id = p_job_id
    and job.claimant_id = p_executor_id
    and job.status in ('RUNNING', 'CANCEL_REQUESTED')
    and job.lease_expires_at > v_now
  returning * into v_job;
  if not found then raise exception 'Active job lease not found' using errcode = '42501'; end if;
  return v_job;
end;
$$;

create function public.report_job_progress(
  p_job_id uuid,
  p_executor_id text,
  p_progress smallint,
  p_message text
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare v_job public.jobs%rowtype;
begin
  update public.jobs as job
  set progress = p_progress,
    progress_message = nullif(btrim(p_message), ''),
    progress_updated_at = now()
  where job.id = p_job_id
    and job.claimant_id = p_executor_id
    and job.status in ('RUNNING', 'CANCEL_REQUESTED')
    and job.lease_expires_at > now()
    and p_progress between job.progress and 99
    and char_length(btrim(p_message)) between 1 and 280
  returning * into v_job;
  if not found then raise exception 'Active job progress update rejected' using errcode = '42501'; end if;
  return v_job;
end;
$$;

create function public.complete_job(
  p_job_id uuid,
  p_executor_id text,
  p_result_metadata jsonb
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare v_job public.jobs%rowtype; v_now timestamptz := now();
begin
  update public.jobs as job
  set status = 'SUCCEEDED', completed_at = v_now, progress = 100,
    progress_message = 'Completed.', progress_updated_at = v_now,
    result_metadata = coalesce(p_result_metadata, '{}'), error_category = null,
    duration_ms = greatest(0, floor(extract(epoch from (v_now - job.started_at)) * 1000))::integer,
    claimant_id = null, lease_expires_at = null, heartbeat_at = v_now
  where job.id = p_job_id and job.claimant_id = p_executor_id
    and job.status = 'RUNNING' and job.lease_expires_at > v_now
  returning * into v_job;
  if not found then raise exception 'Active job completion rejected' using errcode = '42501'; end if;
  return v_job;
end;
$$;

create function public.report_job_failure(
  p_job_id uuid,
  p_executor_id text,
  p_error_category public.job_error_category,
  p_retryable boolean
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_now timestamptz := now();
  v_can_retry boolean;
begin
  select * into v_job from public.jobs as job
  where job.id = p_job_id and job.claimant_id = p_executor_id
    and job.status in ('RUNNING', 'CANCEL_REQUESTED')
    and job.lease_expires_at > v_now
  for update;
  if not found then raise exception 'Active job failure update rejected' using errcode = '42501'; end if;

  v_can_retry := v_job.status = 'RUNNING' and p_retryable
    and p_error_category in ('provider_unavailable', 'rate_limited', 'timeout', 'transient_failure', 'internal_error')
    and v_job.attempt_count < v_job.max_attempts;

  update public.jobs as job
  set status = case
      when v_job.status = 'CANCEL_REQUESTED' then 'CANCELLED'::public.job_status
      when v_can_retry then 'SCHEDULED'::public.job_status
      when p_error_category = 'timeout' then 'TIMED_OUT'::public.job_status
      when p_retryable then 'DEAD_LETTER'::public.job_status
      else 'FAILED'::public.job_status
    end,
    next_attempt_at = case when v_can_retry then v_now + make_interval(
      secs => least(900, 30 * power(2, greatest(v_job.attempt_count - 1, 0))::integer)
    ) else job.next_attempt_at end,
    completed_at = case when v_can_retry then null else v_now end,
    cancellation_requested_at = case when v_job.status = 'CANCEL_REQUESTED'
      then coalesce(job.cancellation_requested_at, v_now) else job.cancellation_requested_at end,
    cancelled_at = case when v_job.status = 'CANCEL_REQUESTED' then v_now else null end,
    error_category = case when v_job.status = 'CANCEL_REQUESTED'
      then 'cancelled'::public.job_error_category else p_error_category end,
    duration_ms = greatest(0, floor(extract(epoch from (v_now - job.started_at)) * 1000))::integer,
    claimant_id = null, lease_expires_at = null, heartbeat_at = v_now
  where job.id = p_job_id
  returning * into v_job;
  return v_job;
end;
$$;

create function public.acknowledge_job_cancellation(p_job_id uuid, p_executor_id text)
returns public.jobs
language sql
security definer
set search_path = ''
as $$
  select public.report_job_failure(
    p_job_id, p_executor_id, 'cancelled'::public.job_error_category, false
  );
$$;

create function public.request_job_cancellation(p_organization_id uuid, p_job_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_job public.jobs%rowtype; v_now timestamptz := now();
begin
  select * into v_job from public.jobs as job
  where job.id = p_job_id and job.organization_id = p_organization_id
  for update;
  if not found or v_actor is null or not (select private.has_organization_role(
    p_organization_id, array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  )) or (
    not (select private.has_organization_role(
      p_organization_id, array['OWNER', 'ADMIN']::public.organization_role[]
    )) and v_job.created_by <> v_actor
  ) then
    raise exception 'Organization job cancellation permission required' using errcode = '42501';
  end if;

  if v_job.status in ('QUEUED', 'SCHEDULED') then
    update public.jobs as job set status = 'CANCELLED', cancellation_requested_at = v_now,
      cancelled_at = v_now, completed_at = v_now, error_category = 'cancelled',
      progress_message = 'Cancelled.', progress_updated_at = v_now
    where job.id = p_job_id returning * into v_job;
  elsif v_job.status = 'RUNNING' then
    update public.jobs as job set status = 'CANCEL_REQUESTED',
      cancellation_requested_at = v_now, progress_message = 'Cancellation requested.',
      progress_updated_at = v_now
    where job.id = p_job_id returning * into v_job;
  elsif v_job.status <> 'CANCEL_REQUESTED' then
    raise exception 'Job cannot be cancelled from its current status' using errcode = '22023';
  end if;
  return v_job;
end;
$$;

create function public.retry_job(p_organization_id uuid, p_job_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_source public.jobs%rowtype; v_job public.jobs%rowtype;
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id, array['OWNER', 'ADMIN']::public.organization_role[]
  )) then raise exception 'Organization job retry permission required' using errcode = '42501'; end if;
  select * into v_source from public.jobs as job
  where job.id = p_job_id and job.organization_id = p_organization_id
    and job.status in ('FAILED', 'TIMED_OUT', 'DEAD_LETTER')
  for update;
  if not found then raise exception 'Retryable terminal job not found' using errcode = '22023'; end if;
  if v_source.plugin_id is not null and not exists (
    select 1 from public.organization_plugins as organization_plugin
    where organization_plugin.organization_id = p_organization_id
      and organization_plugin.plugin_id = v_source.plugin_id and organization_plugin.enabled
  ) then raise exception 'Enabled organization plugin required' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 1100));
  select * into v_job from public.jobs as child
  where child.organization_id = p_organization_id
    and child.parent_job_id = v_source.id
    and child.status in ('QUEUED', 'SCHEDULED', 'RUNNING', 'CANCEL_REQUESTED')
  order by child.created_at desc
  limit 1;
  if found then return v_job; end if;
  if (select count(*) from public.jobs as job
      where job.organization_id = p_organization_id
        and job.status in ('QUEUED', 'SCHEDULED', 'RUNNING', 'CANCEL_REQUESTED')) >= 100 then
    raise exception 'Organization job queue limit reached' using errcode = '54000';
  end if;

  insert into public.jobs (
    organization_id, plugin_id, job_type, capability, execution_class, status,
    priority, created_by, scheduled_at, next_attempt_at, max_attempts,
    timeout_seconds, input_metadata, parent_job_id, concurrency_group
  ) values (
    p_organization_id, v_source.plugin_id, v_source.job_type, v_source.capability,
    v_source.execution_class, 'QUEUED', v_source.priority, v_actor, now(), now(),
    v_source.max_attempts, v_source.timeout_seconds, v_source.input_metadata,
    v_source.id, v_source.concurrency_group
  ) returning * into v_job;
  return v_job;
end;
$$;

create function public.process_database_jobs(p_limit integer default 10)
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
        perform public.report_job_progress(v_job.id, v_executor, 50, 'Validated example job.');
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

alter table public.jobs enable row level security;
create policy jobs_member_select on public.jobs for select to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on table public.jobs from public, anon, authenticated;
grant select on table public.jobs to authenticated;
revoke all on table public.job_definitions from public, anon, authenticated;

revoke all on function private.job_metadata_has_forbidden_key(jsonb) from public, anon, authenticated;
revoke all on function private.recover_stale_jobs(timestamptz) from public, anon, authenticated;

revoke all on function public.enqueue_job(uuid, text, text, text, public.job_execution_class, smallint, timestamptz, smallint, integer, jsonb, text, text) from public, anon;
revoke all on function public.request_job_cancellation(uuid, uuid) from public, anon;
revoke all on function public.retry_job(uuid, uuid) from public, anon;
grant execute on function public.enqueue_job(uuid, text, text, text, public.job_execution_class, smallint, timestamptz, smallint, integer, jsonb, text, text) to authenticated;
grant execute on function public.request_job_cancellation(uuid, uuid) to authenticated;
grant execute on function public.retry_job(uuid, uuid) to authenticated;

revoke all on function public.recover_stale_jobs(timestamptz) from public, anon, authenticated;
revoke all on function public.claim_next_job(text, public.job_execution_class, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_job(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.report_job_progress(uuid, text, smallint, text) from public, anon, authenticated;
revoke all on function public.complete_job(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.report_job_failure(uuid, text, public.job_error_category, boolean) from public, anon, authenticated;
revoke all on function public.acknowledge_job_cancellation(uuid, text) from public, anon, authenticated;
revoke all on function public.process_database_jobs(integer) from public, anon, authenticated;

grant execute on function public.recover_stale_jobs(timestamptz) to service_role;
grant execute on function public.claim_next_job(text, public.job_execution_class, integer) to service_role;
grant execute on function public.heartbeat_job(uuid, text, integer) to service_role;
grant execute on function public.report_job_progress(uuid, text, smallint, text) to service_role;
grant execute on function public.complete_job(uuid, text, jsonb) to service_role;
grant execute on function public.report_job_failure(uuid, text, public.job_error_category, boolean) to service_role;
grant execute on function public.acknowledge_job_cancellation(uuid, text) to service_role;
grant execute on function public.process_database_jobs(integer) to service_role;
