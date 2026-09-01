begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000000','authenticated','authenticated','research-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000172','00000000-0000-0000-0000-000000000000','authenticated','authenticated','research-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000173','00000000-0000-0000-0000-000000000000','authenticated','authenticated','research-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000174','00000000-0000-0000-0000-000000000000','authenticated','authenticated','research-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000171','Research Org A','00000000-0000-0000-0000-000000000171'),
('10000000-0000-0000-0000-000000000172','Research Org B','00000000-0000-0000-0000-000000000174');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000171','OWNER'),
('10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172','MEMBER'),
('10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000173','VIEWER'),
('10000000-0000-0000-0000-000000000172','00000000-0000-0000-0000-000000000174','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000171',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000171','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000174',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000172','marketing',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000171',true);
select lives_ok($$
  insert into public.marketing_competitors(
    id,organization_id,name,created_by,updated_by
  ) values(
    '40000000-0000-4000-8000-000000000171',
    '10000000-0000-0000-0000-000000000171','Research competitor',
    '00000000-0000-0000-0000-000000000171',
    '00000000-0000-0000-0000-000000000171'
  )
$$,'OWNER may create the existing competitor parent');
select lives_ok($$
  insert into public.marketing_competitor_social_profiles(
    id,organization_id,marketing_competitor_id,platform,native_account_id,
    canonical_url,status,created_by,updated_by
  ) values(
    '41000000-0000-4000-8000-000000000171',
    '10000000-0000-0000-0000-000000000171',
    '40000000-0000-4000-8000-000000000171','YOUTUBE',
    'UC1234567890123456789012',
    'https://www.youtube.com/channel/UC1234567890123456789012',
    'AVAILABLE','00000000-0000-0000-0000-000000000171',
    '00000000-0000-0000-0000-000000000171'
  )
$$,'OWNER may associate a bounded public social identity');
select results_eq($$
  select organization_id::text || ':' || platform || ':' || native_account_id
  from public.marketing_competitor_social_profiles
$$,array['10000000-0000-0000-0000-000000000171:YOUTUBE:UC1234567890123456789012'],
'social profile retains exact tenant, platform, and native identity');
select throws_ok($$
  insert into public.marketing_competitor_social_profiles(
    organization_id,marketing_competitor_id,platform,native_account_id,
    canonical_url,status,created_by,updated_by
  ) values(
    '10000000-0000-0000-0000-000000000171',
    '40000000-0000-4000-8000-000000000171','INSTAGRAM','safe-account',
    'https://attacker.example/safe-account','APPROVAL_REQUIRED',
    '00000000-0000-0000-0000-000000000171',
    '00000000-0000-0000-0000-000000000171'
  )
$$,'23514',null,'non-platform canonical provenance URL is rejected');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000173',true);
select results_eq($$
  select count(*)::integer from public.marketing_competitor_social_profiles
$$,array[1]::integer[],'VIEWER reads social profiles for the enabled organization');
select throws_ok($$
  update public.marketing_competitor_social_profiles set status='POLICY_DENIED'
$$,'42501',null,'VIEWER cannot modify social profiles');
select throws_ok($$
  delete from public.marketing_competitor_social_profiles
$$,'42501',null,'authenticated users receive no social-profile hard-delete grant');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000174',true);
select results_eq($$
  select count(*)::integer from public.marketing_competitor_social_profiles
$$,array[0]::integer[],'cross-organization social profiles are isolated');
reset role;

select results_eq($$ select public.has_function_privilege('authenticated','public.enqueue_marketing_external_research(uuid,uuid,jsonb,uuid)','execute') $$,array[false],'browser cannot invoke atomic research enqueue');
select results_eq($$ select public.has_function_privilege('service_role','public.enqueue_marketing_external_research(uuid,uuid,jsonb,uuid)','execute') $$,array[true],'service role may invoke atomic research enqueue');
select results_eq($$ select public.has_function_privilege('authenticated','public.record_marketing_external_research_retrieval(uuid,uuid,jsonb,jsonb,boolean,text[],integer,integer,integer,integer)','execute') $$,array[false],'browser cannot persist enriched research evidence');
select results_eq($$ select public.has_function_privilege('authenticated','public.claim_serverless_job(uuid,text,integer)','execute') $$,array[false],'browser cannot target a SERVERLESS claim');
select results_eq($$ select public.has_function_privilege('service_role','public.claim_serverless_job(uuid,text,integer)','execute') $$,array[true],'service role may target a SERVERLESS claim');
select results_eq($$ select enumlabel from pg_enum join pg_type on pg_type.oid=pg_enum.enumtypid where pg_type.typname='marketing_external_research_adapter' and enumlabel in ('reddit','fashion-editorial') order by enumlabel $$,array['fashion-editorial','reddit'],'fashion source adapters extend the enum forward');
select results_eq($$ select enumlabel from pg_enum join pg_type on pg_type.oid=pg_enum.enumtypid where pg_type.typname='marketing_external_research_adapter' and enumlabel='social' $$,array['social'],'social adapter extends the enum forward');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000171' $$,array[0]::integer[],'social-profile setup writes no durable memory');

set local role service_role;
select lives_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What sizing pain points recur for fashion shoppers?","intent":"AUDIENCE_PAIN","queryTerms":["sizing"],"plan":{"version":"marketing-fashion-source-plan-v1","intent":"AUDIENCE_PAIN","selectedSourceFamilies":["REDDIT","EDITORIAL"],"reasonCodes":["CONSUMER_DISCUSSION_SOURCE","EDITORIAL_CONTEXT_SOURCE","EXISTING_FEED_SOURCE"],"reddit":{"communityIds":["female-fashion-advice","male-fashion-advice"],"queryVariants":["sizing"]},"editorial":{"sourceIds":["vogue-editorial","retail-dive"],"includeSearchDiscovery":false},"hackerNews":null}}'::jsonb,
    '20000000-0000-4000-8000-000000000171'
  )
