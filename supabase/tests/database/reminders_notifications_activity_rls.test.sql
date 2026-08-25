begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a-5@example.test', '', now(), '{}', '{"full_name":"Owner A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a-5@example.test', '', now(), '{}', '{"full_name":"Member A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-a-5@example.test', '', now(), '{}', '{"full_name":"Other A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b-5@example.test', '', now(), '{}', '{"full_name":"Owner B"}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000051', 'Alpha Reminders', '00000000-0000-0000-0000-000000000051'),
  ('10000000-0000-0000-0000-000000000052', 'Beta Reminders', '00000000-0000-0000-0000-000000000054');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051', 'OWNER'),
  ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052', 'MEMBER'),
  ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000053', 'MEMBER'),
  ('10000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000054', 'OWNER');

insert into public.tasks (
  id, organization_id, title, assignee_id, due_at, status, created_by, updated_by
)
values
  ('20000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', 'Eligible task', '00000000-0000-0000-0000-000000000052', '2026-08-26 11:00:00+00', 'TODO', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000051', 'Completed task', '00000000-0000-0000-0000-000000000052', '2026-08-25 12:30:00+00', 'COMPLETED', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000053', '10000000-0000-0000-0000-000000000051', 'Cancelled task', '00000000-0000-0000-0000-000000000052', '2026-08-25 12:30:00+00', 'CANCELLED', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000054', '10000000-0000-0000-0000-000000000051', 'Unassigned task', null, '2026-08-25 12:30:00+00', 'TODO', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051');

set local role anon;
select is_empty($$ select id from public.notifications $$, 'anonymous users cannot read notifications');
select is_empty($$ select id from public.activity_events $$, 'anonymous users cannot read activity');

set local role service_role;
select lives_ok(
  $$ select public.process_task_reminders('2026-08-25 12:00:00+00') $$,
  'the reminder processor executes its eligible insert path without ambiguous identifiers'
);
select is(public.process_task_reminders('2026-08-25 12:00:00+00'), 0, 'duplicate processor execution is idempotent');
select is((select count(*)::integer from public.task_reminder_deliveries), 1, 'only an eligible task records delivery');
select is((select count(*)::integer from public.notifications), 1, 'completed, cancelled and unassigned tasks do not notify');

set local role postgres;
insert into public.tasks (
  id, organization_id, title, assignee_id, due_at, created_by, updated_by
) values (
  '20000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000051', 'Changed deadline', '00000000-0000-0000-0000-000000000052', '2026-08-27 12:00:00+00', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'
);
update public.tasks
set due_at = '2026-08-25 12:30:00+00', updated_by = '00000000-0000-0000-0000-000000000051'
where id = '20000000-0000-0000-0000-000000000055';

set local role service_role;
select is(public.process_task_reminders('2026-08-25 12:00:00+00'), 1, 'a changed deadline creates only its currently eligible version');
select is_empty(
  $$ select id from public.task_reminder_deliveries where task_id = '20000000-0000-0000-0000-000000000055' and deadline_at = '2026-08-27 12:00:00+00' $$,
  'the old deadline version is never delivered'
);
select is(
  (select count(*)::integer from public.task_reminder_deliveries where task_id = '20000000-0000-0000-0000-000000000055' and deadline_at = '2026-08-25 12:30:00+00'),
  1,
  'the new deadline version is recorded'
);

set local role postgres;
insert into public.tasks (
  id, organization_id, title, assignee_id, due_at, created_by, updated_by
)
values
  ('20000000-0000-0000-0000-000000000056', '10000000-0000-0000-0000-000000000051', 'Deadline boundary', '00000000-0000-0000-0000-000000000052', '2026-08-25 12:00:00+00', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000057', '10000000-0000-0000-0000-000000000051', 'One hour boundary', '00000000-0000-0000-0000-000000000052', '2026-08-25 13:00:00+00', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000058', '10000000-0000-0000-0000-000000000051', 'One day boundary', '00000000-0000-0000-0000-000000000052', '2026-08-26 12:00:00+00', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051');

set local role service_role;
select is(public.process_task_reminders('2026-08-25 12:00:00+00'), 3, 'exact deadline boundaries are deterministic');
select results_eq(
  $$ select reminder_kind::text from public.task_reminder_deliveries where task_id in ('20000000-0000-0000-0000-000000000056', '20000000-0000-0000-0000-000000000057', '20000000-0000-0000-0000-000000000058') order by reminder_kind::text $$,
  array['DEADLINE', 'DUE_1H', 'DUE_24H']::text[],
  'deadline, one-hour and 24-hour kinds use inclusive UTC instants'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000052', true);
select is((select count(*)::integer from public.notifications), 5, 'the recipient can read only their five notifications');
select is((select count(*)::integer from public.notifications where read_at is null), 5, 'the unread count is correct');
select ok(
  public.mark_notification_read(
    '10000000-0000-0000-0000-000000000051',
    (select id from public.notifications order by created_at, id limit 1)
  ),
  'the recipient can mark one notification read'
);
select is((select count(*)::integer from public.notifications where read_at is null), 4, 'mark one changes one unread record');
select is(public.mark_all_notifications_read('10000000-0000-0000-0000-000000000051'), 4, 'mark all changes only the remaining recipient records');
select is((select count(*)::integer from public.notifications where read_at is null), 0, 'all recipient notifications are read');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000053', true);
select is_empty($$ select id from public.notifications $$, 'another organization member cannot read private recipient notifications');
select is(
  public.mark_notification_read(
    '10000000-0000-0000-0000-000000000051',
    (select id from public.notifications where false)
  ),
  false,
  'another member cannot mark the recipient notification'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000054', true);
select is_empty($$ select id from public.notifications where organization_id = '10000000-0000-0000-0000-000000000051' $$, 'another organization cannot read notifications');
select is_empty($$ select id from public.activity_events where organization_id = '10000000-0000-0000-0000-000000000051' $$, 'another organization cannot read activity');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000052', true);
select isnt((select count(*)::integer from public.activity_events where event_type = 'TASK_CREATED'), 0, 'task creation produces activity');
update public.tasks set assignee_id = '00000000-0000-0000-0000-000000000053', updated_by = '00000000-0000-0000-0000-000000000052' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_ASSIGNED'), 1, 'assignment produces activity');
update public.tasks set status = 'COMPLETED', updated_by = '00000000-0000-0000-0000-000000000052' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_COMPLETED'), 1, 'completion produces activity');
update public.tasks set status = 'COMPLETED', updated_by = '00000000-0000-0000-0000-000000000052' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_COMPLETED'), 1, 'duplicate completion does not duplicate activity');
update public.tasks set status = 'TODO', updated_by = '00000000-0000-0000-0000-000000000052' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_REOPENED'), 1, 'reopen produces activity');
update public.tasks set status = 'CANCELLED', updated_by = '00000000-0000-0000-0000-000000000052' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_CANCELLED'), 1, 'cancellation produces activity');
insert into public.task_comments (organization_id, task_id, body, created_by) values ('10000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000051', 'Audit this comment', '00000000-0000-0000-0000-000000000052');
select is((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000051' and event_type = 'TASK_COMMENTED'), 1, 'comment creation produces activity');
select isnt((select count(*)::integer from public.activity_events where entity_id = '20000000-0000-0000-0000-000000000055' and event_type = 'TASK_UPDATED'), 0, 'task edits produce activity');
select throws_ok(
  $$ insert into public.activity_events (organization_id, actor_id, event_type, entity_id) values ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052', 'TASK_CREATED', gen_random_uuid()) $$,
  '42501',
  'permission denied for table activity_events',
  'browser roles cannot forge activity provenance'
);
select throws_ok(
  $$ insert into public.notifications (organization_id, recipient_id, type, title, body) values ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052', 'TASK_DEADLINE', 'Forged', 'Forged') $$,
  '42501',
  'permission denied for table notifications',
  'browser roles cannot forge notification recipients'
);
select throws_ok(
  $$ update public.notifications set read_at = now() $$,
  '42501',
  'permission denied for table notifications',
  'read state is changed only through scoped database functions'
);

select * from finish();
rollback;
