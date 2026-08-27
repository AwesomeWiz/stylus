begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-worker@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000212','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-worker@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000213','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-worker@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000214','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-worker@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000215','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-worker@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000211','Worker Org A','00000000-0000-0000-0000-000000000211'),
('10000000-0000-0000-0000-000000000212','Worker Org B','00000000-0000-0000-0000-000000000215');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000211','OWNER'),
('10000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000212','ADMIN'),
('10000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000213','MEMBER'),
('10000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000214','VIEWER'),
('10000000-0000-0000-0000-000000000212','00000000-0000-0000-0000-000000000215','OWNER');

set local role anon;
select throws_ok($$select public.list_organization_workers('10000000-0000-0000-0000-000000000211')$$,'42501',null,'anonymous cannot inspect workers');
select throws_ok($$select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Worker',repeat('a',64))$$,'42501',null,'anonymous cannot create pairings');

set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000211',true);
select lives_ok($$select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Owner worker',encode(extensions.digest('owner-token','sha256'),'hex'))$$,'OWNER creates pairing');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000212',true);
select lives_ok($$select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Admin worker',encode(extensions.digest('admin-token','sha256'),'hex'))$$,'ADMIN creates pairing');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000213',true);
select throws_ok($$select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Member worker',repeat('b',64))$$,'42501','Worker management permission required','MEMBER cannot pair');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000214',true);
select throws_ok($$select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Viewer worker',repeat('c',64))$$,'42501','Worker management permission required','VIEWER cannot pair');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000211',true);
select public.create_worker_pairing('10000000-0000-0000-0000-000000000211','Owner worker',encode(extensions.digest('owner-token-2','sha256'),'hex'));

reset role; update public.worker_pairing_requests set created_at=now()-interval '20 minutes',expires_at=now()-interval '5 minutes',revoked_at=null where worker_name='Admin worker';
set local role service_role;
select throws_ok($$select public.pair_windows_worker('admin-token','windows','0.1.0',array['core.worker.echo'])$$,'42501','Worker pairing failed','expired pairing fails');
select lives_ok($$create temporary table paired as select public.pair_windows_worker('owner-token-2','windows','0.1.0',array['core.worker.echo']) value$$,'valid pairing succeeds');
select isnt((select value->>'credential' from paired),null,'durable credential returned once');
select ok(not exists(select 1 from public.worker_registrations where encode(credential_hash,'hex')=(select value->>'credential' from paired)),'raw credential is not persisted');
select throws_ok($$select public.pair_windows_worker('owner-token-2','windows','0.1.0',array['core.worker.echo'])$$,'42501','Worker pairing failed','consumed pairing cannot replay');

set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000211',true);
select lives_ok($$select public.enqueue_job('10000000-0000-0000-0000-000000000211',null,'core.test.worker-echo','core.worker.echo','EXTERNAL_WORKER',50::smallint,now(),2::smallint,30,'{"message":"Stylus worker check"}','worker-e2e','core.test.worker-echo')$$,'external diagnostic enqueues');
select lives_ok($$select public.enqueue_job('10000000-0000-0000-0000-000000000211',null,'core.test.echo','core.jobs.test','DATABASE',50::smallint,now(),2::smallint,60,'{"message":"database"}','database-job','core.test.echo')$$,'database diagnostic remains available');
set local role service_role;
select is((public.worker_claim_job((select value->>'credential' from paired),array['core.worker.echo'])).job_type,'core.test.worker-echo','worker claims only authorized external job');
select is((select status from public.jobs where idempotency_key='database-job'),'QUEUED'::public.job_status,'worker does not claim DATABASE job');
select throws_ok($$select public.worker_job_operation((select value->>'credential' from paired),(select id from public.jobs where idempotency_key='database-job'),'progress','{"progress":50,"message":"forged"}')$$,'42501','Worker job ownership required','worker cannot mutate unowned job');
select lives_ok($$select public.worker_job_operation((select value->>'credential' from paired),(select id from public.jobs where idempotency_key='worker-e2e'),'progress','{"progress":50,"message":"Halfway"}')$$,'claimed worker reports progress');
select lives_ok($$select public.worker_job_operation((select value->>'credential' from paired),(select id from public.jobs where idempotency_key='worker-e2e'),'complete','{"result":{"acknowledged":true}}')$$,'claimed worker completes');
select ok((select status='SUCCEEDED' and progress=100 and result_metadata='{"acknowledged":true}' from public.jobs where idempotency_key='worker-e2e'),'external diagnostic reaches safe success');

set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000215',true);
select throws_ok($$select public.list_organization_workers('10000000-0000-0000-0000-000000000211')$$,'42501','Organization worker read permission required','cross-organization worker reads denied');
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000211',true);
select lives_ok($$select public.revoke_worker('10000000-0000-0000-0000-000000000211',(select (value->>'workerId')::uuid from paired))$$,'OWNER revokes worker');
set local role service_role;
select throws_ok($$select public.worker_heartbeat((select value->>'credential' from paired),'0.1.0',array['core.worker.echo'])$$,'42501','Worker authentication failed','revoked credential fails immediately');

select * from finish(); rollback;
