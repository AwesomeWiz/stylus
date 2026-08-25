begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{}', '{"full_name":"Owner A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a@example.test', '', now(), '{}', '{"full_name":"Member A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a@example.test', '', now(), '{}', '{"full_name":"Viewer A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.test', '', now(), '{}', '{"full_name":"Owner B"}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000021', 'Alpha Tasks', '00000000-0000-0000-0000-000000000021'),
  ('10000000-0000-0000-0000-000000000022', 'Beta Tasks', '00000000-0000-0000-0000-000000000024');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', 'OWNER'),
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022', 'MEMBER'),
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000023', 'VIEWER'),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000024', 'OWNER');

set local role anon;
select is_empty($$ select id from public.tasks $$, 'anonymous users cannot read tasks');
select is_empty($$ select id from public.task_comments $$, 'anonymous users cannot read task comments');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000024', true);
select lives_ok(
  $$ insert into public.tasks (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000022', 'Private Beta task', '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000024') $$,
  'an organization B owner can create its task'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', true);
select is_empty(
  $$ select id from public.tasks where organization_id = '10000000-0000-0000-0000-000000000022' $$,
  'organization A cannot read organization B tasks'
);
select lives_ok(
  $$ insert into public.tasks (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000021', 'Unassigned Alpha task', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022') $$,
  'a MEMBER can create an unassigned task'
);
select results_eq(
  $$ select status::text || ':' || priority::text from public.tasks where title = 'Unassigned Alpha task' $$,
  array['TODO:MEDIUM']::text[],
  'new task defaults are TODO and MEDIUM'
);
select lives_ok(
  $$ insert into public.tasks (organization_id, title, assignee_id, created_by, updated_by) values ('10000000-0000-0000-0000-000000000021', 'Assigned Alpha task', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022') $$,
  'a task can be assigned to another member of the same organization'
);
select throws_ok(
  $$ insert into public.tasks (organization_id, title, assignee_id, created_by, updated_by) values ('10000000-0000-0000-0000-000000000021', 'Invalid assignment', '00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022') $$,
  '23503',
  'insert or update on table "tasks" violates foreign key constraint "tasks_assignee_membership_fkey"',
  'an assignee from another organization is rejected'
);
select results_eq(
  $$ update public.tasks set status = 'COMPLETED', updated_by = '00000000-0000-0000-0000-000000000022' where title = 'Unassigned Alpha task' returning completed_at is not null $$,
  array[true]::boolean[],
  'completion records completed_at in the database'
);
create temporary table first_completion as
select completed_at from public.tasks where title = 'Unassigned Alpha task';
select results_eq(
  $$ update public.tasks set status = 'COMPLETED', updated_by = '00000000-0000-0000-0000-000000000022' where title = 'Unassigned Alpha task' returning completed_at = (select completed_at from first_completion) $$,
  array[true]::boolean[],
  'duplicate completion preserves the original completed_at'
);
select results_eq(
  $$ update public.tasks set status = 'TODO', updated_by = '00000000-0000-0000-0000-000000000022' where title = 'Unassigned Alpha task' returning completed_at is null $$,
  array[true]::boolean[],
  'reopening clears completed_at'
);
select lives_ok(
  $$ insert into public.task_comments (organization_id, task_id, body, created_by) select '10000000-0000-0000-0000-000000000021', id, 'Useful team context', '00000000-0000-0000-0000-000000000022' from public.tasks where title = 'Unassigned Alpha task' $$,
  'a MEMBER can comment on an organization task'
);
select is_empty(
  $$ update public.tasks set title = 'Cross-organization change', updated_by = '00000000-0000-0000-0000-000000000022' where title = 'Private Beta task' returning id $$,
  'organization A cannot mutate organization B tasks'
);
select throws_ok(
  $$ update public.tasks set created_by = '00000000-0000-0000-0000-000000000021', updated_by = '00000000-0000-0000-0000-000000000022' where title = 'Unassigned Alpha task' $$,
  '42501',
  'permission denied for table tasks',
  'task creator provenance cannot be reassigned'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000023', true);
select throws_ok(
  $$ insert into public.tasks (organization_id, title, created_by, updated_by) values ('10000000-0000-0000-0000-000000000021', 'Viewer write', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000023') $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'a VIEWER cannot create tasks'
);
select is_empty(
  $$ update public.tasks set title = 'Viewer change', updated_by = '00000000-0000-0000-0000-000000000023' where title = 'Unassigned Alpha task' returning id $$,
  'a VIEWER cannot update or complete tasks'
);
select throws_ok(
  $$ insert into public.task_comments (organization_id, task_id, body, created_by) select '10000000-0000-0000-0000-000000000021', id, 'Viewer comment', '00000000-0000-0000-0000-000000000023' from public.tasks where title = 'Unassigned Alpha task' $$,
  '42501',
  'new row violates row-level security policy for table "task_comments"',
  'a VIEWER cannot add comments'
);
select results_eq(
  $$ select display_name from public.list_organization_task_members('10000000-0000-0000-0000-000000000021') order by display_name $$,
  array['Member A', 'Owner A', 'Viewer A']::text[],
  'the member selector returns only useful same-organization identities'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000024', true);
select throws_ok(
  $$ select * from public.list_organization_task_members('10000000-0000-0000-0000-000000000021') $$,
  '42501',
  'Organization membership required',
  'a user cannot enumerate another organization member directory'
);

select * from finish();
rollback;
