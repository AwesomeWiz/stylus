create type public.notification_type as enum (
  'TASK_DUE_24H', 'TASK_DUE_1H', 'TASK_DEADLINE'
);

create type public.notification_entity_type as enum ('TASK');

create type public.notification_channel as enum ('IN_APP');

create type public.task_reminder_kind as enum (
  'DUE_24H', 'DUE_1H', 'DEADLINE'
);

create type public.activity_event_type as enum (
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_ASSIGNED',
  'TASK_COMPLETED',
  'TASK_REOPENED',
  'TASK_CANCELLED',
  'TASK_COMMENTED'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null,
  type public.notification_type not null,
  title text not null constraint notifications_title_length
    check (char_length(btrim(title)) between 1 and 160),
  body text not null constraint notifications_body_length
    check (char_length(btrim(body)) between 1 and 500),
  entity_type public.notification_entity_type,
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_entity_consistency check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null)
  ),
  constraint notifications_recipient_membership_fkey
    foreign key (organization_id, recipient_id)
    references public.memberships(organization_id, user_id) on delete cascade
);

create index notifications_recipient_recent_idx
on public.notifications(organization_id, recipient_id, created_at desc);
create index notifications_recipient_unread_idx
on public.notifications(organization_id, recipient_id, created_at desc)
where read_at is null;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null,
  event_type public.activity_event_type not null,
  entity_type public.notification_entity_type not null default 'TASK',
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb
    constraint activity_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint activity_events_actor_membership_fkey
    foreign key (organization_id, actor_id)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index activity_events_organization_recent_idx
on public.activity_events(organization_id, created_at desc, id desc);
create index activity_events_entity_idx
on public.activity_events(organization_id, entity_type, entity_id, created_at desc);

create table public.task_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  recipient_id uuid not null,
  reminder_kind public.task_reminder_kind not null,
  channel public.notification_channel not null default 'IN_APP',
  deadline_at timestamptz not null,
  notification_id uuid unique references public.notifications(id) on delete restrict,
  processed_at timestamptz not null default now(),
  constraint task_reminder_deliveries_task_fkey
    foreign key (organization_id, task_id)
    references public.tasks(organization_id, id) on delete cascade,
  constraint task_reminder_deliveries_recipient_fkey
    foreign key (organization_id, recipient_id)
    references public.memberships(organization_id, user_id) on delete cascade,
  constraint task_reminder_deliveries_dedupe
    unique (task_id, recipient_id, reminder_kind, deadline_at, channel)
);

create index task_reminder_deliveries_task_idx
on public.task_reminder_deliveries(organization_id, task_id, deadline_at desc);

comment on table public.notifications is
  'Private in-app messages visible only to their authenticated recipient.';
comment on table public.activity_events is
  'Immutable organization audit history produced by trusted database triggers.';
comment on table public.task_reminder_deliveries is
  'Idempotency ledger versioned by task deadline for in-app deadline reminders.';

create function private.record_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_type public.activity_event_type;
  title_metadata jsonb;
begin
  title_metadata := jsonb_build_object('title', new.title);

  if tg_op = 'INSERT' then
    insert into public.activity_events (
      organization_id, actor_id, event_type, entity_id, metadata
    ) values (
      new.organization_id, new.created_by, 'TASK_CREATED', new.id, title_metadata
    );
    return new;
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into public.activity_events (
      organization_id, actor_id, event_type, entity_id, metadata
    ) values (
      new.organization_id,
      new.updated_by,
      'TASK_ASSIGNED',
      new.id,
      title_metadata || jsonb_build_object(
        'from_assignee_id', old.assignee_id,
        'to_assignee_id', new.assignee_id
      )
    );
  end if;

  if new.status is distinct from old.status then
    activity_type := case
      when new.status = 'COMPLETED' then 'TASK_COMPLETED'
      when new.status = 'CANCELLED' then 'TASK_CANCELLED'
      when old.status = 'COMPLETED' then 'TASK_REOPENED'
      else 'TASK_UPDATED'
    end;
    if activity_type <> 'TASK_UPDATED' then
      insert into public.activity_events (
        organization_id, actor_id, event_type, entity_id, metadata
      ) values (
        new.organization_id,
        new.updated_by,
        activity_type,
        new.id,
        title_metadata || jsonb_build_object(
          'from_status', old.status,
          'to_status', new.status
        )
      );
    end if;
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.scheduled_at is distinct from old.scheduled_at
    or new.due_at is distinct from old.due_at
    or (new.status is distinct from old.status and activity_type = 'TASK_UPDATED')
  then
    insert into public.activity_events (
      organization_id, actor_id, event_type, entity_id, metadata
    ) values (
      new.organization_id, new.updated_by, 'TASK_UPDATED', new.id, title_metadata
    );
  end if;

  return new;
