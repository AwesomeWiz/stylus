create type public.task_status as enum (
  'TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null constraint tasks_title_length
    check (char_length(btrim(title)) between 1 and 200),
  description text constraint tasks_description_length
    check (description is null or char_length(description) <= 5000),
  status public.task_status not null default 'TODO',
  priority public.task_priority not null default 'MEDIUM',
  assignee_id uuid,
  created_by uuid not null,
  updated_by uuid not null,
  scheduled_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_schedule_before_due
    check (scheduled_at is null or due_at is null or scheduled_at <= due_at),
  constraint tasks_completion_consistency
    check ((status = 'COMPLETED') = (completed_at is not null)),
  constraint tasks_organization_id_id_key unique (organization_id, id),
  constraint tasks_assignee_membership_fkey
    foreign key (organization_id, assignee_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint tasks_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint tasks_updater_membership_fkey
    foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index tasks_organization_status_idx
on public.tasks(organization_id, status, created_at desc);
create index tasks_organization_assignee_idx
on public.tasks(organization_id, assignee_id, status);
create index tasks_organization_due_idx
on public.tasks(organization_id, due_at) where due_at is not null;
create index tasks_recent_completion_idx
on public.tasks(organization_id, completed_at desc) where status = 'COMPLETED';

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  body text not null constraint task_comments_body_length
    check (char_length(btrim(body)) between 1 and 2000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint task_comments_task_fkey
    foreign key (organization_id, task_id)
    references public.tasks(organization_id, id) on delete cascade,
  constraint task_comments_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index task_comments_organization_task_idx
on public.task_comments(organization_id, task_id, created_at);

comment on table public.tasks is
  'Organization-scoped operational commitments. Completed history is retained permanently.';
comment on table public.task_comments is
  'Lightweight collaboration context attached to an organization-scoped task.';

create function private.enforce_task_scope_and_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'Task organization cannot be reassigned' using errcode = '42501';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'Task creator cannot be reassigned' using errcode = '42501';
    end if;
  end if;

  if authenticated_user_id is not null then
    if tg_op = 'INSERT' and new.created_by is distinct from authenticated_user_id then
      raise exception 'Task creator must match authenticated user' using errcode = '42501';
    end if;
    if new.updated_by is distinct from authenticated_user_id then
      raise exception 'Task updater must match authenticated user' using errcode = '42501';
    end if;
  end if;

  if new.status = 'COMPLETED' then
    if tg_op = 'INSERT' or old.status <> 'COMPLETED' then
      new.completed_at = now();
    else
      new.completed_at = old.completed_at;
    end if;
  else
    new.completed_at = null;
  end if;

  return new;
end;
$$;

create function private.enforce_task_comment_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := (select auth.uid());
begin
  if authenticated_user_id is not null
    and new.created_by is distinct from authenticated_user_id then
    raise exception 'Comment creator must match authenticated user'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tasks_enforce_scope_and_lifecycle
before insert or update on public.tasks
for each row execute function private.enforce_task_scope_and_lifecycle();
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();
create trigger task_comments_enforce_scope
before insert on public.task_comments
for each row execute function private.enforce_task_comment_scope();

create function public.list_organization_task_members(p_organization_id uuid)
returns table (
  member_user_id uuid,
  display_name text,
  role public.organization_role
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization membership required' using errcode = '42501';
  end if;

  return query
  select
    membership.user_id,
    coalesce(
      nullif(btrim(authenticated_user.raw_user_meta_data ->> 'full_name'), ''),
      'Teammate'
    ),
    membership.role
  from public.memberships as membership
  join auth.users as authenticated_user on authenticated_user.id = membership.user_id
  where membership.organization_id = p_organization_id
  order by
    case membership.role
      when 'OWNER' then 1
      when 'ADMIN' then 2
      when 'MEMBER' then 3
      else 4
    end,
    2,
    membership.user_id;
end;
$$;

alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_comments from anon, authenticated;
grant select on table public.tasks to authenticated;
grant insert (
  organization_id, title, description, status, priority, assignee_id,
  created_by, updated_by, scheduled_at, due_at
) on table public.tasks to authenticated;
grant update (
  title, description, status, priority, assignee_id, updated_by,
  scheduled_at, due_at
) on table public.tasks to authenticated;
grant select on table public.task_comments to authenticated;
grant insert (organization_id, task_id, body, created_by)
on table public.task_comments to authenticated;

revoke all on function public.list_organization_task_members(uuid)
from public, anon;
grant execute on function public.list_organization_task_members(uuid)
to authenticated;

create policy tasks_select_for_members
on public.tasks
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy tasks_insert_for_collaborators
on public.tasks
for insert
to authenticated
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

create policy tasks_update_for_collaborators
on public.tasks
for update
to authenticated
using ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)))
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

create policy task_comments_select_for_members
on public.task_comments
for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy task_comments_insert_for_collaborators
on public.task_comments
for insert
to authenticated
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));
