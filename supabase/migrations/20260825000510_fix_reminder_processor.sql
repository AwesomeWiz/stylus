create or replace function public.process_task_reminders(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  v_delivery_id uuid;
  v_created_notification_id uuid;
  v_reminder_kind public.task_reminder_kind;
  v_notification_type public.notification_type;
  v_notification_title text;
  v_notification_body text;
  v_processed_count integer := 0;
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
      v_reminder_kind := 'DEADLINE';
      v_notification_type := 'TASK_DEADLINE';
      v_notification_title := 'Task deadline reached';
      v_notification_body := format('“%s” is due now.', candidate.title);
    elsif candidate.due_at <= p_now + interval '1 hour' then
      v_reminder_kind := 'DUE_1H';
      v_notification_type := 'TASK_DUE_1H';
      v_notification_title := 'Task due within an hour';
      v_notification_body := format(
        '“%s” is due in about one hour.',
        candidate.title
      );
    else
      v_reminder_kind := 'DUE_24H';
      v_notification_type := 'TASK_DUE_24H';
      v_notification_title := 'Task due within 24 hours';
      v_notification_body := format(
        '“%s” is due in about 24 hours.',
        candidate.title
      );
    end if;

    v_delivery_id := null;
    insert into public.task_reminder_deliveries as reminder_delivery (
      organization_id,
      task_id,
      recipient_id,
      reminder_kind,
      deadline_at,
      processed_at
    ) values (
      candidate.organization_id,
      candidate.id,
      candidate.assignee_id,
      v_reminder_kind,
      candidate.due_at,
      p_now
    )
    on conflict (task_id, recipient_id, reminder_kind, deadline_at, channel)
    do nothing
    returning reminder_delivery.id into v_delivery_id;

    if v_delivery_id is not null then
      insert into public.notifications as notification_record (
        organization_id,
        recipient_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        created_at
      ) values (
        candidate.organization_id,
        candidate.assignee_id,
        v_notification_type,
        v_notification_title,
        v_notification_body,
        'TASK',
        candidate.id,
        p_now
      )
      returning notification_record.id into v_created_notification_id;

      update public.task_reminder_deliveries as reminder_delivery
      set notification_id = v_created_notification_id
      where reminder_delivery.id = v_delivery_id;
      v_processed_count := v_processed_count + 1;
    end if;
  end loop;

  return v_processed_count;
end;
$$;

revoke all on function public.process_task_reminders(timestamptz)
from public, anon, authenticated;
grant execute on function public.process_task_reminders(timestamptz)
to service_role;
