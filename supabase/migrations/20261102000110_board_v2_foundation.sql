alter table public.boards add column template_key text;
alter table public.boards add constraint boards_template_key_valid check (
  template_key is null or template_key in (
    'blank', 'brand-moodboard', 'campaign', 'reel-storyboard',
    'research-synthesis', 'competitor-inspiration', 'brainstorm'
  )
);
alter table public.board_elements add column parent_id uuid;
alter table public.board_elements add column locked boolean not null default false;
alter table public.board_elements add constraint board_elements_scoped_identity unique (organization_id, board_id, id);
alter table public.board_elements add constraint board_elements_parent_fkey
  foreign key (organization_id, board_id, parent_id)
  references public.board_elements(organization_id, board_id, id)
  deferrable initially deferred;
create index board_elements_parent_idx on public.board_elements(organization_id, board_id, parent_id) where archived_at is null;

alter table public.board_elements add constraint board_elements_bounded_payload check (
  octet_length(content::text) <= 24576 and octet_length(style::text) <= 8192 and octet_length(metadata::text) <= 24576
);
alter table public.board_elements add constraint board_elements_link_valid check (
  element_type <> 'LINK' or coalesce(
    content->>'url' ~* '^https?://[^[:space:]]+$'
    and char_length(content->>'url') <= 2048
    and char_length(btrim(content->>'title')) between 1 and 200, false)
);
alter table public.board_elements add constraint board_elements_section_valid check (
  element_type <> 'SECTION' or coalesce(
    char_length(btrim(content->>'title')) between 1 and 200
    and (not content ? 'collapsed' or jsonb_typeof(content->'collapsed') = 'boolean'), false)
);

-- Keep legacy basic-object writes and their RLS unchanged. New relationships are
-- validated even for direct authenticated table writes, not only through the UI.
grant insert (parent_id, locked) on public.board_elements to authenticated;
grant update (parent_id, locked) on public.board_elements to authenticated;
grant insert (template_key) on public.boards to authenticated;

create function private.validate_board_v2_element()
returns trigger language plpgsql set search_path = '' as $$
declare parent public.board_elements; ancestor_locked boolean := false;
begin
  -- Serialize direct table writes with RPC operations on the same board too.
  perform 1 from public.boards where id = new.board_id and organization_id = new.organization_id for update;
  if tg_op = 'UPDATE' and new.element_type <> old.element_type then
    raise exception 'Object type is immutable' using errcode = '23514';
  end if;
  if new.element_type = 'SECTION' and new.parent_id is not null then
    raise exception 'Nested Sections are not supported' using errcode = '23514';
  end if;
  if new.parent_id is not null then
    select * into parent from public.board_elements
    where id = new.parent_id and board_id = new.board_id and organization_id = new.organization_id;
    if parent.id is null or parent.element_type not in ('SECTION', 'GROUP')
       or new.id = new.parent_id
       or (new.element_type = 'GROUP' and parent.element_type <> 'SECTION') then
      raise exception 'Invalid object ownership' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    select exists (
      select 1 from public.board_elements p
      left join public.board_elements gp on gp.id = p.parent_id and gp.board_id = p.board_id and gp.organization_id = p.organization_id
      where p.id = old.parent_id and p.board_id = old.board_id and p.organization_id = old.organization_id
        and (p.locked or coalesce(gp.locked, false))
    ) into ancestor_locked;
    if ((old.locked and new.locked) or ancestor_locked) and
      (new.x, new.y, new.width, new.height, new.rotation, new.parent_id)
      is distinct from (old.x, old.y, old.width, old.height, old.rotation, old.parent_id) then
      raise exception 'Unlock this object and its container before moving or resizing' using errcode = '23514';
    end if;
  end if;
  if new.element_type = 'IMAGE' and new.metadata ? 'storagePath' and not coalesce(
    jsonb_typeof(new.metadata->'storagePath') = 'string'
    and left(new.metadata->>'storagePath', length(new.organization_id::text || '/' || new.board_id::text || '/'))
      = new.organization_id::text || '/' || new.board_id::text || '/'
    and substring(new.metadata->>'storagePath' from length(new.organization_id::text || '/' || new.board_id::text || '/') + 1)
      ~* '^[a-z0-9][a-z0-9_.-]{0,250}\.(png|jpe?g|webp)$', false) then
    raise exception 'Invalid private image reference' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger board_v2_validate before insert or update on public.board_elements
