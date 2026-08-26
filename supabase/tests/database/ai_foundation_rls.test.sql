begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-ai@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000092','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-ai@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000093','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-ai@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000094','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-ai@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000095','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-other@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000091','AI Org A','00000000-0000-0000-0000-000000000091'),
('10000000-0000-0000-0000-000000000092','AI Org B','00000000-0000-0000-0000-000000000095');
insert into public.memberships (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000091','OWNER'),
('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000092','ADMIN'),
('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000093','MEMBER'),
('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000094','VIEWER'),
('10000000-0000-0000-0000-000000000092','00000000-0000-0000-0000-000000000095','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);

select lives_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000091','LOCAL_ONLY','FAST',array['ollama'],10) $$,
  'OWNER can create organization AI policy'
);
select results_eq(
  $$ select execution_mode from public.organization_ai_policies where organization_id='10000000-0000-0000-0000-000000000091' $$,
  array['LOCAL_ONLY'::public.ai_execution_mode],
  'AI policy is persisted'
);
select results_eq(
  $$ select updated_by from public.organization_ai_policies where organization_id='10000000-0000-0000-0000-000000000091' $$,
  array['00000000-0000-0000-0000-000000000091'::uuid],
  'policy actor is database-derived'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000092',true);
select lives_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000091','REMOTE_ALLOWED','BALANCED',array['ollama','openai-compatible'],25) $$,
  'ADMIN can update organization AI policy'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000093',true);
select throws_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000091','DISABLED','FAST','{}',null) $$,
  '42501', 'Organization AI policy management permission required',
  'MEMBER cannot mutate AI policy'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000094',true);
select throws_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000091','DISABLED','FAST','{}',null) $$,
  '42501', 'Organization AI policy management permission required',
  'VIEWER cannot mutate AI policy'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select throws_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000092','DISABLED','FAST','{}',null) $$,
  '42501', 'Organization AI policy management permission required',
  'manager cannot mutate another organization policy'
);
select throws_ok(
  $$ select public.set_organization_ai_policy('10000000-0000-0000-0000-000000000091','LOCAL_ONLY','FAST',array['http://unsafe'],null) $$,
  '22023', 'AI provider allowlist is invalid',
  'arbitrary provider URLs are rejected'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000093',true);
select results_eq(
  $$ select count(*)::integer from public.organization_ai_policies where organization_id='10000000-0000-0000-0000-000000000091' $$,
  array[1]::integer[],
  'MEMBER can read its organization AI policy'
);
select results_eq(
  $$ select count(*)::integer from public.organization_ai_policies where organization_id='10000000-0000-0000-0000-000000000092' $$,
  array[0]::integer[],
  'cross-organization AI policy is hidden'
);
select throws_ok(
  $$ insert into public.organization_ai_policies (organization_id,updated_by) values ('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000093') $$,
  '42501', null,
  'browser roles cannot directly insert policy'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select lives_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{"messageCount":1}') $$,
  'valid scalar trace metadata does not block Core run initialization'
);
select results_eq(
  $$ select actor_id from public.ai_runs where id='20000000-0000-0000-0000-000000000091' $$,
  array['00000000-0000-0000-0000-000000000091'::uuid],
  'run actor is database-derived'
);
select is(
  (select memory_domains::text from public.ai_runs where id='20000000-0000-0000-0000-000000000091'),
  '{}',
  'Core run stores no fabricated memory domains'
);
select throws_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000092','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{"prompt":"secret"}') $$,
  '23514', null,
  'raw prompt trace keys are rejected'
);
select throws_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000092','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{"safe":{"response":"secret"}}') $$,
  '23514', null,
  'nested raw response trace keys are rejected'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000094',true);
select throws_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000093','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{}') $$,
  '42501', 'Organization AI execution permission required',
  'VIEWER cannot start AI execution'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000093',true);
select lives_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000094','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{}') $$,
  'MEMBER can start an allowed Core AI run'
);
select throws_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000095','10000000-0000-0000-0000-000000000091','example','generate_text','example.hello','{}','FAST',null,'{}') $$,
  '42501', 'Enabled organization plugin required',
  'disabled plugin cannot create an AI run'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000091','example',true) $$,
  'OWNER can enable the registered application plugin state'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000093',true);
select lives_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000096','10000000-0000-0000-0000-000000000091','example','generate_text','example.hello','{}','FAST',null,'{"memoryDomains":[]}' ) $$,
  'enabled plugin run can start for MEMBER'
);
select lives_ok(
  $$ select public.complete_ai_run('20000000-0000-0000-0000-000000000096','10000000-0000-0000-0000-000000000091','SUCCEEDED','ollama-default','ollama',false,25,3,2,5,0,null,'{"attempts":["ollama-default:1"]}') $$,
  'run actor can complete its active run'
);
select results_eq(
  $$ select total_tokens from public.ai_runs where id='20000000-0000-0000-0000-000000000096' $$,
  array[5],
  'successful usage is persisted'
);
select throws_ok(
  $$ select public.complete_ai_run('20000000-0000-0000-0000-000000000096','10000000-0000-0000-0000-000000000091','FAILED','ollama-default','ollama',false,30,null,null,null,null,'unknown','{}') $$,
  '42501', 'Active AI run not found',
  'terminal run cannot transition twice'
);
select throws_ok(
  $$ select public.complete_ai_run('20000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000091','CANCELLED',null,null,null,1,null,null,null,null,'cancelled','{}') $$,
  '42501', 'Active AI run not found',
  'member cannot complete another actor run'
);
select throws_ok(
  $$ insert into public.ai_runs (id,organization_id,actor_id,operation,capability,requested_tier,status) values ('20000000-0000-0000-0000-000000000097','10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000093','generate_text','core.ai.test','FAST','RUNNING') $$,
  '42501', null,
  'browser roles cannot directly insert AI runs'
);
select results_eq(
  $$ select count(*)::integer from public.ai_runs where organization_id='10000000-0000-0000-0000-000000000091' $$,
  array[3]::integer[],
  'member can inspect organization run metadata'
);
select results_eq(
  $$ select count(*)::integer from public.ai_runs where organization_id='10000000-0000-0000-0000-000000000092' $$,
  array[0]::integer[],
  'cross-organization runs are hidden'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select lives_ok(
  $$ select public.complete_ai_run('20000000-0000-0000-0000-000000000091','10000000-0000-0000-0000-000000000091','SUCCEEDED','remote-default','openai-compatible',true,50,10,5,15,1.25,null,'{"attempts":["remote-default:1"]}') $$,
  'owner can complete its remote run'
);
select results_eq(
  $$ select public.get_organization_ai_remote_spend('10000000-0000-0000-0000-000000000091','2026-01-01'::timestamptz) $$,
  array[1.25::numeric],
  'remote estimated spend is organization scoped and summed'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok(
  $$ select * from public.organization_ai_policies $$,
  '42501', null,
  'anonymous users cannot read AI policy'
);
select throws_ok(
  $$ select public.start_ai_run('20000000-0000-0000-0000-000000000098','10000000-0000-0000-0000-000000000091',null,'generate_text','core.ai.test','{}','FAST',null,'{}') $$,
  '42501', null,
  'anonymous users cannot call AI lifecycle functions'
);

select * from finish();
rollback;
