begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000181','00000000-0000-0000-0000-000000000000','authenticated','authenticated','performance-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000182','00000000-0000-0000-0000-000000000000','authenticated','authenticated','performance-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000183','00000000-0000-0000-0000-000000000000','authenticated','authenticated','performance-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000184','00000000-0000-0000-0000-000000000000','authenticated','authenticated','performance-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000181','Performance Org A','00000000-0000-0000-0000-000000000181'),
('10000000-0000-0000-0000-000000000182','Performance Org B','00000000-0000-0000-0000-000000000184');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000181','00000000-0000-0000-0000-000000000181','OWNER'),
('10000000-0000-0000-0000-000000000181','00000000-0000-0000-0000-000000000182','MEMBER'),
('10000000-0000-0000-0000-000000000181','00000000-0000-0000-0000-000000000183','VIEWER'),
('10000000-0000-0000-0000-000000000182','00000000-0000-0000-0000-000000000184','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000181',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000181','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000184',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000182','marketing',true);

reset role;
insert into public.marketing_reel_ideas(id,organization_id,title,status,created_by,updated_by)
values('20000000-0000-4000-8000-000000000182','10000000-0000-0000-0000-000000000182','Other source','READY','00000000-0000-0000-0000-000000000184','00000000-0000-0000-0000-000000000184');
insert into public.marketing_creative_council_runs(
  id,organization_id,source_reel_idea_id,idempotency_key,context_snapshot,
  status,current_stage,created_by,completed_at
) values (
  '30000000-0000-4000-8000-000000000182','10000000-0000-0000-0000-000000000182',
  '20000000-0000-4000-8000-000000000182','40000000-0000-4000-8000-000000000182',
  '{}'::jsonb,'SUCCEEDED','COMPLETE','00000000-0000-0000-0000-000000000184',now()
);
insert into public.marketing_reel_brief_versions(
  id,organization_id,council_run_id,source_reel_idea_id,version_number,title,
  primary_hook,spoken_script,script_sections,call_to_action,caption,
  visual_directions,critique,created_by
) values (
  '50000000-0000-4000-8000-000000000182','10000000-0000-0000-0000-000000000182',
  '30000000-0000-4000-8000-000000000182','20000000-0000-4000-8000-000000000182',1,
  'Foreign brief','Hook','Script','[{"startSecond":0,"endSecond":3,"purpose":"Open","script":"Hook"}]'::jsonb,
  'Act','Caption','[]'::jsonb,'{}'::jsonb,'00000000-0000-0000-0000-000000000184'
);

