begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users(
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000000','authenticated','authenticated','council-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000201','Council Org A','00000000-0000-0000-0000-000000000201'),
('10000000-0000-0000-0000-000000000202','Council Org B','00000000-0000-0000-0000-000000000204');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201','OWNER'),
('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','MEMBER'),
('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000203','VIEWER'),
('10000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000204','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000201',true);
select public.set_organization_plugin_enabled(
  '10000000-0000-0000-0000-000000000201','marketing',true
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000204',true);
select public.set_organization_plugin_enabled(
  '10000000-0000-0000-0000-000000000202','marketing',true
);
reset role;

insert into public.marketing_performance_learnings(
  id,organization_id,platform,content_type,observation_horizon,metric,
  comparison_dimension,subject_value,sample_count,baseline_sample_count,
  segment_value,baseline_value,difference,evidence_strength,summary,caveats,
  generation_key,created_by
) values
('15000000-0000-4000-8000-000000000201','10000000-0000-0000-0000-000000000201','INSTAGRAM','REEL','SEVEN_DAY','SAVE_RATE_BY_REACH','CONTENT_OPPORTUNITY_TYPE','RELATABLE_PAIN',3,6,0.03,0.05,-0.02,'WEAK','Same-organization learning',array['Association is not causation.'],'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1','00000000-0000-0000-0000-000000000202'),
('15000000-0000-4000-8000-000000000202','10000000-0000-0000-0000-000000000202','INSTAGRAM','REEL','SEVEN_DAY','SAVE_RATE_BY_REACH','CONTENT_OPPORTUNITY_TYPE','MYTH_BUSTING',3,6,0.07,0.05,0.02,'WEAK','Foreign learning',array['Association is not causation.'],'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2','00000000-0000-0000-0000-000000000204');

select ok(
  not public.has_table_privilege(
    'authenticated','public.marketing_ask_council_messages','insert'
  ),
  'browser cannot forge Ask Council messages'
);
select ok(
  not public.has_function_privilege(
    'authenticated',
    'public.start_marketing_ask_council_turn(uuid,uuid,uuid,uuid,text,text,text[],jsonb,jsonb)',
    'execute'
  ),
  'browser cannot start a trusted Ask Council turn directly'
);
select ok(
  public.has_function_privilege(
    'service_role',
    'public.start_marketing_ask_council_turn(uuid,uuid,uuid,uuid,text,text,text[],jsonb,jsonb)',
    'execute'
  ),
  'trusted service can start a guarded Ask Council turn'
);
select ok(
  public.has_function_privilege(
    'service_role',
    'public.record_marketing_ask_council_specialist(uuid,uuid,uuid,smallint,text,uuid,jsonb)',
    'execute'
  ),
  'trusted service can record a guarded specialist result'
);
select ok(
  public.has_function_privilege(
    'service_role',
    'public.complete_marketing_ask_council_turn(uuid,uuid,uuid,uuid,jsonb)',
    'execute'
  ),
  'trusted service can complete a guarded Ask Council turn'
);
select ok(
  public.has_function_privilege(
    'authenticated',
    'public.set_marketing_ask_council_conversation_archived(uuid,uuid,boolean)',
    'execute'
  ),
  'authenticated users may invoke the guarded archive RPC'
);

set local role service_role;
select lives_ok($$
  select public.start_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',null,
    '20000000-0000-4000-8000-000000000201',
    'What content direction should we test next?','CONTENT_IDEA',
    array['marketing.content-strategist']::text[],
    '{"context":{"companyModelReferenceId":"CTX-COMPANY-1"}}'::jsonb,
    '[{"referenceType":"PERFORMANCE_LEARNING","modelReferenceId":"PERF-1","label":"RELATABLE PAIN · WEAK","performanceLearningId":"15000000-0000-4000-8000-000000000201","snapshot":{"modelReferenceId":"PERF-1","evidenceStrength":"WEAK"}}]'::jsonb
  )
$$,'service starts one organization-scoped turn for an active MEMBER');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_conversations
  where organization_id='10000000-0000-0000-0000-000000000201'
$$,array[1]::integer[],'start creates one conversation');
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_messages
  where organization_id='10000000-0000-0000-0000-000000000201' and role='USER'