end;
$$;

create function private.record_task_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_title text;
begin
  select title into task_title
  from public.tasks
  where organization_id = new.organization_id and id = new.task_id;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_id, metadata
  ) values (
    new.organization_id,
    new.created_by,
    'TASK_COMMENTED',
    new.task_id,
    jsonb_build_object('title', task_title)
  );
  return new;
end;
$$;

create trigger tasks_record_activity
after insert or update on public.tasks
for each row execute function private.record_task_activity();

create trigger task_comments_record_activity
after insert on public.task_comments
for each row execute function private.record_task_comment_activity();

create function public.process_task_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  delivery_id uuid;
  created_notification_id uuid;
  reminder_kind public.task_reminder_kind;
  notification_type public.notification_type;
  notification_title text;
  notification_body text;
  processed_count integer := 0;
begin
  for candidate in
    select task.id, task.organization_id, task.assignee_id, task.due_at, task.title
    from public.tasks as task
    join public.memberships as membership
      on membership.organization_id = task.organization_id
      and membership.user_id = task.assignee_id
    where task.assignee_id is not null
      and task.due_at is not null
      and task.status in ('TODO', 'IN_PROGRESS')
      and task.due_at <= p_now + interval '24 hours'
  loop
    if candidate.due_at <= p_now then
      reminder_kind := 'DEADLINE';
      notification_type := 'TASK_DEADLINE';
      notification_title := 'Task deadline reached';
      notification_body := format('“%s” is due now.', candidate.title);
    elsif candidate.due_at <= p_now + interval '1 hour' then
      reminder_kind := 'DUE_1H';
      notification_type := 'TASK_DUE_1H';
      notification_title := 'Task due within an hour';
      notification_body := format('“%s” is due in about one hour.', candidate.title);
    else
      reminder_kind := 'DUE_24H';
      notification_type := 'TASK_DUE_24H';
      notification_title := 'Task due within 24 hours';
      notification_body := format('“%s” is due in about 24 hours.', candidate.title);
    end if;

    delivery_id := null;
    insert into public.task_reminder_deliveries (
      organization_id, task_id, recipient_id, reminder_kind, deadline_at, processed_at
    ) values (
      candidate.organization_id,
      candidate.id,
      candidate.assignee_id,
      reminder_kind,
      candidate.due_at,
      p_now
    )
    on conflict (task_id, recipient_id, reminder_kind, deadline_at, channel)
    do nothing
    returning id into delivery_id;

    if delivery_id is not null then
      insert into public.notifications (
        organization_id, recipient_id, type, title, body, entity_type, entity_id,
        created_at
      ) values (
        candidate.organization_id,
        candidate.assignee_id,
        notification_type,
        notification_title,
        notification_body,
        'TASK',
        candidate.id,
        p_now
      ) returning id into created_notification_id;

      update public.task_reminder_deliveries
      set notification_id = created_notification_id
      where id = delivery_id;
      processed_count := processed_count + 1;
    end if;
  end loop;

  return processed_count;
end;
$$;

create function public.mark_notification_read(
  p_organization_id uuid,
  p_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization membership required' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and organization_id = p_organization_id
    and recipient_id = (select auth.uid());
  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create function public.mark_all_notifications_read(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization membership required' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = now()
  where organization_id = p_organization_id
    and recipient_id = (select auth.uid())
    and read_at is null;
  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

alter table public.notifications enable row level security;
alter table public.activity_events enable row level security;
alter table public.task_reminder_deliveries enable row level security;

revoke all on table public.notifications from anon, authenticated;
revoke all on table public.activity_events from anon, authenticated;
revoke all on table public.task_reminder_deliveries from anon, authenticated;
grant select on table public.notifications to authenticated;
grant select on table public.activity_events to authenticated;

revoke all on function public.process_task_reminders(timestamptz)
from public, anon, authenticated;
grant execute on function public.process_task_reminders(timestamptz)
to service_role;
revoke all on function public.mark_notification_read(uuid, uuid)
from public, anon;
revoke all on function public.mark_all_notifications_read(uuid)
from public, anon;
grant execute on function public.mark_notification_read(uuid, uuid)
to authenticated;
grant execute on function public.mark_all_notifications_read(uuid)
to authenticated;

create policy notifications_select_for_recipient
on public.notifications
for select
to authenticated
using (
  recipient_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create policy activity_events_select_for_members
on public.activity_events
for select
to authenticated
using ((select private.is_organization_member(organization_id)));
