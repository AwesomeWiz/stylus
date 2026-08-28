begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000152','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-admin@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000153','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000154','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000155','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000151','Council Org A','00000000-0000-0000-0000-000000000151'),
('10000000-0000-0000-0000-000000000152','Council Org B','00000000-0000-0000-0000-000000000155');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151','OWNER'),
('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','ADMIN'),
('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000153','MEMBER'),
('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000154','VIEWER'),
('10000000-0000-0000-0000-000000000152','00000000-0000-0000-0000-000000000155','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000151','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000155',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000152','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
insert into public.marketing_reel_ideas(id,organization_id,title,status,created_by,updated_by)
values('20000000-0000-4000-8000-000000000151','10000000-0000-0000-0000-000000000151','Council source','READY','00000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151');
insert into public.marketing_competitors(id,organization_id,name,created_by,updated_by)
values('30000000-0000-4000-8000-000000000151','10000000-0000-0000-0000-000000000151','Evidence Co','00000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151');
insert into public.marketing_competitor_reels(id,organization_id,marketing_competitor_id,storage_path,source_size_bytes,processing_status,created_by,updated_by)
values('40000000-0000-4000-8000-000000000151','10000000-0000-0000-0000-000000000151','30000000-0000-4000-8000-000000000151','10000000-0000-0000-0000-000000000151/40000000-0000-4000-8000-000000000151/source.mp4',100,'ANALYZED','00000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151');

reset role;
insert into public.marketing_competitor_reel_analyses(id,organization_id,competitor_reel_id,analysis_version,status,structured_result,created_by,completed_at)
values('50000000-0000-4000-8000-000000000151','10000000-0000-0000-0000-000000000151','40000000-0000-4000-8000-000000000151',1,'ANALYZED','{"summary":"bounded"}'::jsonb,'00000000-0000-0000-0000-000000000151',now());

select ok(private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151'),'OWNER may execute');
select ok(private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152'),'ADMIN may execute');
select ok(private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000153'),'MEMBER may execute');
select ok(not private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000154'),'VIEWER may not execute');
select ok(not private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000155'),'cross-organization actor may not execute');
select results_eq($$ select public.has_function_privilege('authenticated','public.start_marketing_creative_council_run(uuid,uuid,uuid,uuid,jsonb,jsonb)','execute') $$,array[false],'authenticated browser cannot invoke start transition');
select results_eq($$ select public.has_function_privilege('service_role','public.start_marketing_creative_council_run(uuid,uuid,uuid,uuid,jsonb,jsonb)','execute') $$,array[true],'trusted hosted service may invoke start transition');

set local role service_role;
select lives_ok($$
  select public.start_marketing_creative_council_run(
    '10000000-0000-0000-0000-000000000151',
    '00000000-0000-0000-0000-000000000153',
    '20000000-0000-4000-8000-000000000151',
    '60000000-0000-4000-8000-000000000151',
    '{"company":{},"reelIdea":{"title":"Council source"}}'::jsonb,
    '[{"analysisId":"50000000-0000-4000-8000-000000000151","hookType":"abstract"}]'::jsonb
  )
$$,'MEMBER starts one trusted bounded run');
select results_eq($$ select count(*)::integer from public.marketing_creative_council_runs $$,array[1]::integer[],'one council run is persisted');
select results_eq($$ select count(*)::integer from public.marketing_creative_council_evidence $$,array[1]::integer[],'only explicitly supplied evidence is persisted');
select results_eq($$
  select (public.start_marketing_creative_council_run(
    '10000000-0000-0000-0000-000000000151',
    '00000000-0000-0000-0000-000000000153',
    '20000000-0000-4000-8000-000000000151',
    '60000000-0000-4000-8000-000000000151',
    '{}'::jsonb,
    '[]'::jsonb
  )->>'shouldExecute')::boolean
$$,array[false],'same idempotency key does not create or execute twice');
select results_eq($$
  select (public.start_marketing_creative_council_run(
    '10000000-0000-0000-0000-000000000151',
    '00000000-0000-0000-0000-000000000153',
    '20000000-0000-4000-8000-000000000151',
    '60000000-0000-4000-8000-000000000152',
    '{}'::jsonb,
    '[]'::jsonb
  )->>'shouldExecute')::boolean
$$,array[false],'active-run uniqueness prevents concurrent duplicate execution');
select throws_ok($$
  select public.start_marketing_creative_council_run(
    '10000000-0000-0000-0000-000000000152',
    '00000000-0000-0000-0000-000000000155',
    '20000000-0000-4000-8000-000000000151',
    '60000000-0000-4000-8000-000000000153',
    '{}'::jsonb,
    '[{"analysisId":"50000000-0000-4000-8000-000000000151"}]'::jsonb
  )
$$,'22023',null,'cross-organization source and evidence are rejected');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000154',true);
select results_eq($$ select count(*)::integer from public.marketing_creative_council_runs $$,array[1]::integer[],'VIEWER may read enabled council history');
select throws_ok($$ update public.marketing_creative_council_runs set status='FAILED' $$,'42501',null,'VIEWER cannot forge workflow state');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000155',true);
select results_eq($$ select count(*)::integer from public.marketing_creative_council_runs $$,array[0]::integer[],'cross-organization history is isolated');

reset role;
update public.memberships set removed_at=now()
where organization_id='10000000-0000-0000-0000-000000000151'
  and user_id='00000000-0000-0000-0000-000000000153';
select ok(not private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000153'),'removed MEMBER is denied future execution');
select results_eq($$ select count(*)::integer from public.marketing_reel_brief_versions $$,array[0]::integer[],'no Reel Brief exists before all three successful stages');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000151' $$,array[0]::integer[],'council start writes no durable memory');
select results_eq($$ select count(*)::integer from public.marketing_reel_ideas where id='20000000-0000-4000-8000-000000000151' and title='Council source' $$,array[1]::integer[],'source Reel Idea remains unchanged');
select results_eq($$ select count(*)::integer from public.marketing_creative_briefs $$,array[0]::integer[],'human Creative Briefs remain separate');

select * from finish();
rollback;
