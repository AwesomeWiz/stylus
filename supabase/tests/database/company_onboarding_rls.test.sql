begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a-onboarding@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a-onboarding@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a-onboarding@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a-onboarding@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b-onboarding@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000011', 'Onboarding Alpha', '00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000012', 'Onboarding Beta', '00000000-0000-0000-0000-000000000015');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'OWNER'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'ADMIN'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000013', 'MEMBER'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000014', 'VIEWER'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000015', 'OWNER');

insert into public.company_profiles (
  organization_id, company_name, short_description, industry, stage, created_by, updated_by
)
values (
  '10000000-0000-0000-0000-000000000012', 'Beta Company',
  'A sufficiently clear company description.', 'Software', 'IDEA',
  '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000015'
);

set local role anon;
select is_empty($$ select organization_id from public.company_profiles $$, 'anonymous users cannot read company profiles');
select is_empty($$ select organization_id from public.competitors $$, 'anonymous users cannot read competitors');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.company_profiles (organization_id, company_name, short_description, industry, stage, created_by, updated_by) values ('10000000-0000-0000-0000-000000000011', 'Alpha Company', 'A sufficiently clear company description.', 'Software', 'PRE_PRODUCT', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011') $$,
  'an owner can create company data'
);
select lives_ok(
  $$ insert into public.audience_profiles (organization_id, name, description, is_primary, created_by, updated_by) values ('10000000-0000-0000-0000-000000000011', 'Primary audience', 'A sufficiently useful audience description.', true, '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011') $$,
  'an owner can create an audience profile'
);
select lives_ok(
  $$ insert into public.competitors (organization_id, name, type, created_by, updated_by) values ('10000000-0000-0000-0000-000000000011', 'Known competitor', 'DIRECT', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011') $$,
  'an owner can create a competitor'
);
select is_empty(
  $$ select company_name from public.company_profiles where organization_id = '10000000-0000-0000-0000-000000000012' $$,
  'organization A cannot read organization B company data'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select results_eq(
  $$ update public.company_profiles set short_description = 'An administrator updated this description.', updated_by = '00000000-0000-0000-0000-000000000012' where organization_id = '10000000-0000-0000-0000-000000000011' returning company_name $$,
  array['Alpha Company']::text[],
  'an administrator can update company data'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select is_empty(
  $$ update public.company_profiles set short_description = 'A member should not update this description.' where organization_id = '10000000-0000-0000-0000-000000000011' returning company_name $$,
  'a member cannot update company data'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', true);
select is_empty(
  $$ update public.company_profiles set short_description = 'A viewer should not update this description.' where organization_id = '10000000-0000-0000-0000-000000000011' returning company_name $$,
  'a viewer cannot update company data'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000015', true);
select results_eq(
  $$ select company_name from public.company_profiles order by company_name $$,
  array['Beta Company']::text[],
  'organization B reads only its own company profile'
);
select is_empty(
  $$ select name from public.competitors $$,
  'competitor records are organization scoped'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select lives_ok(
  $$ insert into public.onboarding_progress (organization_id, current_step, started_by, updated_by) values ('10000000-0000-0000-0000-000000000011', 2, '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011') $$,
  'an owner can persist onboarding progress'
);
select results_eq(
  $$ update public.onboarding_progress set current_step = 5 where organization_id = '10000000-0000-0000-0000-000000000011' returning current_step::integer $$,
  array[5]::integer[],
  'saved onboarding progress can advance'
);

reset role;
select throws_ok(
  $$ update public.competitors set organization_id = '10000000-0000-0000-0000-000000000012' where organization_id = '10000000-0000-0000-0000-000000000011' $$,
  '42501',
  'Organization ownership cannot be reassigned',
  'organization ownership cannot be switched during update'
);

select * from finish();
rollback;