$$,array[1]::integer[],'start creates one immutable user message');
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_context_refs
  where performance_learning_id='15000000-0000-4000-8000-000000000201'
$$,array[1]::integer[],'same-organization typed context provenance is persisted');
select throws_ok($$
  insert into public.marketing_ask_council_context_refs(
    organization_id,turn_id,reference_type,model_reference_id,label,
    performance_learning_id,snapshot
  ) values (
    '10000000-0000-0000-0000-000000000201',
    (select id from public.marketing_ask_council_turns
      where idempotency_key='20000000-0000-4000-8000-000000000201'),
    'PERFORMANCE_LEARNING','PERF-2','Foreign learning',
    '15000000-0000-4000-8000-000000000202','{}'
  )
$$,'23503',null,'cross-organization context attachment is rejected by composite foreign key');

set local role service_role;
select lives_ok($$
  select public.start_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',null,
    '20000000-0000-4000-8000-000000000201',
    'What content direction should we test next?','CONTENT_IDEA',
    array['marketing.content-strategist']::text[],
    '{"context":{"companyModelReferenceId":"CTX-COMPANY-1"}}'::jsonb,
    '[{"referenceType":"PERFORMANCE_LEARNING","modelReferenceId":"PERF-1","label":"RELATABLE PAIN · WEAK","performanceLearningId":"15000000-0000-4000-8000-000000000201","snapshot":{"modelReferenceId":"PERF-1","evidenceStrength":"WEAK"}}]'::jsonb
  )
$$,'repeating the idempotency key returns safely');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_turns
  where idempotency_key='20000000-0000-4000-8000-000000000201'
$$,array[1]::integer[],'idempotency creates exactly one turn');

insert into public.ai_runs(
  id,organization_id,actor_id,plugin_id,operation,capability,memory_domains,
  requested_tier,selected_model_id,provider_id,is_remote,status,completed_at,
  duration_ms,trace_metadata
) values
('30000000-0000-4000-8000-000000000201','10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','marketing','generate_structured','marketing.ask-council.execute',array['company','marketing'],'BALANCED','test-model','test-provider',true,'SUCCEEDED',now(),1,'{}'),
('30000000-0000-4000-8000-000000000202','10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','marketing','generate_structured','marketing.ask-council.execute',array['company','marketing'],'BALANCED','test-model','test-provider',true,'SUCCEEDED',now(),1,'{}');

set local role service_role;
select lives_ok($$
  select public.record_marketing_ask_council_specialist(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    (select id from public.marketing_ask_council_turns
      where idempotency_key='20000000-0000-4000-8000-000000000201'),
    1,'marketing.content-strategist',
    '30000000-0000-4000-8000-000000000201',
    '{"recommendation":"Run one controlled test."}'::jsonb
  )
$$,'service records the exact selected specialist with valid AI provenance');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_specialist_results
$$,array[1]::integer[],'one specialist result is persisted');

set local role service_role;
select lives_ok($$
  select public.complete_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    (select id from public.marketing_ask_council_turns
      where idempotency_key='20000000-0000-4000-8000-000000000201'),
    '30000000-0000-4000-8000-000000000202',
    '{"answer":"Test one evidence-bounded direction."}'::jsonb
  )
$$,'service creates an assistant answer only after all specialists succeed');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_messages
  where role='ASSISTANT'
$$,array[1]::integer[],'successful completion creates one assistant message');
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_turns
  where status='SUCCEEDED'
$$,array[1]::integer[],'completed turn has a terminal success state');
select results_eq($$
  select count(*)::integer from public.activity_events
  where organization_id='10000000-0000-0000-0000-000000000201'
    and entity_type='MARKETING'
    and metadata->>'record_type'='Ask Council conversation'
$$,array[2]::integer[],'bounded activity records conversation creation and completion');