$$,'MEMBER atomically enqueues bounded external research');
select results_eq($$ select count(*)::integer from public.marketing_external_research_runs $$,array[1]::integer[],'one research run persists');
select results_eq($$ select requested_source_count from public.marketing_external_research_runs limit 1 $$,array[2::smallint],'persisted deterministic plan records two selected source families');
select results_eq($$ select count(*)::integer from public.jobs where job_type='marketing.external-research.run' and capability='marketing.external-research.execute' and execution_class='SERVERLESS' $$,array[1]::integer[],'one exact SERVERLESS job persists');
select results_eq($$ select count(*)::integer from public.marketing_external_research_runs as run join public.jobs as job on job.id=run.job_id where job.input_metadata->>'runId'=run.id::text $$,array[1]::integer[],'run and job are linked atomically');
select results_eq($$
  select (public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What sizing pain points recur for fashion shoppers?","intent":"AUDIENCE_PAIN","queryTerms":["sizing"],"plan":{"version":"marketing-fashion-source-plan-v1","intent":"AUDIENCE_PAIN","selectedSourceFamilies":["REDDIT","EDITORIAL"],"reasonCodes":["CONSUMER_DISCUSSION_SOURCE","EDITORIAL_CONTEXT_SOURCE","EXISTING_FEED_SOURCE"],"reddit":{"communityIds":["female-fashion-advice","male-fashion-advice"],"queryVariants":["sizing"]},"editorial":{"sourceIds":["vogue-editorial","retail-dive"],"includeSearchDiscovery":false},"hackerNews":null}}'::jsonb,
    '20000000-0000-4000-8000-000000000171'
  )->>'duplicate')::boolean
$$,array[true],'same invocation is idempotent');
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What else recurs for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"new","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000172'
  )
$$,'54000',null,'one active run per organization is enforced');
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000172','00000000-0000-0000-0000-000000000172',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"top","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000173'
  )
$$,'42501',null,'cross-organization actor context is rejected');
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000173',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"top","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000174'
  )
