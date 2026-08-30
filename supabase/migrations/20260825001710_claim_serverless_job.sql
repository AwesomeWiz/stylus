-- TASK-017 correction: atomically target an immediately enqueued SERVERLESS job.
create function public.claim_serverless_job(
  p_job_id uuid,
  p_executor_id text,
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
  if p_job_id is null
    or p_executor_id is null
    or char_length(p_executor_id) not between 3 and 120
    or p_executor_id !~ '^[A-Za-z0-9][A-Za-z0-9:._/-]*$'
    or p_lease_seconds not between 15 and 900 then
    raise exception 'Job claim parameters are invalid' using errcode = '22023';
  end if;

  perform private.recover_stale_jobs(v_now);

  select * into v_job
  from public.jobs as job
  where job.id = p_job_id
    and job.execution_class = 'SERVERLESS'
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
  for update skip locked;

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
    lease_expires_at = v_now + make_interval(
      secs => least(p_lease_seconds, job.timeout_seconds)
    ),
    progress_message = coalesce(job.progress_message, 'Job started.'),
    progress_updated_at = v_now,
    error_category = null
  where job.id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.claim_serverless_job(uuid,text,integer)
from public, anon, authenticated;
grant execute on function public.claim_serverless_job(uuid,text,integer)
to service_role;
