begin;
create extension if not exists pgtap with schema extensions;
select plan(54);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-jobs@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000112','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-jobs@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000113','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-jobs@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000114','00000000-0000-0000-0000-000000000000','authenticated','authenticated','removed-jobs@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000115','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-jobs@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000111','Jobs Org A','00000000-0000-0000-0000-000000000111'),
('10000000-0000-0000-0000-000000000112','Jobs Org B','00000000-0000-0000-0000-000000000115');
insert into public.memberships (organization_id,user_id,role,removed_at) values
('10000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000111','OWNER',null),
('10000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000112','MEMBER',null),
('10000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000113','VIEWER',null),
('10000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000114','MEMBER',now()),
('10000000-0000-0000-0000-000000000112','00000000-0000-0000-0000-000000000115','OWNER',null);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000111',true);

select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"first"}','first-key','core.test.echo') $$,
  '1 owner can enqueue a registered Core-shaped job'
);
select results_eq(
  $$ select created_by from public.jobs where idempotency_key='first-key' $$,
  array['00000000-0000-0000-0000-000000000111'::uuid],
  '2 enqueue actor is database-derived'
);
select results_eq(
  $$ select (public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"ignored duplicate"}','first-key','core.test.echo')).id $$,
  $$ select id from public.jobs where idempotency_key='first-key' $$,
  '3 an explicit idempotency key returns the same durable job'
);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now()+interval '1 hour',2,60,'{"message":"future"}','future-key','core.test.echo') $$,
  '4 a future job can be scheduled'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000113',true);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"viewer"}',null,'core.test.echo') $$,
  '42501','Organization job enqueue permission required','5 VIEWER cannot enqueue'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000114',true);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"removed"}',null,'core.test.echo') $$,
  '42501','Organization job enqueue permission required','6 removed member cannot enqueue'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000111',true);
