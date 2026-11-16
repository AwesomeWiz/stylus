begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Trusted transitions use guarded RPCs; BYPASSRLS is not a direct table grant.
-- Fixture inspection must not depend on a permissive service-role bootstrap.
select ok(not pg_catalog.has_table_privilege('service_role','public.'||name,'SELECT'),
  name || ': service_role has no direct SELECT grant')
from unnest(array[
  'marketing_ask_council_turns','marketing_ask_council_conversations',
  'marketing_creative_council_runs','marketing_external_research_runs',
  'marketing_strategic_review_runs','jobs','task_reminder_deliveries','worker_registrations'
]) t(name);
set local role service_role;
select throws_ok(format('select * from public.%I limit 0',name),'42501',null,
  name || ': direct service-role inspection is denied')
from unnest(array[
  'marketing_ask_council_turns','marketing_ask_council_conversations',
  'marketing_creative_council_runs','marketing_external_research_runs',
  'marketing_strategic_review_runs','jobs','task_reminder_deliveries','worker_registrations'
]) t(name);
reset role;
select is(current_user::text,'postgres','role-scoped denial checks restore administrative fixture inspection');
-- Integrations deliberately grant their service persistence adapter direct access.
select is((select count(*)::integer from unnest(array[
  'integration_connections','integration_secrets','integration_oauth_states',
  'external_resource_links','integration_resource_cache','integration_calendar_intents'
]) t(name) where pg_catalog.has_table_privilege('service_role','public.'||name,'SELECT')),6,
  'explicit integration service SELECT grants remain available');

-- Discover tenant tables from the real catalog so newly added domains cannot
-- escape the release gate simply by being absent from a hand-maintained list.
select ok(c.relrowsecurity, c.relname || ': tenant table has RLS enabled')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and exists (
  select 1 from pg_attribute a where a.attrelid=c.oid
    and a.attname='organization_id' and not a.attisdropped
) order by c.relname;
select ok(not exists(
  select 1 from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_attribute a on a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped
  where n.nspname='public' and c.relkind='r' and not exists(
    select 1 from pg_catalog.pg_constraint k where k.contype='f' and k.conrelid=c.oid
      and k.confrelid='public.organizations'::regclass and k.conkey=array[a.attnum]::smallint[]
      and k.confdeltype='c' and k.convalidated
  )
),'every tenant table has a validated root organization lifecycle cascade');
select ok((select relrowsecurity from pg_class where oid='public.organizations'::regclass),
  'organization identities themselves retain RLS');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prosecdef
    and not coalesce(p.proconfig @> array['search_path=""'],false)),0,
  'all application security-definer functions pin an empty search path');

select is((select count(*)::integer from unnest(array[
  'integration_secrets','integration_oauth_states','integration_resource_cache',
  'integration_calendar_intents','worker_registrations','worker_pairing_requests'
]) t(name) where pg_catalog.has_table_privilege('authenticated','public.'||name,'SELECT,INSERT,UPDATE,DELETE')),0,
  'authenticated browsers have no direct credential/state/worker-table CRUD');
select is((select count(*)::integer from unnest(array[
  'integration_secrets','integration_oauth_states','integration_resource_cache',
  'integration_calendar_intents','worker_registrations','worker_pairing_requests'
]) t(name) where pg_catalog.has_table_privilege('anon','public.'||name,'SELECT,INSERT,UPDATE,DELETE')),0,
  'anonymous browsers have no direct credential/state/worker-table CRUD');
select ok(not pg_catalog.has_function_privilege('authenticated',
  'public.activate_integration(uuid,uuid,uuid,text,text,text,jsonb,text,bigint)','EXECUTE'),
  'browser cannot activate a provider connection through service RPC');

select is((select count(*)::integer from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated')) browser(role_name)
  where n.nspname='public' and c.relkind='r'
    and pg_catalog.has_table_privilege(browser.role_name,c.oid,'TRUNCATE,TRIGGER,REFERENCES')),0,
  'no browser role inherits table maintenance privileges from platform defaults');
select ok(not pg_catalog.has_table_privilege('anon','public.boards','SELECT,INSERT,UPDATE,DELETE')
  and not pg_catalog.has_table_privilege('anon','public.board_elements','SELECT,INSERT,UPDATE,DELETE'),
  'anonymous clients have no Board table privileges');
select ok(not pg_catalog.has_table_privilege('authenticated','public.boards','INSERT,UPDATE,DELETE')
  and not pg_catalog.has_table_privilege('authenticated','public.board_elements','INSERT,UPDATE,DELETE'),
  'Board writes use column grants instead of unrestricted table grants');
select ok(pg_catalog.has_column_privilege('authenticated','public.board_elements','id','INSERT')
  and pg_catalog.has_column_privilege('authenticated','public.board_elements','parent_id','UPDATE')
  and pg_catalog.has_column_privilege('authenticated','public.board_elements','locked','UPDATE'),
  'idempotent upload identities and V2 ownership/locking remain supported');
select is((select count(*)::integer from unnest(array['id','board_id','organization_id','element_type','created_by','created_at']) col(name)
  where pg_catalog.has_column_privilege('authenticated','public.board_elements',col.name,'UPDATE')),0,
  'browser cannot update Board object identity/type/creation provenance');
select ok(not pg_catalog.has_column_privilege('authenticated','public.board_elements','created_at','INSERT')
  and not pg_catalog.has_column_privilege('authenticated','public.boards','created_at','INSERT'),
  'browser cannot supply Board creation timestamps');

-- Exercise the real direct-write path used by stable-ID upload recovery after
-- tightening grants; catalog flags alone do not prove trigger/RLS compatibility.
insert into auth.users(id,email) values('fff90000-0000-4000-8000-000000000001','release-owner@example.test');
insert into public.organizations(id,name,created_by) values('fff90000-0000-4000-8000-000000000002','Release grant fixture','fff90000-0000-4000-8000-000000000001');
insert into public.memberships(organization_id,user_id,role) values('fff90000-0000-4000-8000-000000000002','fff90000-0000-4000-8000-000000000001','OWNER');
set local role authenticated;
select set_config('request.jwt.claim.sub','fff90000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.create_board_from_template('fff90000-0000-4000-8000-000000000002','Stable-ID fixture','blank','[]')$$,
  'authenticated creation RPC remains available after grant correction');
select lives_ok($$insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,parent_id,locked,created_by,updated_by)
  select 'fff90000-0000-4000-8000-000000000003','fff90000-0000-4000-8000-000000000002',id,'STICKY',10,20,200,160,'{"text":"Stable upload identity"}',null,false,'fff90000-0000-4000-8000-000000000001','fff90000-0000-4000-8000-000000000001'
  from public.boards where organization_id='fff90000-0000-4000-8000-000000000002' and title='Stable-ID fixture'$$,
  'authenticated stable-ID object insertion survives RLS and provenance triggers');
select results_eq($$update public.board_elements set x=42,updated_by='fff90000-0000-4000-8000-000000000001'
  where id='fff90000-0000-4000-8000-000000000003' returning x::integer$$,array[42]::integer[],
  'permitted direct geometry updates still work after column-only grants');
reset role;

select * from finish();
rollback;