$$,'42501',null,'VIEWER cannot execute external research');
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":null,"rssFeedUrls":["http://127.0.0.1/private"]}'::jsonb,
    '20000000-0000-4000-8000-000000000175'
  )
$$,'22023',null,'invalid feed request is rejected');

select lives_ok($$
  select public.claim_serverless_job(
    (select job_id from public.marketing_external_research_runs limit 1),
    'task-017-lifecycle',120
  )
$$,'immediate hosted executor atomically claims the exact research job');
select results_eq($$
  select (public.claim_serverless_job(
    (select job_id from public.marketing_external_research_runs limit 1),
    'task-017-concurrent',120
  )).id is null
$$,array[true],'concurrent immediate or Cron execution cannot claim the running job twice');
select lives_ok($$
  select public.begin_marketing_external_research(
    (select job_id from public.marketing_external_research_runs limit 1),
    (select id from public.marketing_external_research_runs limit 1)
  )
$$,'claimed research run begins');
select lives_ok($$
  select public.record_marketing_external_research_retrieval(
    (select job_id from public.marketing_external_research_runs limit 1),
    (select id from public.marketing_external_research_runs limit 1),
    '[{"sourceKey":"SRC-1","adapter":"reddit","status":"SUCCEEDED","nativeId":"post-1","canonicalUrl":"https://www.reddit.com/r/fashion/comments/post-1/","title":"Sizing","author":"shopper","publishedAt":"2026-08-29T00:00:00Z","fetchedAt":"2026-08-29T00:01:00Z","contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","failureCategory":null,"safeMetadata":{"sourceRequest":"reddit:fashion","community":"fashion"}}]'::jsonb,
    '[{"evidenceId":"EVID-1","evidenceType":"REDDIT_POST","excerpt":"Sizing labels vary between brands.","sourceKey":"SRC-1","nativeId":"post-1","parentNativeId":null,"canonicalUrl":"https://www.reddit.com/r/fashion/comments/post-1/","title":"Sizing","author":"shopper","publishedAt":"2026-08-29T00:00:00Z","fetchedAt":"2026-08-29T00:01:00Z","contentHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","safeMetadata":{"score":10,"community":"fashion"}}]'::jsonb,
    false,'{}',1,0,100,24
  )
$$,'retrieval persists source and evidence provenance');
select results_eq($$ select evidence_type || ':' || native_id || ':' || (safe_metadata->>'score') from public.marketing_external_research_evidence limit 1 $$,array['REDDIT_POST:post-1:10'],'Reddit evidence keeps its exact type and native provenance');
select results_eq($$ select status::text from public.marketing_external_research_runs limit 1 $$,array['SYNTHESIZING'],'evidence advances the run to synthesis');
select lives_ok($$
  select public.start_marketing_external_research_ai_run(
    (select job_id from public.marketing_external_research_runs limit 1),
    '30000000-0000-4000-8000-000000000171','generate_structured',
    'marketing.external-research.execute','BALANCED','{}'
  )
$$,'one trusted balanced synthesis trace starts');
select lives_ok($$
  select public.complete_marketing_external_research_ai_run(
    (select job_id from public.marketing_external_research_runs limit 1),
    '30000000-0000-4000-8000-000000000171','SUCCEEDED','test-model','test-provider',false,
    10,10,10,20,0,null,'{}'
  )
$$,'trusted synthesis trace completes');
select throws_ok($$
  select public.complete_marketing_external_research(
    (select job_id from public.marketing_external_research_runs limit 1),
    (select id from public.marketing_external_research_runs limit 1),
    '30000000-0000-4000-8000-000000000171',
    '{"schemaVersion":"marketing-fashion-research-report-v1","audienceSignals":[{"evidenceRefs":["EVID-2"]}],"languageSignals":[],"trendSignals":[],"objections":[],"debates":[],"contentOpportunities":[]}'::jsonb
  )
$$,'22023',null,'invented evidence reference cannot create a report');
select lives_ok($$
  select public.complete_marketing_external_research(
    (select job_id from public.marketing_external_research_runs limit 1),
    (select id from public.marketing_external_research_runs limit 1),
    '30000000-0000-4000-8000-000000000171',
    '{"schemaVersion":"marketing-fashion-research-report-v1","summary":"Summary","audienceSignals":[{"evidenceRefs":["EVID-1"]}],"languageSignals":[],"trendSignals":[],"objections":[],"debates":[],"contentOpportunities":[]}'::jsonb
  )
$$,'valid evidence references create an immutable report');
select results_eq($$ select count(*)::integer from public.marketing_external_research_reports $$,array[1]::integer[],'one immutable report persists');
select results_eq($$ select schema_version from public.marketing_external_research_reports $$,array['marketing-fashion-research-report-v1'],'fashion report schema version persists immutably');
select lives_ok($$
  select public.complete_job(
    (select job_id from public.marketing_external_research_runs limit 1),
    'task-017-lifecycle',jsonb_build_object('runId',(select id from public.marketing_external_research_runs limit 1))
  )
$$,'job completes after the domain report');

