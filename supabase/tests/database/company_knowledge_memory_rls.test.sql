begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-memory@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-memory@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-memory@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-memory@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000101','Memory Org A','00000000-0000-0000-0000-000000000101'),
('10000000-0000-0000-0000-000000000102','Memory Org B','00000000-0000-0000-0000-000000000104');
insert into public.memberships (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101','OWNER'),
('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000102','MEMBER'),
('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000103','VIEWER'),
('10000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000104','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);

select lives_ok(
  $$ select public.create_company_memory('10000000-0000-0000-0000-000000000101','FACT','Validated market','Teams need shared context','Interview 12',null) $$,
  'OWNER can create company memory'
);
select results_eq(
  $$ select domain::text || ':' || provenance::text from public.knowledge_memories where title='Validated market' $$,
  array['company:HUMAN'],
  'company and human provenance are database-controlled'
);
select results_eq(
  $$ select created_by from public.knowledge_memories where title='Validated market' $$,
  array['00000000-0000-0000-0000-000000000101'::uuid],
  'creator provenance is derived from auth.uid'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select lives_ok(
  $$ select public.create_company_memory('10000000-0000-0000-0000-000000000101','DECISION','Weekly review','Use a weekly planning review',null,null) $$,
  'MEMBER can create ordinary company memory'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
select throws_ok(
  $$ select public.create_company_memory('10000000-0000-0000-0000-000000000101','NOTE','Viewer note','This must be rejected',null,null) $$,
  '42501', 'Company memory mutation permission required',
  'VIEWER cannot create memory'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select throws_ok(
  $$ select public.create_company_memory('10000000-0000-0000-0000-000000000102','NOTE','Other org','This must be rejected',null,null) $$,
  '42501', 'Company memory mutation permission required',
  'cross-organization mutation is denied'
);
select throws_ok(
  $$ insert into public.knowledge_memories (organization_id,domain,kind,title,content,provenance,plugin_id,created_by,updated_by) values ('10000000-0000-0000-0000-000000000101','agency','NOTE','Forged','Forged plugin memory','PLUGIN','web-agency','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101') $$,
  '42501', null,
  'browser clients cannot forge plugin provenance'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select results_eq(
  $$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000101' $$,
  array[2]::integer[],
  'MEMBER can read company memory in its organization'
);
select results_eq(
  $$ select count(*)::integer from public.knowledge_memories where organization_id='10000000-0000-0000-0000-000000000102' $$,
  array[0]::integer[],
  'cross-organization memory is hidden'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select lives_ok(
  $$ select public.set_company_memory_archived('10000000-0000-0000-0000-000000000101',(select id from public.knowledge_memories where title='Validated market'),true) $$,
  'collaborator can archive human company memory'
);
select results_eq(
  $$ select count(*)::integer from public.search_company_memories('10000000-0000-0000-0000-000000000101',null,null,null,false,25) where title='Validated market' $$,
  array[0]::integer[],
  'archived memory is excluded by default'
);
select results_eq(
  $$ select count(*)::integer from public.search_company_memories('10000000-0000-0000-0000-000000000101',null,null,null,true,25) where title='Validated market' $$,
  array[1]::integer[],
  'archived view includes archived memory'
);
select lives_ok(
  $$ select public.set_company_memory_archived('10000000-0000-0000-0000-000000000101',(select id from public.knowledge_memories where title='Validated market'),false) $$,
  'archived memory can be restored'
);
select lives_ok(
  $$ select public.update_company_memory('10000000-0000-0000-0000-000000000101',(select id from public.knowledge_memories where title='Validated market'),'INSIGHT','Validated market insight','Updated approved content','Interview 12',null) $$,
  'active human company memory can be updated'
);
select results_eq(
  $$ select title from public.search_company_memories('10000000-0000-0000-0000-000000000101','approved',array['INSIGHT']::public.memory_kind[],array['HUMAN']::public.memory_provenance[],false,25) $$,
  array['Validated market insight'],
  'bounded text, kind and provenance filtering works'
);

reset role;
insert into public.knowledge_memories (
  organization_id, domain, kind, title, content, provenance, plugin_id
) values (
  '10000000-0000-0000-0000-000000000101','marketing','INSIGHT',
  'Private marketing signal','Plugin-private context','PLUGIN','marketing'
);
insert into public.knowledge_memories (
  organization_id, domain, kind, title, content, provenance, created_by, updated_by
)
select
  '10000000-0000-0000-0000-000000000101','company','NOTE',
  'Bounded ' || value, 'Bounded retrieval row', 'HUMAN',
  '00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101'
from generate_series(1,55) as value;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select results_eq(
  $$ select count(*)::integer from public.knowledge_memories where title='Private marketing signal' $$,
  array[0]::integer[],
  'generic Core reads cannot expose plugin-private domains'
);
select results_eq(
  $$ select count(*)::integer from public.search_company_memories('10000000-0000-0000-0000-000000000101',null,null,null,false,5000) $$,
  array[50]::integer[],
  'retrieval enforces the hard fifty-row limit'
);

reset role;
update public.memberships set removed_at=now()
where organization_id='10000000-0000-0000-0000-000000000101'
and user_id='00000000-0000-0000-0000-000000000102';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select results_eq(
  $$ select count(*)::integer from public.knowledge_memories $$,
  array[0]::integer[],
  'removed members lose memory read access'
);
select throws_ok(
  $$ select * from public.search_company_memories('10000000-0000-0000-0000-000000000101',null,null,null,false,25) $$,
  '42501', 'Organization membership required',
  'removed members cannot use retrieval RPC'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select results_eq(
  $$ select count(*)::integer from public.activity_events where entity_type='KNOWLEDGE' $$,
  array[5]::integer[],
  'memory lifecycle mutations create meaningful activity'
);
select results_eq(
  $$ select count(*)::integer from public.activity_events where entity_type='KNOWLEDGE' and metadata ? 'content' $$,
  array[0]::integer[],
  'activity metadata does not copy memory content'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok(
  $$ select * from public.knowledge_memories $$,
  '42501', null,
  'anonymous users cannot read memory'
);
select throws_ok(
  $$ select public.create_company_memory('10000000-0000-0000-0000-000000000101','NOTE','Anonymous','Rejected',null,null) $$,
  '42501', null,
  'anonymous users cannot call memory mutation RPCs'
);

select * from finish();
rollback;
