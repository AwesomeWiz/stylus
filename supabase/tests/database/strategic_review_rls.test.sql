begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000162','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000163','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000164','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000161','Review Org A','00000000-0000-0000-0000-000000000161'),
('10000000-0000-0000-0000-000000000162','Review Org B','00000000-0000-0000-0000-000000000164');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000161','OWNER'),
('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162','MEMBER'),
('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000163','VIEWER'),
('10000000-0000-0000-0000-000000000162','00000000-0000-0000-0000-000000000164','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000161',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000161','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000164',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000162','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000161',true);
insert into public.marketing_reel_ideas(id,organization_id,title,status,created_by,updated_by)
values('20000000-0000-4000-8000-000000000161','10000000-0000-0000-0000-000000000161','Review source','READY','00000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000161');

reset role;
insert into public.marketing_creative_council_runs(
  id,organization_id,source_reel_idea_id,idempotency_key,context_snapshot,
  status,current_stage,created_by,completed_at
) values (
  '30000000-0000-4000-8000-000000000161','10000000-0000-0000-0000-000000000161',
  '20000000-0000-4000-8000-000000000161','40000000-0000-4000-8000-000000000161',
  '{}'::jsonb,'SUCCEEDED','COMPLETE','00000000-0000-0000-0000-000000000161',now()
);
insert into public.marketing_reel_brief_versions(
  id,organization_id,council_run_id,source_reel_idea_id,version_number,title,
  primary_hook,spoken_script,script_sections,call_to_action,caption,
  visual_directions,critique,created_by
) values (
  '50000000-0000-4000-8000-000000000161','10000000-0000-0000-0000-000000000161',
  '30000000-0000-4000-8000-000000000161','20000000-0000-4000-8000-000000000161',1,
  'Immutable source brief','Grounded hook','Grounded script',
  '[{"startSecond":0,"endSecond":3,"purpose":"Open","script":"Grounded"}]'::jsonb,
  'Try it','Caption','[]'::jsonb,'{}'::jsonb,'00000000-0000-0000-0000-000000000161'
);

select results_eq($$ select public.has_function_privilege('authenticated','public.start_marketing_strategic_review(uuid,uuid,uuid,uuid,jsonb)','execute') $$,array[false],'browser cannot invoke strategic-review start');
select results_eq($$ select public.has_function_privilege('service_role','public.start_marketing_strategic_review(uuid,uuid,uuid,uuid,jsonb)','execute') $$,array[true],'service role may invoke strategic-review start');

set local role service_role;
select lives_ok($$
  select public.start_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
    '50000000-0000-4000-8000-000000000161','60000000-0000-4000-8000-000000000161',
    '{"company":{},"reelBrief":{"sourceReelBriefVersionId":"50000000-0000-4000-8000-000000000161","sourceReelIdeaId":"20000000-0000-4000-8000-000000000161","versionNumber":1}}'::jsonb
  )
$$,'MEMBER starts a bounded review of an exact brief');
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs $$,array[1]::integer[],'one strategic-review run persists');
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs where source_reel_brief_version_id='50000000-0000-4000-8000-000000000161' and source_reel_idea_id='20000000-0000-4000-8000-000000000161' $$,array[1]::integer[],'run binds exact source brief and idea');
select results_eq($$
  select (public.start_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
    '50000000-0000-4000-8000-000000000161','60000000-0000-4000-8000-000000000161',
    '{"company":{},"reelBrief":{"sourceReelBriefVersionId":"50000000-0000-4000-8000-000000000161","sourceReelIdeaId":"20000000-0000-4000-8000-000000000161","versionNumber":1}}'::jsonb
  )->>'shouldExecute')::boolean
$$,array[false],'same idempotency key does not execute twice');
select results_eq($$
  select (public.start_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
    '50000000-0000-4000-8000-000000000161','60000000-0000-4000-8000-000000000162',
    '{"company":{},"reelBrief":{"sourceReelBriefVersionId":"50000000-0000-4000-8000-000000000161","sourceReelIdeaId":"20000000-0000-4000-8000-000000000161","versionNumber":1}}'::jsonb
  )->>'shouldExecute')::boolean
$$,array[false],'active uniqueness blocks concurrent duplicate work');
select throws_ok($$
  select public.start_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000162','00000000-0000-0000-0000-000000000164',
    '50000000-0000-4000-8000-000000000161','60000000-0000-4000-8000-000000000163',
    '{"company":{},"reelBrief":{"sourceReelBriefVersionId":"50000000-0000-4000-8000-000000000161","sourceReelIdeaId":"20000000-0000-4000-8000-000000000161","versionNumber":1}}'::jsonb
  )
