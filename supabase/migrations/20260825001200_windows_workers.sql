create table public.worker_registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  credential_hash bytea not null unique,
  authorized_capabilities text[] not null default '{}' check (cardinality(authorized_capabilities) between 1 and 20),
  advertised_capabilities text[] not null default '{}',
  platform text not null default 'windows' check (platform = 'windows'),
  version text check (version is null or char_length(version) between 1 and 40),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  constraint worker_creator_membership_fkey foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create table public.worker_pairing_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  worker_name text not null check (char_length(btrim(worker_name)) between 2 and 80),
  token_hash bytea not null unique,
  authorized_capabilities text[] not null check (cardinality(authorized_capabilities) between 1 and 20),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  constraint worker_pairing_expiry_valid check (expires_at > created_at and expires_at <= created_at + interval '30 minutes'),
  constraint worker_pairing_creator_fkey foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index worker_registrations_org_idx on public.worker_registrations(organization_id, created_at desc);
create index worker_registrations_seen_idx on public.worker_registrations(organization_id, last_seen_at desc) where revoked_at is null;
create index worker_pairings_org_idx on public.worker_pairing_requests(organization_id, created_at desc);

insert into public.job_definitions (
  job_type, plugin_id, capability, execution_class, priority, max_attempts,
  timeout_seconds, idempotency_mode, concurrency_group
) values (
  'core.test.worker-echo', null, 'core.worker.echo', 'EXTERNAL_WORKER', 50, 2,
  30, 'OPTIONAL', 'core.test.worker-echo'
);

create function public.create_worker_pairing(
  p_organization_id uuid, p_name text, p_token_hash_hex text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_id uuid;
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id, array['OWNER','ADMIN']::public.organization_role[]
  )) then raise exception 'Worker management permission required' using errcode='42501'; end if;
  if p_token_hash_hex !~ '^[0-9a-f]{64}$' then raise exception 'Invalid pairing token hash' using errcode='22023'; end if;
  update public.worker_pairing_requests set revoked_at=now()
  where organization_id=p_organization_id and consumed_at is null and revoked_at is null;
  insert into public.worker_pairing_requests(
    organization_id, worker_name, token_hash, authorized_capabilities, created_by, expires_at
  ) values (
    p_organization_id, btrim(p_name), decode(p_token_hash_hex,'hex'),
    array['core.worker.echo'], v_actor, now()+interval '15 minutes'
  ) returning id into v_id;
  return v_id;
end;
$$;

create function public.list_organization_workers(p_organization_id uuid)
returns table(id uuid, name text, platform text, version text, authorized_capabilities text[], advertised_capabilities text[], created_at timestamptz, last_seen_at timestamptz, revoked_at timestamptz)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization worker read permission required' using errcode='42501';
  end if;
  return query select worker.id, worker.name, worker.platform, worker.version,
    worker.authorized_capabilities, worker.advertised_capabilities,
    worker.created_at, worker.last_seen_at, worker.revoked_at
  from public.worker_registrations worker
  where worker.organization_id=p_organization_id order by worker.created_at desc;
end;
$$;

create function public.revoke_worker(p_organization_id uuid, p_worker_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.has_organization_role(
    p_organization_id, array['OWNER','ADMIN']::public.organization_role[]
  )) then raise exception 'Worker management permission required' using errcode='42501'; end if;
  update public.worker_registrations set revoked_at=coalesce(revoked_at,now())
  where id=p_worker_id and organization_id=p_organization_id;
  if not found then raise exception 'Worker not found' using errcode='P0002'; end if;
end;
$$;

create function private.worker_by_credential(p_credential text)
returns public.worker_registrations
language plpgsql security definer set search_path = '' stable
as $$
declare v_worker public.worker_registrations%rowtype;
begin
  if p_credential is null or p_credential !~ '^[0-9a-f]{64}$' then
    raise exception 'Worker authentication failed' using errcode='42501';
  end if;
  select * into v_worker from public.worker_registrations worker
  where worker.credential_hash=extensions.digest(p_credential,'sha256') and worker.revoked_at is null;
  if not found then raise exception 'Worker authentication failed' using errcode='42501'; end if;
  return v_worker;
end;
$$;

