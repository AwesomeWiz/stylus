create type public.board_element_type as enum ('TEXT', 'STICKY', 'IMAGE', 'SHAPE', 'ARROW');

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  created_by uuid not null,
  updated_by uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_title_valid check (char_length(btrim(title)) between 1 and 120),
  constraint boards_creator_membership_fkey foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id),
  constraint boards_updater_membership_fkey foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id),
  unique (organization_id, id)
);

create table public.board_elements (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null,
  organization_id uuid not null,
  element_type public.board_element_type not null,
  x double precision not null,
  y double precision not null,
  width double precision not null,
  height double precision not null,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  updated_by uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_elements_board_fkey foreign key (organization_id, board_id)
    references public.boards(organization_id, id) on delete cascade,
  constraint board_elements_creator_membership_fkey foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id),
  constraint board_elements_updater_membership_fkey foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id),
  constraint board_elements_position_finite check (
    x between -1000000 and 1000000 and y between -1000000 and 1000000
  ),
  constraint board_elements_dimensions_valid check (
    width between 24 and 10000 and height between 24 and 10000
  ),
  constraint board_elements_rotation_valid check (rotation between -360 and 360),
  constraint board_elements_z_index_valid check (z_index between -1000000 and 1000000),
  constraint board_elements_content_object check (jsonb_typeof(content) = 'object'),
  constraint board_elements_style_object check (jsonb_typeof(style) = 'object'),
  constraint board_elements_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index boards_organization_updated_idx
on public.boards(organization_id, updated_at desc)
where archived_at is null;

create index board_elements_board_order_idx
on public.board_elements(board_id, z_index, created_at)
where archived_at is null;

create index board_elements_organization_idx
on public.board_elements(organization_id, board_id)
where archived_at is null;

create function private.protect_board_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.created_by <> (select auth.uid()) then
    raise exception 'Board creator must be the authenticated user';
  end if;
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id
      or new.id <> old.id
      or new.created_by <> old.created_by
      or new.created_at <> old.created_at then
      raise exception 'Board provenance cannot be changed';
    end if;
  end if;

  if new.updated_by <> (select auth.uid()) then
    raise exception 'Board updater must be the authenticated user';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.protect_board_element_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.created_by <> (select auth.uid()) then
    raise exception 'Board element creator must be the authenticated user';
  end if;
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id
      or new.board_id <> old.board_id
      or new.id <> old.id
      or new.created_by <> old.created_by
      or new.created_at <> old.created_at then
      raise exception 'Board element provenance cannot be changed';
    end if;
  end if;

  if new.updated_by <> (select auth.uid()) then
    raise exception 'Board element updater must be the authenticated user';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.touch_board_from_element()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.boards
  set updated_at = now(), updated_by = new.updated_by
  where id = new.board_id and organization_id = new.organization_id;
  return new;
end;
$$;

create trigger boards_protect_provenance
before insert or update on public.boards
for each row execute function private.protect_board_provenance();

create trigger board_elements_protect_provenance
before insert or update on public.board_elements
for each row execute function private.protect_board_element_provenance();

create trigger board_elements_touch_board
after insert or update on public.board_elements
for each row execute function private.touch_board_from_element();

alter table public.boards enable row level security;
alter table public.board_elements enable row level security;

create policy boards_select_for_members on public.boards
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy boards_insert_for_collaborators on public.boards
for insert to authenticated
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

create policy boards_update_for_collaborators on public.boards
for update to authenticated
using ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)))
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

create policy board_elements_select_for_members on public.board_elements
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy board_elements_insert_for_collaborators on public.board_elements
for insert to authenticated
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

create policy board_elements_update_for_collaborators on public.board_elements
for update to authenticated
using ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)))
with check ((select private.has_organization_role(
  organization_id,
  array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
)));

grant select on public.boards, public.board_elements to authenticated;
grant insert (title, organization_id, created_by, updated_by)
on public.boards to authenticated;
grant update (title, updated_by, archived_at)
on public.boards to authenticated;
grant insert (
  board_id, organization_id, element_type, x, y, width, height, rotation,
  z_index, content, style, metadata, created_by, updated_by
) on public.board_elements to authenticated;
grant update (
  x, y, width, height, rotation, z_index, content, style, metadata,
  updated_by, archived_at
) on public.board_elements to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-images',
  'board-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.board_image_organization_id(object_name text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  path_organization text;
begin
  path_organization := (storage.foldername(object_name))[1];
  if path_organization ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return path_organization::uuid;
  end if;
  return null;
end;
$$;

revoke all on function private.board_image_organization_id(text) from public, anon;
grant execute on function private.board_image_organization_id(text) to authenticated;

create policy board_images_select_for_members on storage.objects
for select to authenticated
using (
  bucket_id = 'board-images'
  and (select private.is_organization_member(private.board_image_organization_id(name)))
);

create policy board_images_insert_for_collaborators on storage.objects
for insert to authenticated
with check (
  bucket_id = 'board-images'
  and (select private.has_organization_role(
    private.board_image_organization_id(name),
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  ))
);

create policy board_images_delete_for_collaborators on storage.objects
for delete to authenticated
using (
  bucket_id = 'board-images'
  and (select private.has_organization_role(
    private.board_image_organization_id(name),
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  ))
);