$$,'22023',null,'cross-organization source is rejected');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000163',true);
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs $$,array[1]::integer[],'VIEWER reads enabled history');
select throws_ok($$ update public.marketing_strategic_review_runs set status='FAILED' $$,'42501',null,'VIEWER cannot forge review state');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000164',true);
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs $$,array[0]::integer[],'cross-organization history is isolated');

set local role service_role;
select throws_ok($$
  select public.complete_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
    (select id from public.marketing_strategic_review_runs limit 1),
    '70000000-0000-4000-8000-000000000161','{}'::jsonb
  )
$$,'22023',null,'final review cannot be created before Judge and prior stages');

reset role;
insert into public.ai_runs(
  id,organization_id,actor_id,plugin_id,operation,capability,requested_tier,
  selected_model_id,provider_id,is_remote,status,completed_at
)
select id,'10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
  'marketing','generate_structured','marketing.creative-council.execute',tier,
  'fake-model','fake',false,'SUCCEEDED',now()
from (values
  ('70000000-0000-4000-8000-000000000161'::uuid,'BALANCED'::public.ai_logical_tier),
  ('70000000-0000-4000-8000-000000000162'::uuid,'BALANCED'::public.ai_logical_tier),
  ('70000000-0000-4000-8000-000000000163'::uuid,'REASONING'::public.ai_logical_tier),
  ('70000000-0000-4000-8000-000000000164'::uuid,'REASONING'::public.ai_logical_tier),
  ('70000000-0000-4000-8000-000000000165'::uuid,'REASONING'::public.ai_logical_tier)
) as input(id,tier);

set local role service_role;
select lives_ok($$ select public.record_marketing_strategic_review_stage('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',(select id from public.marketing_strategic_review_runs limit 1),'AUDIENCE','70000000-0000-4000-8000-000000000161','{}') $$,'Audience result persists');
select results_eq($$ select current_stage::text from public.marketing_strategic_review_runs $$,array['BRAND'],'Audience advances exactly to Brand');
select lives_ok($$ select public.record_marketing_strategic_review_stage('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',(select id from public.marketing_strategic_review_runs limit 1),'BRAND','70000000-0000-4000-8000-000000000162','{}') $$,'Brand result persists');
select lives_ok($$ select public.record_marketing_strategic_review_stage('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',(select id from public.marketing_strategic_review_runs limit 1),'STRATEGY','70000000-0000-4000-8000-000000000163','{}') $$,'Strategy result persists');
select lives_ok($$ select public.record_marketing_strategic_review_stage('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',(select id from public.marketing_strategic_review_runs limit 1),'CHALLENGE','70000000-0000-4000-8000-000000000164','{}') $$,'Challenge result persists once');
select results_eq($$ select count(*)::integer from public.marketing_strategic_council_review_versions $$,array[0]::integer[],'no final artifact exists before Judge');
select lives_ok($$ select public.complete_marketing_strategic_review('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',(select id from public.marketing_strategic_review_runs limit 1),'70000000-0000-4000-8000-000000000165','{}') $$,'Judge completes the review');
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_stages $$,array[5]::integer[],'exactly five successful stages persist');
select results_eq($$ select count(*)::integer from public.marketing_strategic_council_review_versions $$,array[1]::integer[],'one immutable final review persists');
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs where status='SUCCEEDED' and current_stage='COMPLETE' $$,array[1]::integer[],'run reaches successful completion');
select results_eq($$ select version_number from public.marketing_strategic_council_review_versions $$,array[1],'first review uses version one');
select results_eq($$ select count(*)::integer from public.marketing_reel_brief_versions where id='50000000-0000-4000-8000-000000000161' and title='Immutable source brief' $$,array[1]::integer[],'source Reel Brief remains unchanged');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000161' $$,array[0]::integer[],'review writes no durable memory');
select lives_ok($$
  select public.start_marketing_strategic_review(
    '10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162',
    '50000000-0000-4000-8000-000000000161','60000000-0000-4000-8000-000000000164',
    '{"company":{},"reelBrief":{"sourceReelBriefVersionId":"50000000-0000-4000-8000-000000000161","sourceReelIdeaId":"20000000-0000-4000-8000-000000000161","versionNumber":1}}'::jsonb
  )
$$,'an intentional later review is allowed');
select results_eq($$ select count(*)::integer from public.marketing_strategic_review_runs $$,array[2]::integer[],'later review creates a distinct immutable run');
select results_eq($$ select count(*)::integer from public.marketing_strategic_council_review_versions $$,array[1]::integer[],'later active run does not duplicate the final artifact');

reset role;
update public.memberships set removed_at=now()
where organization_id='10000000-0000-0000-0000-000000000161'
  and user_id='00000000-0000-0000-0000-000000000162';
select ok(not private.marketing_creative_council_executable('10000000-0000-0000-0000-000000000161','00000000-0000-0000-0000-000000000162'),'removed MEMBER is denied future execution');

select * from finish();
rollback;
