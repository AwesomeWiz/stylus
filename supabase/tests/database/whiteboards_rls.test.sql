begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a-board@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a-board@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a-board@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b-board@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000061', 'Alpha Boards', '00000000-0000-0000-0000-000000000061'),
  ('10000000-0000-0000-0000-000000000062', 'Beta Boards', '00000000-0000-0000-0000-000000000064');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000061', 'OWNER'),
  ('10000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062', 'MEMBER'),
  ('10000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000063', 'VIEWER'),
  ('10000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000064', 'OWNER');

set local role anon;
select is_empty($$ select id from public.boards $$, 'anonymous users cannot read boards');
select is_empty($$ select id from public.board_elements $$, 'anonymous users cannot read board elements');
select is_empty($$ select name from storage.objects where bucket_id = 'board-images' $$, 'anonymous users cannot read board images');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000064', true);
select lives_ok(
  $$ insert into public.boards (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000062', 'Private Beta board', '00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000064') $$,
  'an organization B owner can create a board'
);
select lives_ok(
  $$ insert into public.board_elements (organization_id, board_id, element_type, x, y, width, height, content, style, metadata, created_by, updated_by) select '10000000-0000-0000-0000-000000000062', id, 'TEXT', 10, 10, 200, 80, '{"text":"private"}', '{}', '{}', '00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000064' from public.boards where title = 'Private Beta board' $$,
  'an organization B owner can create a board element'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('board-images', '10000000-0000-0000-0000-000000000062/private/image.png', '00000000-0000-0000-0000-000000000064') $$,
  'an organization B collaborator can create an organization-scoped image object'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000062', true);
select is_empty($$ select id from public.boards where title = 'Private Beta board' $$, 'organization A cannot read organization B boards');
select is_empty($$ select id from public.board_elements where organization_id = '10000000-0000-0000-0000-000000000062' $$, 'organization A cannot read organization B elements');
select is_empty($$ select name from storage.objects where name like '10000000-0000-0000-0000-000000000062/%' $$, 'organization A cannot read organization B board images');
select lives_ok(
  $$ insert into public.boards (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000061', 'Alpha moodboard', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000062') $$,
  'a MEMBER can create a board'
);
select results_eq(
  $$ update public.boards set title = 'Alpha brand board', updated_by = '00000000-0000-0000-0000-000000000062' where title = 'Alpha moodboard' returning title $$,
  array['Alpha brand board']::text[],
  'a MEMBER can rename a board'
);
select lives_ok(
  $$ insert into public.board_elements (organization_id, board_id, element_type, x, y, width, height, content, style, metadata, created_by, updated_by) select '10000000-0000-0000-0000-000000000061', id, 'STICKY', 10, 20, 200, 180, '{"text":"Idea"}', '{"color":"#fef3c7"}', '{}', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000062' from public.boards where title = 'Alpha brand board' $$,
  'a MEMBER can create a typed element on its organization board'
);
select results_eq(
  $$ update public.board_elements set x = 250, y = 310, updated_by = '00000000-0000-0000-0000-000000000062' where content->>'text' = 'Idea' returning x::integer || ':' || y::integer $$,
  array['250:310']::text[],
  'drag-end geometry persists its final position'
);
select throws_ok(
  $$ update public.board_elements set width = 0, updated_by = '00000000-0000-0000-0000-000000000062' where content->>'text' = 'Idea' $$,
  '23514',
  null,
  'invalid element dimensions are rejected'
);
select throws_ok(
  $$ update public.board_elements set board_id = (select id from public.boards where title = 'Alpha brand board'), updated_by = '00000000-0000-0000-0000-000000000062' where content->>'text' = 'Idea' $$,
  '42501',
  'permission denied for table board_elements',
  'clients cannot reassign an element board'
);
select throws_ok(
  $$ insert into public.boards (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000061', 'Forged creator', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062') $$,
  'P0001',
  'Board creator must be the authenticated user',
  'board creator provenance cannot be forged'
);
select results_eq(
  $$ update public.board_elements set archived_at = now(), updated_by = '00000000-0000-0000-0000-000000000062' where content->>'text' = 'Idea' returning archived_at is not null $$,
  array[true]::boolean[],
  'element removal archives history instead of deleting it'
);
select is_empty(
  $$ update public.boards set title = 'Cross-org mutation', updated_by = '00000000-0000-0000-0000-000000000062' where title = 'Private Beta board' returning id $$,
  'cross-organization board mutation is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000063', true);
select results_eq($$ select title from public.boards where title = 'Alpha brand board' $$, array['Alpha brand board']::text[], 'a VIEWER can read organization boards');
select throws_ok(
  $$ insert into public.boards (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000061', 'Viewer board', '00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000063') $$,
  '42501',
  'new row violates row-level security policy for table "boards"',
  'a VIEWER cannot create boards'
);
select is_empty(
  $$ update public.boards set title = 'Viewer mutation', updated_by = '00000000-0000-0000-0000-000000000063' where title = 'Alpha brand board' returning id $$,
  'a VIEWER cannot update boards'
);
select throws_ok(
  $$ insert into public.board_elements (organization_id, board_id, element_type, x, y, width, height, created_by, updated_by) select '10000000-0000-0000-0000-000000000061', id, 'TEXT', 0, 0, 100, 100, '00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000063' from public.boards where title = 'Alpha brand board' $$,
  '42501',
  'new row violates row-level security policy for table "board_elements"',
  'a VIEWER cannot create elements'
);

select * from finish();
rollback;
