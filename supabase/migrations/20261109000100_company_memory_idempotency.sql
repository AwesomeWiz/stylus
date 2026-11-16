-- Explicit human creation through the existing Company Memory mutation domain.
-- Nullable additive key; existing memories and all retrieval/domain rules remain intact.
alter table public.knowledge_memories add column creation_key text
  check(creation_key is null or length(creation_key) between 1 and 160);
grant select(creation_key) on public.knowledge_memories to authenticated;
create unique index knowledge_memories_creation_key_unique
  on public.knowledge_memories(organization_id,creation_key) where creation_key is not null;

create function public.create_company_memory_once(
  p_organization_id uuid, p_creation_key text, p_kind public.memory_kind,
  p_title text, p_content text, p_source_reference text
) returns public.knowledge_memories
language plpgsql security definer set search_path='' as $$
declare actor uuid; memory public.knowledge_memories;
begin
  actor:=private.assert_memory_collaborator(p_organization_id);
  if p_creation_key is null or length(p_creation_key) not between 1 and 160 then
    raise exception 'Invalid creation identity' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text||':'||p_creation_key,0));
  select * into memory from public.knowledge_memories
    where organization_id=p_organization_id and creation_key=p_creation_key;
  -- Repeats return the existing canonical memory, including its archive state.
  -- They never silently replace text, reset archival or issue another creation event.
  if memory.id is not null then return memory; end if;
  memory:=public.create_company_memory(p_organization_id,p_kind,p_title,p_content,p_source_reference,null);
  update public.knowledge_memories set creation_key=p_creation_key where id=memory.id returning * into memory;
  return memory;
end;
$$;
revoke all on function public.create_company_memory_once(uuid,text,public.memory_kind,text,text,text) from public,anon;
grant execute on function public.create_company_memory_once(uuid,text,public.memory_kind,text,text,text) to authenticated;
