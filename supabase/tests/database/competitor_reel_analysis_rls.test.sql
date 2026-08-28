begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-owner@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000142','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-member@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000143','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-viewer@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000144','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-other@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,created_by) values
('10000000-0000-0000-0000-000000000141','Reel Org A','00000000-0000-0000-0000-000000000141'),
('10000000-0000-0000-0000-000000000142','Reel Org B','00000000-0000-0000-0000-000000000144');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000141','OWNER'),
('10000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000142','MEMBER'),
('10000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000143','VIEWER'),
('10000000-0000-0000-0000-000000000142','00000000-0000-0000-0000-000000000144','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000141',true);
select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000141','marketing',true);
select lives_ok($$ insert into public.marketing_competitors(id,organization_id,name,created_by,updated_by) values('20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141','Observed Co','00000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000141') $$,'owner creates parent competitor');
select lives_ok($$ insert into public.marketing_competitor_reels(id,organization_id,marketing_competitor_id,storage_path,source_size_bytes,original_filename,source_url,processing_status,created_by,updated_by) values('30000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141','20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141/30000000-0000-4000-8000-000000000141/source.mp4',1024,'demo.mp4','https://instagram.com/reel/metadata-only','UPLOADED','00000000-0000-0000-0000-000000000144','00000000-0000-0000-0000-000000000144') $$,'owner adds bounded Reel');
select results_eq($$ select created_by from public.marketing_competitor_reels where id='30000000-0000-4000-8000-000000000141' $$,array['00000000-0000-0000-0000-000000000141'::uuid],'Reel provenance is server derived');
select results_eq($$ select source_url from public.marketing_competitor_reels where id='30000000-0000-4000-8000-000000000141' $$,array['https://instagram.com/reel/metadata-only'::text],'source URL remains metadata');
select throws_ok($$ insert into public.marketing_competitor_reels(organization_id,marketing_competitor_id,storage_path,source_size_bytes,created_by,updated_by) values('10000000-0000-0000-0000-000000000141','20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141/30000000-0000-4000-8000-000000000142/source.mp4',104857601,'00000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000141') $$,'23514',null,'oversize metadata rejected');
select throws_ok($$ insert into public.marketing_competitor_reels(organization_id,marketing_competitor_id,storage_path,source_size_bytes,source_url,created_by,updated_by) values('10000000-0000-0000-0000-000000000141','20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141/30000000-0000-4000-8000-000000000143/source.mp4',100,'https://user:secret@example.test/video','00000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000141') $$,'23514',null,'credential URL rejected');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000143',true);
select results_eq($$ select count(*)::integer from public.marketing_competitor_reels $$,array[1]::integer[],'viewer reads Reels');
select throws_ok($$ insert into public.marketing_competitor_reels(organization_id,marketing_competitor_id,storage_path,source_size_bytes,created_by,updated_by) values('10000000-0000-0000-0000-000000000141','20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000141/30000000-0000-4000-8000-000000000144/source.mp4',100,'00000000-0000-0000-0000-000000000143','00000000-0000-0000-0000-000000000143') $$,'42501',null,'viewer cannot create');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000144',true);
select results_eq($$ select count(*)::integer from public.marketing_competitor_reels $$,array[0]::integer[],'other organization cannot read Reel');
select throws_ok($$ insert into public.marketing_competitor_reels(organization_id,marketing_competitor_id,storage_path,source_size_bytes,created_by,updated_by) values('10000000-0000-0000-0000-000000000142','20000000-0000-4000-8000-000000000141','10000000-0000-0000-0000-000000000142/30000000-0000-4000-8000-000000000145/source.mp4',100,'00000000-0000-0000-0000-000000000144','00000000-0000-0000-0000-000000000144') $$,'23503',null,'cross-organization competitor reference rejected');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000141',true);
select lives_ok($$ select public.enqueue_competitor_reel_analysis('10000000-0000-0000-0000-000000000141','30000000-0000-4000-8000-000000000141') $$,'analysis enqueue is atomic');
select results_eq($$ select count(*)::integer from public.jobs where job_type='marketing.competitor-reel.extract' $$,array[1]::integer[],'one external job created');
select results_eq($$ select count(*)::integer from public.marketing_competitor_reel_analyses where analysis_version=1 and job_id is not null $$,array[1]::integer[],'version one links its job');
select throws_ok($$ select public.enqueue_competitor_reel_analysis('10000000-0000-0000-0000-000000000141','30000000-0000-4000-8000-000000000141') $$,'22023',null,'duplicate active analysis rejected');
select results_eq($$ select execution_class::text from public.job_definitions where job_type='marketing.competitor-reel.extract' $$,array['EXTERNAL_WORKER'::text],'job is external worker only');
select results_eq($$ select public.has_function_privilege('authenticated','public.worker_authorize_reel_media(text,uuid)','execute') $$,array[false],'browser cannot authorize worker media');
select results_eq($$ select public.has_function_privilege('service_role','public.worker_authorize_reel_media(text,uuid)','execute') $$,array[true],'service broker may authorize worker media');
select results_eq($$ select public from storage.buckets where id='marketing-reel-media' $$,array[false],'media bucket is private');
select results_eq($$ select file_size_limit::bigint from storage.buckets where id='marketing-reel-media' $$,array[104857600::bigint],'bucket enforces 100 MiB');
select lives_ok($$ update public.marketing_competitor_reels set archived_at=now() where id='30000000-0000-4000-8000-000000000141' $$,'Reel soft archives');
select lives_ok($$ update public.marketing_competitor_reels set archived_at=null where id='30000000-0000-4000-8000-000000000141' $$,'Reel restores');
select results_eq($$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000141' $$,array[0]::integer[],'analysis enqueue creates no memory');

select * from finish();
rollback;