create function public.pair_windows_worker(
  p_token text, p_platform text, p_version text, p_capabilities text[]
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_pair public.worker_pairing_requests%rowtype; v_credential text; v_worker public.worker_registrations%rowtype;
begin
  select * into v_pair from public.worker_pairing_requests pairing
  where pairing.token_hash=extensions.digest(p_token,'sha256') for update;
  if not found or v_pair.expires_at<=now() or v_pair.consumed_at is not null or v_pair.revoked_at is not null then
    raise exception 'Worker pairing failed' using errcode='42501';
  end if;
  if p_platform <> 'windows' or p_version is null or char_length(p_version) not between 1 and 40
    or not p_capabilities <@ v_pair.authorized_capabilities then
    raise exception 'Worker pairing failed' using errcode='42501';
  end if;
  v_credential := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.worker_registrations(
    organization_id,name,credential_hash,authorized_capabilities,advertised_capabilities,
    platform,version,created_by,last_seen_at
  ) values (
    v_pair.organization_id,v_pair.worker_name,extensions.digest(v_credential,'sha256'),
    v_pair.authorized_capabilities,p_capabilities,'windows',p_version,v_pair.created_by,now()
  ) returning * into v_worker;
  update public.worker_pairing_requests set consumed_at=now() where id=v_pair.id;
  return jsonb_build_object('workerId',v_worker.id,'organizationId',v_worker.organization_id,
    'name',v_worker.name,'credential',v_credential,'authorizedCapabilities',v_worker.authorized_capabilities);
end;
$$;

create function public.worker_heartbeat(p_credential text, p_version text, p_capabilities text[])
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_worker public.worker_registrations%rowtype;
begin
  v_worker := private.worker_by_credential(p_credential);
  if p_capabilities is null or not p_capabilities <@ v_worker.authorized_capabilities then
    raise exception 'Worker capability rejected' using errcode='42501'; end if;
  update public.worker_registrations set last_seen_at=now(), version=left(p_version,40), advertised_capabilities=p_capabilities
  where id=v_worker.id;
  return jsonb_build_object('workerId',v_worker.id,'organizationId',v_worker.organization_id,'status','ONLINE');
end;
$$;

create function public.worker_claim_job(p_credential text, p_capabilities text[])
returns public.jobs language plpgsql security definer set search_path = ''
as $$
declare v_worker public.worker_registrations%rowtype; v_job public.jobs%rowtype; v_executor text;
begin
  v_worker := private.worker_by_credential(p_credential);
  if p_capabilities is null or not p_capabilities <@ v_worker.authorized_capabilities then
    raise exception 'Worker capability rejected' using errcode='42501'; end if;
  v_executor := 'windows/'||v_worker.id::text;
  perform private.recover_stale_jobs(now());
  select * into v_job from public.jobs job where job.organization_id=v_worker.organization_id
    and job.execution_class='EXTERNAL_WORKER' and job.status in ('QUEUED','SCHEDULED')
    and job.scheduled_at<=now() and job.next_attempt_at<=now()
    and job.attempt_count<job.max_attempts and job.capability=any(p_capabilities)
  order by job.priority desc, job.next_attempt_at, job.created_at for update skip locked limit 1;
  if not found then
    update public.worker_registrations set last_seen_at=now()
    where id=v_worker.id and (last_seen_at is null or last_seen_at<=now()-interval '30 seconds');
    return null;
  end if;
  if v_job.concurrency_group is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_job.organization_id::text||':'||v_job.concurrency_group,1101));
    if exists(select 1 from public.jobs active where active.organization_id=v_job.organization_id
      and active.concurrency_group=v_job.concurrency_group and active.status in ('RUNNING','CANCEL_REQUESTED')) then return null; end if;
  end if;
  update public.jobs set status='RUNNING',attempt_count=attempt_count+1,started_at=now(),heartbeat_at=now(),
    lease_expires_at=now()+make_interval(secs=>least(60,timeout_seconds)),claimant_id=v_executor
  where id=v_job.id returning * into v_job;
  update public.worker_registrations set last_seen_at=now()
  where id=v_worker.id and (last_seen_at is null or last_seen_at<=now()-interval '30 seconds');
  return v_job;
end;
$$;

create function public.worker_job_operation(p_credential text, p_job_id uuid, p_operation text, p_payload jsonb default '{}')
returns public.jobs language plpgsql security definer set search_path = ''
as $$
declare v_worker public.worker_registrations%rowtype; v_executor text; v_job public.jobs%rowtype;
begin
  v_worker:=private.worker_by_credential(p_credential); v_executor:='windows/'||v_worker.id::text;
  select * into v_job from public.jobs job where job.id=p_job_id and job.organization_id=v_worker.organization_id and job.claimant_id=v_executor;
  if not found then raise exception 'Worker job ownership required' using errcode='42501'; end if;
  if p_operation='heartbeat' then
    v_job:=public.heartbeat_job(p_job_id,v_executor,60);
  elsif p_operation='progress' then
    v_job:=public.report_job_progress(p_job_id,v_executor,(p_payload->>'progress')::smallint,p_payload->>'message');
  elsif p_operation='complete' then
    v_job:=public.complete_job(p_job_id,v_executor,coalesce(p_payload->'result','{}'));
  elsif p_operation='cancel' then
    v_job:=public.acknowledge_job_cancellation(p_job_id,v_executor);
  elsif p_operation='fail' then
    v_job:=public.report_job_failure(p_job_id,v_executor,(p_payload->>'category')::public.job_error_category,coalesce((p_payload->>'retryable')::boolean,false));
  elsif p_operation='status' then
    return v_job;
  else raise exception 'Worker operation rejected' using errcode='22023'; end if;
  update public.worker_registrations set last_seen_at=now() where id=v_worker.id;
  return v_job;
end;
$$;

alter table public.worker_registrations enable row level security;
alter table public.worker_pairing_requests enable row level security;
revoke all on public.worker_registrations, public.worker_pairing_requests from public,anon,authenticated;
revoke all on function private.worker_by_credential(text) from public,anon,authenticated;
revoke all on function public.create_worker_pairing(uuid,text,text) from public,anon;
revoke all on function public.list_organization_workers(uuid) from public,anon;
revoke all on function public.revoke_worker(uuid,uuid) from public,anon;
grant execute on function public.create_worker_pairing(uuid,text,text) to authenticated;
grant execute on function public.list_organization_workers(uuid) to authenticated;
grant execute on function public.revoke_worker(uuid,uuid) to authenticated;
revoke all on function public.pair_windows_worker(text,text,text,text[]) from public,anon,authenticated;
revoke all on function public.worker_heartbeat(text,text,text[]) from public,anon,authenticated;
revoke all on function public.worker_claim_job(text,text[]) from public,anon,authenticated;
revoke all on function public.worker_job_operation(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pair_windows_worker(text,text,text,text[]) to service_role;
grant execute on function public.worker_heartbeat(text,text,text[]) to service_role;
grant execute on function public.worker_claim_job(text,text[]) to service_role;
grant execute on function public.worker_job_operation(text,uuid,text,jsonb) to service_role;