select results_eq(
  $$ select count(*)::integer from public.jobs where organization_id='10000000-0000-0000-0000-000000000112' $$,
  array[0]::integer[],
  '7 cross-organization jobs are hidden'
);
select throws_ok(
  $$ insert into public.jobs (organization_id,job_type,capability,execution_class,created_by,timeout_seconds) values ('10000000-0000-0000-0000-000000000111','core.forged.job','core.jobs.test','DATABASE','00000000-0000-0000-0000-000000000111',60) $$,
  '42501',null,'8 browser cannot directly forge a job'
);
select throws_ok(
  $$ update public.jobs set status='SUCCEEDED',completed_at=now(),progress=100,result_metadata='{}' where idempotency_key='first-key' $$,
  '42501',null,'9 browser cannot forge lifecycle fields'
);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',99,now(),2,60,'{"message":"forged settings"}',null,'core.test.echo') $$,
  '22023','Registered job definition required','10 browser cannot forge registered execution settings'
);
select throws_ok(
  $$ select public.claim_next_job('browser/worker','DATABASE',60) $$,
  '42501',null,'11 ordinary authenticated users cannot claim work'
);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111','example','example.test.greeting','example.hello','SERVERLESS',50,now(),1,10,'{"name":"Stylus"}',null,null) $$,
  '42501','Enabled organization plugin required','12 disabled plugin cannot enqueue'
);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000111','example',true) $$,
  '12 owner can enable the application plugin state'
);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111','example','example.test.greeting','example.hello','SERVERLESS',50,now(),1,10,'{"name":"Stylus"}','plugin-key',null) $$,
  '13 enabled plugin provenance can enqueue through the guarded RPC'
);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000111','example',false) $$,
  '14 owner can disable the plugin without deleting historical jobs'
);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111','example','example.test.greeting','example.hello','SERVERLESS',50,now(),1,10,'{"name":"Again"}','plugin-key-2',null) $$,
  '42501','Enabled organization plugin required','15 disabled plugin cannot enqueue new work'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000112',true);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"member"}','member-key','core.test.echo') $$,
  '16 MEMBER can enqueue ordinary Core work'
);
select lives_ok(
  $$ select public.request_job_cancellation('10000000-0000-0000-0000-000000000111',(select id from public.jobs where idempotency_key='member-key')) $$,
  '17 MEMBER can cancel its own queued job'
);
select results_eq(
  $$ select status from public.jobs where idempotency_key='member-key' $$,
  array['CANCELLED'::public.job_status],
  '18 queued cancellation completes immediately'
);
select throws_ok(
  $$ select public.request_job_cancellation('10000000-0000-0000-0000-000000000111',(select id from public.jobs where idempotency_key='future-key')) $$,
  '42501','Organization job cancellation permission required','19 MEMBER cannot cancel another actor job'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select results_eq(
  $$ select id from public.claim_next_job('worker/one','DATABASE',60) $$,
  $$ select id from public.jobs where idempotency_key='first-key' $$,
  '20 a queued eligible job is claimed atomically'
);
select results_eq(
  $$ select claimant_id from public.jobs where idempotency_key='first-key' $$,
  array['worker/one'::text],
  '21 claim assigns the executor identity'
);
select results_eq(
  $$ select attempt_count from public.jobs where idempotency_key='first-key' $$,
  array[1::smallint],
  '22 first claim advances exactly one attempt'
);
select is(
  (select (public.claim_next_job('worker/two','DATABASE',60)).id),
  null::uuid,
  '23 another worker cannot claim the running or future job'
);
select lives_ok(
  $$ select public.report_job_progress((select id from public.jobs where idempotency_key='first-key'),'worker/one',50,'Halfway') $$,
  '24 the active claimant can report bounded progress'
);
select results_eq(
  $$ select progress from public.jobs where idempotency_key='first-key' $$,
  array[50::smallint],
  '25 progress persists'
);
select lives_ok(
  $$ select public.complete_job((select id from public.jobs where idempotency_key='first-key'),'worker/one','{"acknowledged":true}') $$,
  '26 the active claimant can complete the job'
);
select results_eq(
  $$ select status from public.jobs where idempotency_key='first-key' $$,
  array['SUCCEEDED'::public.job_status],
  '27 completion is terminal and stores success'
);
select throws_ok(
  $$ select public.complete_job((select id from public.jobs where idempotency_key='first-key'),'worker/one','{}') $$,
  '42501','Active job completion rejected','28 a terminal job cannot complete twice'
);
select is(
  (select (public.claim_next_job('worker/one','DATABASE',60)).id),
  null::uuid,
  '29 a future scheduled job is not claimable early'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000111',true);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"retry"}','retry-key','core.test.echo') $$,
  '30 retry test job enqueues'
);
set local role service_role;
select results_eq(
  $$ select id from public.claim_next_job('worker/retry','DATABASE',60) $$,
  $$ select id from public.jobs where idempotency_key='retry-key' $$,
  '31 retry test job is claimed'
);
select lives_ok(
  $$ select public.report_job_failure((select id from public.jobs where idempotency_key='retry-key'),'worker/retry','transient_failure',true) $$,
  '32 transient failure is reported'
);
select results_eq(
  $$ select status from public.jobs where idempotency_key='retry-key' $$,
  array['SCHEDULED'::public.job_status],
  '33 transient failure schedules a bounded retry'
);
select ok(
  (select next_attempt_at >= now()+interval '29 seconds' from public.jobs where idempotency_key='retry-key'),
  '34 retry backoff prevents an immediate hammer loop'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"permanent"}','permanent-key','core.test.echo') $$,
  '35 permanent failure test job enqueues'
);
set local role service_role;
select results_eq(
  $$ select id from public.claim_next_job('worker/permanent','DATABASE',60) $$,
  $$ select id from public.jobs where idempotency_key='permanent-key' $$,
  '36 next eligible job is claimed'
);
select lives_ok(
  $$ select public.report_job_failure((select id from public.jobs where idempotency_key='permanent-key'),'worker/permanent','permanent_failure',false) $$,
  '37 permanent failure is recorded without retry'
);
select results_eq(
  $$ select status from public.jobs where idempotency_key='permanent-key' $$,
  array['FAILED'::public.job_status],
  '38 permanent failure is terminal'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok(
  $$ select public.retry_job('10000000-0000-0000-0000-000000000111',(select id from public.jobs where idempotency_key='permanent-key')) $$,
  '39 manager can create an auditable retry job'
);
select results_eq(
  $$ select parent_job_id from public.jobs where parent_job_id=(select id from public.jobs where idempotency_key='permanent-key') $$,
  $$ select id from public.jobs where idempotency_key='permanent-key' $$,
  '40 manual retry preserves parent lineage'
);
select throws_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"api_key":"secret"}','secret-key','core.test.echo') $$,
  '23514',null,'41 secret-shaped metadata is rejected'
);

