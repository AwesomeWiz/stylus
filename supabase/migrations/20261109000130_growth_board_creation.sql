-- Domain-owned creation on Core's existing stable target/card receipt identities.
create trigger marketing_hypothesis_board_identity before insert or update on public.marketing_hypotheses for each row execute function private.enforce_board_creation_link('marketing.hypothesis');
create trigger marketing_experiment_board_identity before insert or update on public.marketing_experiments for each row execute function private.enforce_board_creation_link('marketing.experiment');

create function public.create_marketing_growth_from_board(p_conversion_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; target_type text; source public.board_elements; ref jsonb; fields jsonb; existing uuid;begin
  select entity_type into target_type from public.board_entity_conversions where id=p_conversion_id;
  if target_type is null or target_type not in('marketing.hypothesis','marketing.experiment') then raise exception 'Conversion unavailable' using errcode='42501';end if;
  receipt:=private.require_board_reference_conversion(p_conversion_id,target_type);
  if receipt.state='CREATED' then
    if target_type='marketing.hypothesis' then select id into existing from public.marketing_hypotheses where organization_id=receipt.organization_id and id=receipt.entity_id and board_conversion_id=receipt.id;
    else select id into existing from public.marketing_experiments where organization_id=receipt.organization_id and id=receipt.entity_id and board_conversion_id=receipt.id;end if;
    if existing is null then raise exception 'Created item unavailable' using errcode='PT410';end if;return existing;
  end if;
  if cardinality(receipt.source_ids)=1 then
    select * into source from public.board_elements where organization_id=receipt.organization_id and board_id=receipt.board_id and id=receipt.source_ids[1] and archived_at is null;
    if source.element_type='ENTITY_CARD' then ref:=source.content->'reference';end if;
  end if;
  if target_type='marketing.hypothesis' then
    if receipt.input-array['title','statement','status','confidence','ownerId']<>'{}'::jsonb then raise exception 'Invalid reviewed fields' using errcode='22023';end if;
    if exists(select 1 from public.board_elements where organization_id=receipt.organization_id and board_id=receipt.board_id and id=any(receipt.source_ids) and element_type='ENTITY_CARD') and ref is null then raise exception 'Select one Evidence reference' using errcode='22023';end if;
    if ref is not null and (ref->>'entityType'<>'marketing.research-evidence' or ref->>'sourcePlugin'<>'marketing' or ref->>'organizationId'<>receipt.organization_id::text or not(ref?'immutable')) then raise exception 'Evidence reference required' using errcode='42501';end if;
    fields:=jsonb_build_object('title',receipt.input->>'title','statement',receipt.input->>'statement','status',coalesce(receipt.input->>'status','DRAFT'),'confidence',receipt.input->>'confidence','ownerId',receipt.input->>'ownerId');
    perform public.save_marketing_hypothesis(receipt.organization_id,receipt.entity_id,fields,null,
      case when ref is not null then jsonb_build_object('kind','evidence','id',ref->>'entityId','runId',ref#>>'{immutable,runId}','evidenceKey',ref#>>'{immutable,evidenceId}') else null end);
    update public.marketing_hypotheses set board_conversion_id=receipt.id where id=receipt.entity_id;
  else
    if receipt.input-array['title','hypothesisId','testPlan','successCriteria','status','ownerId','startsOn','endsOn']<>'{}'::jsonb then raise exception 'Invalid reviewed fields' using errcode='22023';end if;
    if ref is null or ref->>'entityType'<>'marketing.hypothesis' or ref->>'sourcePlugin'<>'marketing' or ref->>'organizationId'<>receipt.organization_id::text
      or receipt.input->>'hypothesisId' is distinct from ref->>'entityId' then raise exception 'One exact Hypothesis reference required' using errcode='42501';end if;
    fields:=receipt.input;
    perform public.save_marketing_experiment(receipt.organization_id,receipt.entity_id,fields,null);
    update public.marketing_experiments set board_conversion_id=receipt.id where id=receipt.entity_id;
  end if;
  update public.board_entity_conversions set state='CREATED' where id=receipt.id;
  return receipt.entity_id;
end$$;
revoke all on function public.create_marketing_growth_from_board(uuid) from public,anon;
grant execute on function public.create_marketing_growth_from_board(uuid) to authenticated;
