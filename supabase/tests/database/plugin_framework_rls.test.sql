begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000084','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000085','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-b@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000081','Plugin Org A','00000000-0000-0000-0000-000000000081'),
('10000000-0000-0000-0000-000000000082','Plugin Org B','00000000-0000-0000-0000-000000000085');
insert into public.memberships (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','OWNER'),
('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000082','ADMIN'),
('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000083','MEMBER'),
('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000084','VIEWER'),
('10000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000085','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','example',true) $$,
  'OWNER can enable a plugin'
);
select results_eq(
  $$ select enabled from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  array[true],
  'enablement is persisted'
);
select results_eq(
  $$ select updated_by from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  array['00000000-0000-0000-0000-000000000081'::uuid],
  'actor provenance is database-derived'
);
select ok(
  (select enabled_at is not null from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example'),
  'enable timestamp is recorded'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000082',true);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','example',false) $$,
  'ADMIN can disable a plugin'
);
select results_eq(
  $$ select enabled from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  array[false],
  'disablement is persisted'
);
select ok(
  (select disabled_at is not null from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example'),
  'disable timestamp is recorded'
);
select results_eq(
  $$ select count(*)::integer from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  array[1]::integer[],
  'disablement preserves the persistent row'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000083',true);
select throws_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','example',true) $$,
  '42501',
  'Organization plugin management permission required',
  'MEMBER cannot enable plugins'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000084',true);
select throws_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','example',true) $$,
  '42501',
  'Organization plugin management permission required',
  'VIEWER cannot enable plugins'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
select throws_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000082','example',true) $$,
  '42501',
  'Organization plugin management permission required',
  'manager cannot mutate another organization'
);
select throws_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','../unsafe',true) $$,
  '22023',
  'Plugin ID is invalid',
  'unsafe plugin IDs are rejected'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000083',true);
select results_eq(
  $$ select count(*)::integer from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' $$,
  array[1]::integer[],
  'MEMBER can read plugin state in its organization'
);
select results_eq(
  $$ select count(*)::integer from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000082' $$,
  array[0]::integer[],
  'cross-organization plugin state is hidden'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000084',true);
select results_eq(
  $$ select count(*)::integer from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' $$,
  array[1]::integer[],
  'VIEWER can read plugin state in its organization'
);
select throws_ok(
  $$ insert into public.organization_plugins (organization_id,plugin_id,enabled,disabled_at,updated_by) values ('10000000-0000-0000-0000-000000000081','forged',false,now(),'00000000-0000-0000-0000-000000000084') $$,
  '42501',
  null,
  'browser roles cannot directly insert plugin state'
);
select throws_ok(
  $$ update public.organization_plugins set enabled=true where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  '42501',
  null,
  'browser roles cannot directly update plugin state'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000082',true);
select lives_ok(
  $$ select public.set_organization_plugin_enabled('10000000-0000-0000-0000-000000000081','example',true) $$,
  'ADMIN can re-enable without recreating state'
);
select results_eq(
  $$ select enabled_by from public.organization_plugins where organization_id='10000000-0000-0000-0000-000000000081' and plugin_id='example' $$,
  array['00000000-0000-0000-0000-000000000082'::uuid],
  'latest enabling actor is retained'
);

select * from finish();
rollback;