for each row execute function private.validate_board_v2_element();

-- A move translates descendants in the same transaction, including direct table
-- writes. Bounds resize changes dimensions and deliberately leaves children still.
create function private.move_board_container_children()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.element_type in ('SECTION', 'GROUP') and new.archived_at is null
    and (new.x, new.y) is distinct from (old.x, old.y)
    and (new.width, new.height) is not distinct from (old.width, old.height) then
    update public.board_elements set x = x + new.x - old.x, y = y + new.y - old.y, updated_by = new.updated_by
    where organization_id = new.organization_id and board_id = new.board_id
      and parent_id = new.id and archived_at is null;
  end if;
  return new;
end;
$$;
create trigger board_v2_move_children after update of x, y on public.board_elements
for each row execute function private.move_board_container_children();

create function private.check_board_v2_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.board_elements e left join public.board_elements p
      on (p.organization_id, p.board_id, p.id) = (e.organization_id, e.board_id, e.parent_id)
    where e.organization_id = new.organization_id and e.board_id = new.board_id
      and e.archived_at is null and e.parent_id is not null
      and (p.id is null or p.archived_at is not null)
  ) then
    raise exception 'Active children require an active container; keep or archive children explicitly' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.board_elements container
    where container.organization_id = new.organization_id and container.board_id = new.board_id
      and container.archived_at is null and container.element_type in ('SECTION', 'GROUP')
      and (select count(*) from public.board_elements e
        where e.organization_id = container.organization_id and e.board_id = container.board_id and e.archived_at is null
          and (e.parent_id = container.id or e.parent_id in (
            select g.id from public.board_elements g where g.organization_id = container.organization_id
              and g.board_id = container.board_id and g.parent_id = container.id and g.archived_at is null
          ))) > 199
  ) then
    raise exception 'A container supports at most 199 descendants' using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger board_v2_ownership after insert or update on public.board_elements
deferrable initially deferred for each row execute function private.check_board_v2_ownership();

-- One bounded transaction per user intent. Auth/tenant/role and the active board
-- are checked here even when a caller bypasses application actions. No provider,
-- plugin, canonical business record or memory access is part of this function.
create function public.apply_board_operation(p_board_id uuid, p_upserts jsonb default '[]', p_archive_ids uuid[] default '{}')
returns setof public.board_elements language plpgsql security definer set search_path = '' as $$
declare
  target public.boards; entry jsonb; existing public.board_elements; object_id uuid;
  touched uuid[]; input_ids uuid[]; current_user_id uuid := (select auth.uid());