do $$
declare v_index integer; v_job public.jobs%rowtype;
begin
  for v_index in 2..5 loop
    perform public.enqueue_marketing_external_research(
      '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
      jsonb_build_object('question','What pain points recur for startup teams?','objective','AUDIENCE_PAINS','queryTerms',jsonb_build_array('startup'),'hackerNewsStream','top','rssFeedUrls','[]'::jsonb),
      ('20000000-0000-4000-8000-' || lpad((170 + v_index)::text,12,'0'))::uuid
    );
    v_job := public.claim_next_job('task-017-rate-test','SERVERLESS',120);
    perform public.report_job_failure(v_job.id,'task-017-rate-test','permanent_failure',false);
  end loop;
end;
$$;
select results_eq($$ select count(*)::integer from public.marketing_external_research_runs $$,array[5]::integer[],'five submissions in one hour are retained');
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"top","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000180'
  )
$$,'54000',null,'sixth submission in one hour is rejected');

reset role;
update public.memberships set removed_at=now()
where organization_id='10000000-0000-0000-0000-000000000171'
  and user_id='00000000-0000-0000-0000-000000000172';
set local role service_role;
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000171','00000000-0000-0000-0000-000000000172',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"top","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000181'
  )
$$,'42501',null,'removed MEMBER cannot execute external research');
reset role;
update public.organization_plugins set enabled=false
where organization_id='10000000-0000-0000-0000-000000000172' and plugin_id='marketing';
set local role service_role;
select throws_ok($$
  select public.enqueue_marketing_external_research(
    '10000000-0000-0000-0000-000000000172','00000000-0000-0000-0000-000000000174',
    '{"question":"What pain points recur for startup teams?","objective":"AUDIENCE_PAINS","queryTerms":["startup"],"hackerNewsStream":"top","rssFeedUrls":[]}'::jsonb,
    '20000000-0000-4000-8000-000000000182'
  )
$$,'42501',null,'Marketing-disabled organization cannot execute research');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000173',true);
select results_eq($$ select count(*)::integer from public.marketing_external_research_runs $$,array[5]::integer[],'VIEWER reads enabled organization history');
select throws_ok($$ update public.marketing_external_research_runs set partial=true $$,'42501',null,'VIEWER cannot forge research lifecycle');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000174',true);
select results_eq($$ select count(*)::integer from public.marketing_external_research_runs $$,array[0]::integer[],'cross-organization research history is isolated');

reset role;
select throws_ok($$ update public.marketing_external_research_sources set title='changed' $$,'55000',null,'persisted sources are immutable');
select throws_ok($$ update public.marketing_external_research_evidence set excerpt='changed' $$,'55000',null,'enriched evidence is immutable');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000171' $$,array[0]::integer[],'external research writes no durable memory');
select results_eq($$ select max_attempts from public.job_definitions where job_type='marketing.external-research.run' $$,array[1],'research job has no platform retry multiplication');
select results_eq($$ select timeout_seconds from public.job_definitions where job_type='marketing.external-research.run' $$,array[120],'research job has a 120-second workflow bound');

select * from finish();
rollback;
