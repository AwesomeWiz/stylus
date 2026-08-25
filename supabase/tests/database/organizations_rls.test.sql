begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-c@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'Alpha', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Beta', '00000000-0000-0000-0000-000000000002');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'OWNER'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'OWNER');

set local role anon;
select is_empty(
  $$ select id from public.organizations $$,
  'unauthenticated users cannot read organizations'
);
select is_empty(
  $$ select organization_id from public.memberships $$,
  'unauthenticated users cannot read memberships'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select name from public.organizations order by name $$,
  array['Alpha']::text[],
  'a user reads only organizations where they have membership'
);
select results_eq(
  $$ select role::text from public.memberships $$,
  array['OWNER']::text[],
  'a user reads only their own membership rows'
);
select results_eq(
  $$ update public.organizations set name = 'Changed' where id = '10000000-0000-0000-0000-000000000002' returning name $$,
  array[]::text[],
  'a user cannot update another organization'
);
select results_eq(
  $$ update public.organizations set name = 'Alpha Updated' where id = '10000000-0000-0000-0000-000000000001' returning name $$,
  array['Alpha Updated']::text[],
  'an owner can update their organization name'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$ select public.create_organization('Gamma') $$,
  'an authenticated user can create an organization atomically'
);

reset role;
select results_eq(
  $$ select role::text from public.memberships where user_id = '00000000-0000-0000-0000-000000000003' $$,
  array['OWNER']::text[],
  'organization creation establishes the creator as OWNER'
);
select results_eq(
  $$ select count(*)::integer from public.organizations where created_by = '00000000-0000-0000-0000-000000000003' $$,
  array[1]::integer[],
  'organization creation records its creator'
);

select * from finish();
rollback;
