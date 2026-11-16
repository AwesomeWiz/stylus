-- Extend the existing bounded public receipt contract to explicit native sources.
-- Providers still own target-specific authorization and creation. No editor model change.
create or replace function public.prepare_board_entity_conversion(p_id uuid,p_board_id uuid,p_entity_type text,p_input jsonb,p_source_ids uuid[])
returns public.board_entity_conversions language plpgsql security definer set search_path='' as $$
declare target public.boards; receipt public.board_entity_conversions; plugin text;
begin
  select * into target from public.boards where id=p_board_id and archived_at is null for update;
  if auth.uid() is null or target.id is null or not private.has_organization_role(target.organization_id,array['OWNER','ADMIN','MEMBER']::public.organization_role[]) then raise exception 'Board unavailable' using errcode='42501'; end if;
  if p_id is null or p_entity_type is null or length(p_entity_type)>80 or p_entity_type !~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'
    or p_input is null or jsonb_typeof(p_input)<>'object' or pg_column_size(p_input)>16384
    or p_source_ids is null or cardinality(p_source_ids) not between 1 and 30
    or cardinality(p_source_ids)<>(select count(distinct id) from unnest(p_source_ids) id) then raise exception 'Invalid conversion' using errcode='22023'; end if;
  if exists(select 1 from jsonb_each(p_input) field where length(field.key)>40 or field.key !~ '^[a-z][a-zA-Z0-9]*$' or jsonb_typeof(field.value) not in ('string','null') or length(field.value#>>'{}')>8000) then raise exception 'Invalid conversion fields' using errcode='22023'; end if;
  plugin:=split_part(p_entity_type,'.',1);
  if plugin<>'core' and not exists(select 1 from public.organization_plugins op where op.organization_id=target.organization_id and op.plugin_id=plugin and op.enabled) then raise exception 'Item unavailable' using errcode='42501'; end if;
  select * into receipt from public.board_entity_conversions where id=p_id for update;
  if receipt.id is not null then
    if receipt.organization_id<>target.organization_id or receipt.board_id is distinct from target.id or receipt.created_by is distinct from auth.uid()
      or receipt.entity_type<>p_entity_type or receipt.input<>p_input or receipt.source_ids<>p_source_ids then raise exception 'Conversion changed' using errcode='PT409'; end if;
    return receipt;
  end if;
  if (select count(*) from public.board_elements e where e.organization_id=target.organization_id and e.board_id=target.id and e.id=any(p_source_ids) and e.archived_at is null and e.element_type in ('TEXT','STICKY','SHAPE','ARROW','LINK','ENTITY_CARD'))<>cardinality(p_source_ids) then raise exception 'Selection unavailable' using errcode='42501'; end if;
  insert into public.board_entity_conversions(id,organization_id,board_id,created_by,entity_type,input,source_ids)
    values(p_id,target.organization_id,target.id,auth.uid(),p_entity_type,p_input,p_source_ids) returning * into receipt;
  return receipt;
end;
$$;

create function private.require_board_reference_conversion(p_id uuid,p_type text)
returns public.board_entity_conversions language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; target_board uuid;
begin
  select board_id into target_board from public.board_entity_conversions where id=p_id;
  perform 1 from public.boards where id=target_board and archived_at is null for update;
  if not found then raise exception 'Board unavailable' using errcode='42501'; end if;
  select * into receipt from public.board_entity_conversions where id=p_id for update;
  if receipt.id is null or receipt.created_by is distinct from auth.uid() or receipt.entity_type<>p_type
    or not private.has_organization_role(receipt.organization_id,array['OWNER','ADMIN','MEMBER']::public.organization_role[])
    or not exists(select 1 from public.boards where id=receipt.board_id and organization_id=receipt.organization_id and archived_at is null) then raise exception 'Conversion unavailable' using errcode='42501'; end if;
  if split_part(p_type,'.',1)<>'core' and not exists(select 1 from public.organization_plugins where organization_id=receipt.organization_id and plugin_id=split_part(p_type,'.',1) and enabled) then raise exception 'Item unavailable' using errcode='42501'; end if;
  if receipt.state='PREPARED' and (select count(*) from public.board_elements where organization_id=receipt.organization_id and board_id=receipt.board_id and id=any(receipt.source_ids) and archived_at is null and element_type in ('TEXT','STICKY','SHAPE','ARROW','LINK','ENTITY_CARD'))<>cardinality(receipt.source_ids) then raise exception 'Selection unavailable' using errcode='42501'; end if;
  return receipt;
end;
$$;
revoke all on function private.require_board_reference_conversion(uuid,text) from public,anon,authenticated;