set local role service_role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000111',true);
reset role;
update public.jobs
set scheduled_at=now()+interval '1 hour',next_attempt_at=now()+interval '1 hour'
where parent_job_id=(select id from public.jobs where idempotency_key='permanent-key');
set local role authenticated;
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"exhaust"}','exhaust-key','core.test.echo') $$,
  '42 exhausted retry test job enqueues'
);
set local role service_role;
select results_eq(
  $$ select id from public.claim_next_job('worker/exhaust','DATABASE',60) $$,
  $$ select id from public.jobs where idempotency_key='exhaust-key' $$,
  '43 exhausted retry test job is claimed'
);
reset role;
update public.jobs set attempt_count=max_attempts where idempotency_key='exhaust-key';
set local role service_role;
select lives_ok(
  $$ select public.report_job_failure((select id from public.jobs where idempotency_key='exhaust-key'),'worker/exhaust','transient_failure',true) $$,
  '44 retryable failure is accepted at the final attempt'
);
select results_eq(
  $$ select status from public.jobs where idempotency_key='exhaust-key' $$,
  array['DEAD_LETTER'::public.job_status],
  '45 exhausted retryable work remains inspectable as dead letter'
);
reset role;
update public.jobs set scheduled_at=now(),next_attempt_at=now()
where parent_job_id=(select id from public.jobs where idempotency_key='permanent-key');
set local role service_role;
select results_eq(
  $$ select parent_job_id from public.claim_next_job('worker/stale','DATABASE',60) $$,
  $$ select id from public.jobs where idempotency_key='permanent-key' $$,
  '46 the explicit retry clone can be claimed'
);
reset role;
select lives_ok(
  $$ update public.jobs set attempt_count=max_attempts,heartbeat_at=now()-interval '2 minutes',lease_expires_at=now()-interval '1 minute' where claimant_id='worker/stale' $$,
  '47 a crashed worker lease is represented deterministically'
);
set local role service_role;
select lives_ok(
  $$ select public.recover_stale_jobs(now()) $$,
  '48 stale lease reconciliation executes'
);
select results_eq(
  $$ select status from public.jobs where parent_job_id=(select id from public.jobs where idempotency_key='permanent-key') $$,
  array['TIMED_OUT'::public.job_status],
  '49 a stale final attempt becomes terminal instead of remaining RUNNING'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000111',true);
select lives_ok(
  $$ select public.enqueue_job('10000000-0000-0000-0000-000000000111',null,'core.test.echo','core.jobs.test','DATABASE',50,now(),2,60,'{"message":"cron"}','cron-key','core.test.echo') $$,
  '50 database processor test job enqueues'
);
set local role service_role;
select lives_ok(
  $$ select public.process_database_jobs(10) $$,
  '51 database-native processor executes without a browser worker'
);
select ok(
  (select status='SUCCEEDED' and result_metadata='{"acknowledged":true}'::jsonb from public.jobs where idempotency_key='cron-key'),
  '52 actual database handler produces bounded validated result metadata'
);
set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok(
  $$ select * from public.jobs $$,
  '42501',null,'53 anonymous users cannot read jobs'
);

select * from finish();
rollback;
