begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-marketing@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000132','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-marketing@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000133','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-marketing@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000134','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-marketing@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000135','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-marketing@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000131','Marketing Org A','00000000-0000-0000-0000-000000000131'),
('10000000-0000-0000-0000-000000000132','Marketing Org B','00000000-0000-0000-0000-000000000135');
insert into public.memberships (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131','OWNER'),
('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000132','ADMIN'),
('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000133','MEMBER'),
('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000134','VIEWER'),
('10000000-0000-0000-0000-000000000132','00000000-0000-0000-0000-000000000135','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000131',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000131','marketing',true);
select lives_ok($$ insert into public.marketing_competitors(organization_id,name,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Acme','00000000-0000-0000-0000-000000000135','00000000-0000-0000-0000-000000000135') $$,'OWNER creates competitor');
select results_eq($$ select created_by from public.marketing_competitors where name='Acme' $$,array['00000000-0000-0000-0000-000000000131'::uuid],'provenance is derived');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000132',true);
select lives_ok($$ insert into public.marketing_campaigns(organization_id,name,objective,status,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Launch','Build trust','ACTIVE','00000000-0000-0000-0000-000000000132','00000000-0000-0000-0000-000000000132') $$,'ADMIN creates campaign');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000133',true);
select lives_ok($$ insert into public.marketing_reel_ideas(organization_id,title,hook,status,campaign_id,created_by,updated_by) select '10000000-0000-0000-0000-000000000131','Fast idea','Five seconds','IDEA',id,'00000000-0000-0000-0000-000000000133','00000000-0000-0000-0000-000000000133' from public.marketing_campaigns where name='Launch' $$,'MEMBER creates minimal campaign-linked Reel idea');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000134',true);
select results_eq($$ select count(*)::integer from public.marketing_reel_ideas $$,array[1]::integer[],'VIEWER reads enabled Marketing');
select throws_ok($$ insert into public.marketing_research(organization_id,title,content,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','No','Denied','00000000-0000-0000-0000-000000000134','00000000-0000-0000-0000-000000000134') $$,'42501',null,'VIEWER is read-only');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000135',true);
select results_eq($$ select count(*)::integer from public.marketing_campaigns $$,array[0]::integer[],'cross-organization read is denied');
select throws_ok($$ insert into public.marketing_campaigns(organization_id,name,objective,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Forged','No','00000000-0000-0000-0000-000000000135','00000000-0000-0000-0000-000000000135') $$,'42501',null,'cross-organization write is denied');

reset role;
insert into public.competitors(organization_id,name,type,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Core A','DIRECT','00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131'),('10000000-0000-0000-0000-000000000132','Core B','DIRECT','00000000-0000-0000-0000-000000000135','00000000-0000-0000-0000-000000000135');
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000131',true);
select throws_ok($$ update public.marketing_competitors set core_competitor_id=(select id from public.competitors where name='Core B') where name='Acme' $$,'23503',null,'cross-org Core competitor reference is rejected');
select lives_ok($$ update public.marketing_competitors set core_competitor_id=(select id from public.competitors where name='Core A') where name='Acme' $$,'same-org Core competitor reference works');
select throws_ok($$ insert into public.marketing_campaigns(organization_id,name,objective,starts_on,ends_on,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Bad dates','Invalid','2026-09-02','2026-09-01','00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131') $$,'23514',null,'invalid campaign date range rejected');
select lives_ok($$ insert into public.marketing_research(organization_id,title,content,source_url,created_by,updated_by) values ('10000000-0000-0000-0000-000000000131','Manual note','Entered by a person','https://example.test','00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131') $$,'manual research can be created');
select lives_ok($$ insert into public.marketing_creative_briefs(organization_id,title,objective,campaign_id,created_by,updated_by) select '10000000-0000-0000-0000-000000000131','Launch brief','Explain value',id,'00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131' from public.marketing_campaigns where name='Launch' $$,'campaign-linked creative brief can be created');
select lives_ok($$ update public.marketing_campaigns set archived_at=now() where name='Launch' $$,'campaign can be archived');
select results_eq($$ select count(*)::integer from public.marketing_reel_ideas where campaign_id is not null $$,array[1]::integer[],'campaign archival preserves related records');
select lives_ok($$ update public.marketing_competitors set archived_at=now() where name='Acme' $$,'competitor can be archived');
select lives_ok($$ update public.marketing_competitors set archived_at=null where name='Acme' $$,'competitor can be restored');
select ok((select count(*) >= 8 from public.activity_events where entity_type='MARKETING'),'mutations create meaningful activity');
select results_eq($$ select count(*)::integer from public.activity_events where entity_type='MARKETING' and (metadata ? 'content' or metadata ? 'notes' or metadata ? 'objective') $$,array[0]::integer[],'activity excludes sensitive content');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000131' $$,array[0]::integer[],'Marketing CRUD creates no memory');
select results_eq($$ select count(*)::integer from public.jobs where organization_id='10000000-0000-0000-0000-000000000131' $$,array[0]::integer[],'Marketing CRUD enqueues no jobs');

select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000131','marketing',false);
select results_eq($$ select count(*)::integer from public.marketing_competitors $$,array[0]::integer[],'disabled plugin hides retained data');
select results_eq($$ with changed as (update public.marketing_competitors set notes='blocked' where name='Acme' returning 1) select count(*)::integer from changed $$,array[0]::integer[],'disabled plugin blocks writes');
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000131','marketing',true);
select results_eq($$ select count(*)::integer from public.marketing_competitors $$,array[1]::integer[],'re-enabling restores unchanged data access');

reset role; update public.memberships set removed_at=now() where organization_id='10000000-0000-0000-0000-000000000131' and user_id='00000000-0000-0000-0000-000000000133';
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000133',true);
select results_eq($$ select count(*)::integer from public.marketing_reel_ideas $$,array[0]::integer[],'removed member is denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000131',true);
select throws_ok($$ delete from public.marketing_competitors where name='Acme' $$,'42501',null,'hard delete is not granted');
set local role anon; select set_config('request.jwt.claim.role','anon',true); select set_config('request.jwt.claim.sub','',true);
select throws_ok($$ select * from public.marketing_campaigns $$,'42501',null,'anonymous access is denied');
select * from finish(); rollback;