begin
  select * into target from public.boards where id = p_board_id and archived_at is null for update;
  if current_user_id is null or target.id is null or not private.has_organization_role(
    target.organization_id, array['OWNER','ADMIN','MEMBER']::public.organization_role[]) then
    raise exception 'Board unavailable or mutation denied' using errcode = '42501';
  end if;
  if p_upserts is null or jsonb_typeof(p_upserts) <> 'array' or p_archive_ids is null
    or jsonb_array_length(p_upserts) + cardinality(p_archive_ids) not between 1 and 200
    or octet_length(p_upserts::text) > 2097152 then
    raise exception 'An operation supports 1 to 200 objects' using errcode = '22023';
  end if;
  select array_agg((value->>'id')::uuid) into input_ids from jsonb_array_elements(p_upserts);
  input_ids := coalesce(input_ids, '{}') || p_archive_ids;
  if cardinality(input_ids) <> (select count(distinct id) from unnest(input_ids) id) then
    raise exception 'Duplicate operation identities' using errcode = '22023';
  end if;
  if exists (select 1 from public.board_elements where id = any(input_ids)
    and (organization_id <> target.organization_id or board_id <> target.id)) then
    raise exception 'Board unavailable or mutation denied' using errcode = '42501';
  end if;
  select array_agg(distinct id) into touched from (
    select unnest(input_ids) as id union
    select id from public.board_elements where organization_id = target.organization_id and board_id = target.id
      and (parent_id = any(input_ids) or parent_id in (
        select id from public.board_elements where organization_id = target.organization_id and board_id = target.id and parent_id = any(input_ids)
      ))
  ) scope;
  if cardinality(touched) > 200 then raise exception 'Operation exceeds 200 objects' using errcode = '22023'; end if;

  for entry in select value from jsonb_array_elements(p_upserts)
    order by case value->>'element_type' when 'SECTION' then 0 when 'GROUP' then 1 else 2 end loop
    if jsonb_typeof(entry) <> 'object' or not entry ?& array['id','element_type','x','y','width','height','rotation','z_index','content','style','metadata','parent_id','locked']
      or exists (select 1 from jsonb_object_keys(entry) key where key <> all(array['id','element_type','x','y','width','height','rotation','z_index','content','style','metadata','parent_id','locked'])) then
      raise exception 'Invalid object projection' using errcode = '22023';
    end if;
    object_id := (entry->>'id')::uuid;
    select * into existing from public.board_elements where id = object_id;
    if existing.id is not null and existing.element_type::text <> entry->>'element_type' then
      raise exception 'Object type is immutable' using errcode = '23514';
    end if;
    insert into public.board_elements (
      id, board_id, organization_id, element_type, x, y, width, height, rotation, z_index,
      content, style, metadata, parent_id, locked, created_by, updated_by, archived_at
    ) values (
      object_id, target.id, target.organization_id, (entry->>'element_type')::public.board_element_type,
      (entry->>'x')::float8, (entry->>'y')::float8, (entry->>'width')::float8, (entry->>'height')::float8,
      (entry->>'rotation')::float8, (entry->>'z_index')::integer,
      entry->'content', entry->'style', entry->'metadata', (entry->>'parent_id')::uuid,
      (entry->>'locked')::boolean, current_user_id, current_user_id, null
    ) on conflict (id) do update set
      x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height,
      rotation = excluded.rotation, z_index = excluded.z_index, content = excluded.content,
      style = excluded.style, metadata = excluded.metadata, parent_id = excluded.parent_id,
      locked = excluded.locked, updated_by = current_user_id, archived_at = null;
  end loop;
  -- Missing IDs are an idempotent no-op (including undo of a failed create).
  -- Existing foreign identities were rejected before any write above.
  update public.board_elements set archived_at = now(), updated_by = current_user_id
  where id = any(p_archive_ids) and board_id = target.id and organization_id = target.organization_id;
  set constraints public.board_elements_parent_fkey, public.board_v2_ownership immediate;
  set constraints public.board_elements_parent_fkey, public.board_v2_ownership deferred;
  return query select * from public.board_elements where organization_id = target.organization_id and board_id = target.id and id = any(touched);
end;
$$;
revoke all on function public.apply_board_operation(uuid,jsonb,uuid[]) from public, anon;
grant execute on function public.apply_board_operation(uuid,jsonb,uuid[]) to authenticated;

create function public.create_board_from_template(p_organization_id uuid, p_title text, p_template_key text, p_elements jsonb)
returns public.boards language plpgsql security definer set search_path = '' as $$
declare target public.boards; current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or not private.has_organization_role(p_organization_id,
    array['OWNER','ADMIN','MEMBER']::public.organization_role[]) then
    raise exception 'Board creation denied' using errcode = '42501';
  end if;
  if p_template_key is null or p_elements is null or jsonb_typeof(p_elements) <> 'array' or jsonb_array_length(p_elements) > 200 then
    raise exception 'Invalid template' using errcode = '22023';
  end if;
  insert into public.boards(organization_id,title,template_key,created_by,updated_by)
    values(p_organization_id,btrim(p_title),p_template_key,current_user_id,current_user_id) returning * into target;
  if jsonb_array_length(p_elements) > 0 then perform public.apply_board_operation(target.id,p_elements,'{}'); end if;
  return target;
end;
$$;
revoke all on function public.create_board_from_template(uuid,text,text,jsonb) from public, anon;
grant execute on function public.create_board_from_template(uuid,text,text,jsonb) to authenticated;
