alter table public.board_elements
add constraint board_elements_scope_id_key unique (organization_id, board_id, id);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null,
  element_id uuid,
  parent_id uuid,
  author_id uuid not null,
  body text not null constraint board_comments_body_length
    check (char_length(btrim(body)) between 1 and 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_comments_board_fkey
    foreign key (organization_id, board_id)
    references public.boards(organization_id, id) on delete cascade,
  constraint board_comments_element_fkey
    foreign key (organization_id, board_id, element_id)
    references public.board_elements(organization_id, board_id, id) on delete restrict,
  constraint board_comments_author_fkey
    foreign key (organization_id, author_id)
    references public.memberships(organization_id, user_id) on delete restrict,
  unique (organization_id, board_id, id)
);

alter table public.board_comments
add constraint board_comments_parent_fkey
foreign key (organization_id, board_id, parent_id)
references public.board_comments(organization_id, board_id, id) on delete restrict;

create table public.board_comment_mentions (
  organization_id uuid not null,
  board_id uuid not null,
  comment_id uuid not null,
  mentioned_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id),
  constraint board_comment_mentions_comment_fkey
    foreign key (organization_id, board_id, comment_id)
    references public.board_comments(organization_id, board_id, id) on delete cascade,
  constraint board_comment_mentions_member_fkey
    foreign key (organization_id, mentioned_user_id)
    references public.memberships(organization_id, user_id) on delete cascade
);

create index board_comments_board_recent_idx
on public.board_comments(board_id, created_at, id);
create index board_comments_element_recent_idx
on public.board_comments(board_id, element_id, created_at, id)
where element_id is not null;
create index board_comments_parent_idx
on public.board_comments(parent_id, created_at, id)
where parent_id is not null;
create index board_comment_mentions_recipient_idx
on public.board_comment_mentions(organization_id, mentioned_user_id, created_at desc);

create function private.enforce_board_comment_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.board_comments%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.author_id is distinct from (select auth.uid()) then
      raise exception 'Comment author must match authenticated user'
        using errcode = '42501';
    end if;
    if new.parent_id is not null then
      select comment_record.* into v_parent
      from public.board_comments as comment_record
      where comment_record.organization_id = new.organization_id
        and comment_record.board_id = new.board_id
        and comment_record.id = new.parent_id;
      if not found or v_parent.parent_id is not null then
        raise exception 'Replies may have only one thread level'
          using errcode = '23514';
      end if;
      if v_parent.archived_at is not null then
        raise exception 'Removed comments cannot receive replies'
          using errcode = '23514';
      end if;
      if v_parent.element_id is distinct from new.element_id then
        raise exception 'Reply must use its root comment context'
          using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.board_id is distinct from old.board_id
    or new.element_id is distinct from old.element_id
    or new.parent_id is distinct from old.parent_id
    or new.author_id is distinct from old.author_id
    or new.body is distinct from old.body
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'Comment provenance and content cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.record_board_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board_title text;
begin
  select board_record.title into v_board_title
  from public.boards as board_record
  where board_record.organization_id = new.organization_id
    and board_record.id = new.board_id;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    new.organization_id,
    new.author_id,
    'BOARD_COMMENTED',
    'BOARD',
    new.board_id,
    jsonb_build_object(
      'title', v_board_title,
      'comment_id', new.id,
      'element_id', new.element_id,
      'is_reply', new.parent_id is not null
    )
  );
  return new;
end;
$$;

create trigger board_comments_enforce_scope
before insert or update on public.board_comments
for each row execute function private.enforce_board_comment_scope();
create trigger board_comments_record_activity
after insert on public.board_comments
for each row execute function private.record_board_comment_activity();

