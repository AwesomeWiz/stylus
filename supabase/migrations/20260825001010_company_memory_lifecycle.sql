create function private.assert_memory_collaborator(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
  )) then
    raise exception 'Company memory mutation permission required'
      using errcode = '42501';
  end if;
  return v_actor;
end;
$$;

create function public.create_company_memory(
  p_organization_id uuid,
  p_kind public.memory_kind,
  p_title text,
  p_content text,
  p_source_reference text default null,
  p_effective_at timestamptz default null
)
returns public.knowledge_memories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_memory_collaborator(p_organization_id);
  v_memory public.knowledge_memories%rowtype;
begin
  insert into public.knowledge_memories (
    organization_id, domain, kind, title, content, provenance,
    source_reference, effective_at, created_by, updated_by
  ) values (
    p_organization_id, 'company', p_kind, btrim(p_title), btrim(p_content),
    'HUMAN', nullif(btrim(p_source_reference), ''), p_effective_at,
    v_actor, v_actor
  ) returning * into v_memory;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor, 'MEMORY_CREATED', 'KNOWLEDGE', v_memory.id,
    jsonb_build_object('title', v_memory.title, 'kind', v_memory.kind)
  );

  return v_memory;
end;
$$;

create function public.update_company_memory(
  p_organization_id uuid,
  p_memory_id uuid,
  p_kind public.memory_kind,
  p_title text,
  p_content text,
  p_source_reference text default null,
  p_effective_at timestamptz default null
)
returns public.knowledge_memories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_memory_collaborator(p_organization_id);
  v_memory public.knowledge_memories%rowtype;
begin
  update public.knowledge_memories
  set kind = p_kind,
    title = btrim(p_title),
    content = btrim(p_content),
    source_reference = nullif(btrim(p_source_reference), ''),
    effective_at = p_effective_at,
    updated_by = v_actor
  where id = p_memory_id
    and organization_id = p_organization_id
    and domain = 'company'
    and provenance = 'HUMAN'
    and plugin_id is null
    and archived_at is null
  returning * into v_memory;

  if v_memory.id is null then
    raise exception 'Active human-created company memory not found'
      using errcode = 'P0002';
  end if;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor, 'MEMORY_UPDATED', 'KNOWLEDGE', v_memory.id,
    jsonb_build_object('title', v_memory.title, 'kind', v_memory.kind)
  );

  return v_memory;
end;
$$;

create function public.set_company_memory_archived(
  p_organization_id uuid,
  p_memory_id uuid,
  p_archived boolean
)
returns public.knowledge_memories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_memory_collaborator(p_organization_id);
  v_memory public.knowledge_memories%rowtype;
begin
  update public.knowledge_memories
  set archived_at = case when p_archived then now() else null end,
    archived_by = case when p_archived then v_actor else null end,
    updated_by = v_actor
  where id = p_memory_id
    and organization_id = p_organization_id
    and domain = 'company'
    and provenance = 'HUMAN'
    and plugin_id is null
    and ((p_archived and archived_at is null) or (not p_archived and archived_at is not null))
  returning * into v_memory;

  if v_memory.id is null then
    raise exception 'Company memory lifecycle transition is unavailable'
      using errcode = 'P0002';
  end if;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor,
    case when p_archived then 'MEMORY_ARCHIVED'::public.activity_event_type
      else 'MEMORY_RESTORED'::public.activity_event_type end,
    'KNOWLEDGE', v_memory.id,
    jsonb_build_object('title', v_memory.title, 'kind', v_memory.kind)
  );

  return v_memory;
end;
$$;

create function public.search_company_memories(
  p_organization_id uuid,
  p_search text default null,
  p_kinds public.memory_kind[] default null,
  p_provenance public.memory_provenance[] default null,
  p_include_archived boolean default false,
  p_limit integer default 25
)
returns setof public.knowledge_memories
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_search text := nullif(left(btrim(p_search), 100), '');
begin
  if not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization membership required' using errcode = '42501';
  end if;

  return query
  select memory.*
  from public.knowledge_memories as memory
  where memory.organization_id = p_organization_id
    and memory.domain = 'company'
    and (p_include_archived or memory.archived_at is null)
    and (p_kinds is null or memory.kind = any(p_kinds))
    and (p_provenance is null or memory.provenance = any(p_provenance))
    and (
      v_search is null
      or memory.search_vector @@ websearch_to_tsquery('simple', v_search)
    )
  order by memory.updated_at desc, memory.id desc
  limit v_limit;
end;
$$;

revoke all on function private.assert_memory_collaborator(uuid)
from public, anon, authenticated;

revoke all on function public.create_company_memory(
  uuid, public.memory_kind, text, text, text, timestamptz
) from public, anon;
revoke all on function public.update_company_memory(
  uuid, uuid, public.memory_kind, text, text, text, timestamptz
) from public, anon;
revoke all on function public.set_company_memory_archived(uuid, uuid, boolean)
from public, anon;
revoke all on function public.search_company_memories(
  uuid, text, public.memory_kind[], public.memory_provenance[], boolean, integer
) from public, anon;

grant execute on function public.create_company_memory(
  uuid, public.memory_kind, text, text, text, timestamptz
) to authenticated;
grant execute on function public.update_company_memory(
  uuid, uuid, public.memory_kind, text, text, text, timestamptz
) to authenticated;
grant execute on function public.set_company_memory_archived(uuid, uuid, boolean)
to authenticated;
grant execute on function public.search_company_memories(
  uuid, text, public.memory_kind[], public.memory_provenance[], boolean, integer
) to authenticated;
