begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-polish@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-polish@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-polish@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000201', 'Disposable Alpha', '00000000-0000-0000-0000-000000000201'),
  ('10000000-0000-0000-0000-000000000202', 'Protected Beta', '00000000-0000-0000-0000-000000000203');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000201', 'OWNER'),
  ('10000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', 'ADMIN'),
  ('10000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000203', 'OWNER');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'Disposable Alpha') $$,
  '42501', 'owner permission required', 'an ADMIN cannot delete the organization'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000202', 'Protected Beta') $$,
  '42501', 'owner permission required', 'an owner cannot delete another organization'
);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'disposable alpha') $$,
  '22023', 'confirmation does not match', 'confirmation is exact and case-sensitive'
);
select lives_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'Disposable Alpha') $$,
  'the OWNER can delete the confirmed organization'
);

reset role;
select results_eq(
  $$ select count(*)::integer from public.organizations where id = '10000000-0000-0000-0000-000000000201' $$,
  array[0]::integer[], 'the organization is deleted'
);
select results_eq(
  $$ select count(*)::integer from public.memberships where organization_id = '10000000-0000-0000-0000-000000000201' $$,
  array[0]::integer[], 'organization memberships cascade without orphans'
);
select results_eq(
  $$ select count(*)::integer from auth.users where id in ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202') $$,
  array[2]::integer[], 'member authentication accounts are preserved'
);

select * from finish();
rollback;