set local role service_role;
select lives_ok($$
  select public.start_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    (select id from public.marketing_ask_council_conversations limit 1),
    '20000000-0000-4000-8000-000000000203','Will failure create an answer?','GENERAL_MARKETING',
    array['marketing.content-strategist']::text[],'{}'::jsonb,'[]'::jsonb
  )
$$,'service appends a follow-up turn to the existing conversation');
select lives_ok($$
  select public.fail_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    (select id from public.marketing_ask_council_turns
      where idempotency_key='20000000-0000-4000-8000-000000000203'),
    'UNKNOWN',null,null
  )
$$,'service records a safe failed follow-up without an assistant answer');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_messages
  where conversation_id=(
    select conversation_id from public.marketing_ask_council_turns
    where idempotency_key='20000000-0000-4000-8000-000000000203'
  ) and role='ASSISTANT'
$$,array[1]::integer[],'failed follow-up adds no successful assistant message');
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_turns
  where idempotency_key='20000000-0000-4000-8000-000000000203'
    and status='FAILED' and failure_category='UNKNOWN'
$$,array[1]::integer[],'failed follow-up retains only normalized failure state');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);
select throws_ok($$
  insert into public.marketing_ask_council_messages(
    organization_id,conversation_id,role,content,ai_run_id,structured_output
  ) values (
    '10000000-0000-0000-0000-000000000201',
    (select id from public.marketing_ask_council_conversations limit 1),
    'ASSISTANT','Forged answer','30000000-0000-4000-8000-000000000202','{}'
  )
$$,'42501',null,'authenticated MEMBER cannot forge an assistant message');
reset role;
select throws_ok($$
  update public.marketing_ask_council_messages set content='Rewritten history'
$$,'42501',null,'message update is blocked by immutable trigger');
select throws_ok($$
  delete from public.marketing_ask_council_messages
$$,'42501',null,'message deletion is blocked by immutable trigger');
select throws_ok($$
  update public.marketing_ask_council_turns set intent='BRAND'
$$,'42501',null,'turn routing provenance is immutable');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_conversations
$$,array[1]::integer[],'MEMBER reads same-organization conversation history');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000203',true);
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_messages
$$,array[3]::integer[],'VIEWER reads same-organization Ask Council history');
select throws_ok($$
  select public.set_marketing_ask_council_conversation_archived(
    '10000000-0000-0000-0000-000000000201',
    (select id from public.marketing_ask_council_conversations limit 1),true
  )
$$,'42501',null,'VIEWER cannot archive a conversation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);
select lives_ok($$
  select public.set_marketing_ask_council_conversation_archived(
    '10000000-0000-0000-0000-000000000201',
    (select id from public.marketing_ask_council_conversations limit 1),true
  )
$$,'MEMBER may archive completed conversation history');
reset role;
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_conversations
  where archived_at is not null
$$,array[1]::integer[],'conversation archival preserves its history');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000204',true);
select results_eq($$
  select count(*)::integer from public.marketing_ask_council_conversations
$$,array[0]::integer[],'cross-organization conversations are isolated');
reset role;

set local role service_role;
select throws_ok($$
  select public.start_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000203',null,
    '20000000-0000-4000-8000-000000000202','Viewer forged question','GENERAL_MARKETING',
    array['marketing.content-strategist']::text[],'{}'::jsonb,'[]'::jsonb
  )
$$,'42501',null,'service guard rejects VIEWER execution');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000201',true);
select public.set_organization_plugin_enabled(
  '10000000-0000-0000-0000-000000000201','marketing',false
);
reset role;
set local role service_role;
select throws_ok($$
  select public.start_marketing_ask_council_turn(
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',null,
    '20000000-0000-4000-8000-000000000204','Disabled plugin','GENERAL_MARKETING',
    array['marketing.content-strategist']::text[],'{}'::jsonb,'[]'::jsonb
  )
$$,'42501',null,'disabled Marketing plugin blocks trusted execution');

select * from finish();
rollback;