create function public.create_board_comment(
  p_board_id uuid,
  p_element_id uuid,
  p_parent_id uuid,
  p_body text,
  p_mentioned_user_ids uuid[] default '{}'::uuid[]
)
returns public.board_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_name text;
  v_board public.boards%rowtype;
  v_comment public.board_comments%rowtype;
  v_mentioned_user_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select board_record.* into v_board
  from public.boards as board_record
  where board_record.id = p_board_id and board_record.archived_at is null;
  if not found or not (select private.has_organization_role(
    v_board.organization_id,
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  )) then
    raise exception 'Board collaboration permission required' using errcode = '42501';
  end if;
  if p_element_id is not null and not exists (
    select 1 from public.board_elements as element_record
    where element_record.organization_id = v_board.organization_id
      and element_record.board_id = v_board.id
      and element_record.id = p_element_id
      and element_record.archived_at is null
  ) then
    raise exception 'Element does not belong to board' using errcode = '23503';
  end if;
  if coalesce(cardinality(p_mentioned_user_ids), 0) > 50 then
    raise exception 'Too many mentions' using errcode = '22023';
  end if;

  insert into public.board_comments (
    organization_id, board_id, element_id, parent_id, author_id, body
  ) values (
    v_board.organization_id, v_board.id, p_element_id, p_parent_id,
    v_actor_id, btrim(p_body)
  ) returning * into v_comment;

  select coalesce(
    nullif(btrim(authenticated_user.raw_user_meta_data ->> 'full_name'), ''),
    'A teammate'
  ) into v_actor_name
  from auth.users as authenticated_user
  where authenticated_user.id = v_actor_id;

  for v_mentioned_user_id in
    select distinct mention_id
    from unnest(coalesce(p_mentioned_user_ids, '{}'::uuid[])) as mention(mention_id)
    where mention_id <> v_actor_id
  loop
    if not exists (
      select 1 from public.memberships as membership
      where membership.organization_id = v_board.organization_id
        and membership.user_id = v_mentioned_user_id
    ) then
      raise exception 'Mentioned user must belong to organization'
        using errcode = '23503';
    end if;

    insert into public.board_comment_mentions (
      organization_id, board_id, comment_id, mentioned_user_id
    ) values (
      v_board.organization_id, v_board.id, v_comment.id, v_mentioned_user_id
    ) on conflict do nothing;

    insert into public.notifications (
      organization_id, recipient_id, type, title, body, entity_type, entity_id
    ) values (
      v_board.organization_id,
      v_mentioned_user_id,
      'BOARD_MENTION',
      format('%s mentioned you', v_actor_name),
      left(format('On "%s": %s', v_board.title, v_comment.body), 500),
      'BOARD',
      v_board.id
    );
  end loop;
  return v_comment;
end;
$$;

create function public.archive_board_comment(p_comment_id uuid)
returns public.board_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_comment public.board_comments%rowtype;
begin
  select comment_record.* into v_comment
  from public.board_comments as comment_record
  where comment_record.id = p_comment_id;
  if not found or v_actor_id is null or not (
    (
      v_comment.author_id = v_actor_id
      and (select private.is_organization_member(v_comment.organization_id))
    )
    or (select private.has_organization_role(
      v_comment.organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    ))
  ) then
    raise exception 'Comment removal permission required' using errcode = '42501';
  end if;

  update public.board_comments as comment_record
  set archived_at = coalesce(comment_record.archived_at, now())
  where comment_record.id = v_comment.id
  returning comment_record.* into v_comment;
  return v_comment;
end;
$$;

alter table public.board_comments enable row level security;
alter table public.board_comment_mentions enable row level security;
revoke all on table public.board_comments from anon, authenticated;
revoke all on table public.board_comment_mentions from anon, authenticated;
grant select on table public.board_comments to authenticated;
grant select on table public.board_comment_mentions to authenticated;

create policy board_comments_select_for_members on public.board_comments
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy board_comment_mentions_select_for_members
on public.board_comment_mentions
for select to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on function public.create_board_comment(uuid, uuid, uuid, text, uuid[])
from public, anon;
revoke all on function public.archive_board_comment(uuid) from public, anon;
grant execute on function public.create_board_comment(uuid, uuid, uuid, text, uuid[])
to authenticated;
grant execute on function public.archive_board_comment(uuid) to authenticated;

create policy board_presence_read_for_members
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.boards as board_record
    where ('board:' || board_record.id::text) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);
create policy board_presence_write_for_members
on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.boards as board_record
    where ('board:' || board_record.id::text) = (select realtime.topic())
      and board_record.archived_at is null
      and (select private.is_organization_member(board_record.organization_id))
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'board_elements'
  ) then
    alter publication supabase_realtime add table public.board_elements;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'board_comments'
  ) then
    alter publication supabase_realtime add table public.board_comments;
  end if;
end;
$$;