select ok(public.has_function_privilege('authenticated','public.register_marketing_published_content(uuid,text,timestamptz,text,text,uuid,text,numeric)','execute'),'authenticated may invoke guarded publication registration');
select ok(public.has_function_privilege('authenticated','public.add_marketing_performance_snapshot(uuid,uuid,timestamptz,bigint,bigint,bigint,bigint,bigint,bigint,numeric,numeric,numeric,bigint,bigint,bigint,text,text)','execute'),'authenticated may invoke guarded snapshot creation');
select ok(not public.has_function_privilege('authenticated','public.create_marketing_performance_learning(uuid,uuid,public.marketing_performance_platform,public.marketing_performance_content_type,public.marketing_performance_horizon,public.marketing_performance_metric,text,text,text[],jsonb)','execute'),'browser cannot invoke learning persistence');
select ok(public.has_function_privilege('service_role','public.create_marketing_performance_learning(uuid,uuid,public.marketing_performance_platform,public.marketing_performance_content_type,public.marketing_performance_horizon,public.marketing_performance_metric,text,text,text[],jsonb)','execute'),'trusted service may persist validated learning');
select ok(not public.has_table_privilege('authenticated','public.marketing_performance_snapshots','insert'),'authenticated has no direct snapshot insert');
select ok(not public.has_table_privilege('authenticated','public.marketing_performance_learnings','insert'),'authenticated has no direct learning insert');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000182',true);
select lives_ok($$
  select public.register_marketing_published_content(
    '10000000-0000-0000-0000-000000000181','Member Reel','2026-01-01T00:00:00Z',
    null,'native-181',null,'MYTH_BUSTING',30
  )
$$,'MEMBER registers published content');
select results_eq($$
  select count(*)::integer from public.marketing_published_content
  where organization_id='10000000-0000-0000-0000-000000000181'
    and created_by='00000000-0000-0000-0000-000000000182'
    and content_opportunity_type='MYTH_BUSTING'
$$,array[1]::integer[],'database records authenticated actor and explicit classification');
select lives_ok($$
  select public.register_marketing_published_content(
    '10000000-0000-0000-0000-000000000181','Unclassified Reel','2026-01-01T00:00:00Z'
  )
$$,'unclassified content remains valid');
select results_eq($$
  select count(*)::integer from public.marketing_published_content
  where internal_label='Unclassified Reel' and content_opportunity_type is null
$$,array[1]::integer[],'missing classification persists as null');
select throws_ok($$
  select public.register_marketing_published_content(
    '10000000-0000-0000-0000-000000000181','Foreign link','2026-01-01T00:00:00Z',
    null,null,'50000000-0000-4000-8000-000000000182'
  )
$$,'22023',null,'foreign-organization Reel Brief is rejected');
select throws_ok($$
  select public.add_marketing_performance_snapshot(
    '10000000-0000-0000-0000-000000000181',
    (select id from public.marketing_published_content where internal_label='Member Reel'),
    '2025-12-31T23:00:00Z',p_views=>1
  )
$$,'22023',null,'snapshot before publication is rejected');
select throws_ok($$
  select public.add_marketing_performance_snapshot(
    '10000000-0000-0000-0000-000000000181',
    (select id from public.marketing_published_content where internal_label='Member Reel'),
    '2026-01-08T00:00:00Z'
  )
$$,'23514',null,'all-unavailable snapshot is rejected');
select throws_ok($$
  select public.add_marketing_performance_snapshot(
    '10000000-0000-0000-0000-000000000181',
    (select id from public.marketing_published_content where internal_label='Member Reel'),
    '2026-01-08T00:00:00Z',p_views=>-1
  )
$$,'23514',null,'negative metric is rejected');
select lives_ok($$
  select public.add_marketing_performance_snapshot(
    '10000000-0000-0000-0000-000000000181',
    (select id from public.marketing_published_content where internal_label='Member Reel'),
    '2026-01-08T00:00:00Z',p_views=>0
  )
$$,'supplied zero remains a valid metric');
select lives_ok($$
  select public.add_marketing_performance_snapshot(
    '10000000-0000-0000-0000-000000000181',
    (select id from public.marketing_published_content where internal_label='Member Reel'),
    '2026-01-08T01:00:00Z',p_views=>10
  )
$$,'a later observation appends another snapshot');
select results_eq($$ select count(*)::integer from public.marketing_performance_snapshots $$,array[2]::integer[],'snapshot history is append-only');

reset role;
insert into public.marketing_performance_learnings(
  id,organization_id,platform,content_type,observation_horizon,metric,
  comparison_dimension,subject_value,sample_count,baseline_sample_count,
  segment_value,baseline_value,difference,evidence_strength,summary,caveats,
  generation_key,created_by
) values (
  '60000000-0000-4000-8000-000000000181','10000000-0000-0000-0000-000000000181',
  'INSTAGRAM','REEL','SEVEN_DAY','SAVE_RATE_BY_REACH','CONTENT_OPPORTUNITY_TYPE',
  'MYTH_BUSTING',3,5,0.08,0.05,0.03,'WEAK','Bounded observation',
  array['Small sample'],'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000182'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000182',true);
select throws_ok($$ update public.marketing_performance_snapshots set notes='rewrite' $$,'42501',null,'snapshot update is blocked by immutable trigger');
select throws_ok($$ delete from public.marketing_performance_snapshots $$,'42501',null,'snapshot delete is blocked by immutable trigger');
select throws_ok($$ update public.marketing_performance_learnings set summary='rewrite' $$,'42501',null,'learning update is blocked by immutable trigger');
select throws_ok($$ delete from public.marketing_performance_learnings $$,'42501',null,'learning delete is blocked by immutable trigger');
select results_eq($$ select count(*)::integer from public.marketing_published_content $$,array[2]::integer[],'member reads same-organization publications');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000183',true);
select results_eq($$ select count(*)::integer from public.marketing_performance_snapshots $$,array[2]::integer[],'VIEWER reads same-organization snapshots');
select throws_ok($$
  select public.register_marketing_published_content(
    '10000000-0000-0000-0000-000000000181','Viewer forged','2026-01-01T00:00:00Z'
  )
$$,'42501',null,'VIEWER cannot register content');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000184',true);
select results_eq($$ select count(*)::integer from public.marketing_published_content $$,array[0]::integer[],'cross-organization publication rows are isolated');
select results_eq($$ select count(*)::integer from public.marketing_performance_snapshots $$,array[0]::integer[],'cross-organization snapshots are isolated');
select results_eq($$ select count(*)::integer from public.marketing_performance_learnings $$,array[0]::integer[],'cross-organization learnings are isolated');

select * from finish();
rollback;
