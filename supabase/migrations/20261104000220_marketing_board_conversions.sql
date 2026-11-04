-- Marketing owns its creation adapter; Core never reads plugin-private tables.
alter table public.marketing_reel_ideas add column board_conversion_id uuid;
alter table public.marketing_research add column board_conversion_id uuid;
alter table public.marketing_reel_ideas add constraint marketing_ideas_conversion_unique unique(organization_id,board_conversion_id);
alter table public.marketing_research add constraint marketing_research_conversion_unique unique(organization_id,board_conversion_id);
alter table public.marketing_reel_ideas add constraint marketing_ideas_conversion_fkey foreign key(organization_id,board_conversion_id) references public.board_entity_conversions(organization_id,id) deferrable initially deferred;
alter table public.marketing_research add constraint marketing_research_conversion_fkey foreign key(organization_id,board_conversion_id) references public.board_entity_conversions(organization_id,id) deferrable initially deferred;
create trigger marketing_idea_board_creation_link before insert or update on public.marketing_reel_ideas for each row execute function private.enforce_board_creation_link('marketing.reel-idea');
create trigger marketing_note_board_creation_link before insert or update on public.marketing_research for each row execute function private.enforce_board_creation_link('marketing.research-note');

create function public.create_marketing_idea_from_board(p_conversion_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; existing uuid;
begin
  receipt:=private.require_board_entity_conversion(p_conversion_id,'marketing.reel-idea');
  if receipt.state='CREATED' then
    select id into existing from public.marketing_reel_ideas where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id;
    if existing is null then raise exception 'Created item unavailable' using errcode='PT410'; end if;
    return existing;
  end if;
  insert into public.marketing_reel_ideas(id,organization_id,title,concept,hook,content_angle,call_to_action,notes,status,campaign_id,created_by,updated_by,board_conversion_id)
    values(receipt.entity_id,receipt.organization_id,receipt.input->>'title',nullif(receipt.input->>'concept',''),nullif(receipt.input->>'hook',''),nullif(receipt.input->>'contentAngle',''),nullif(receipt.input->>'callToAction',''),nullif(receipt.input->>'notes',''),(receipt.input->>'status')::public.marketing_reel_idea_status,nullif(receipt.input->>'campaignId','')::uuid,auth.uid(),auth.uid(),receipt.id) on conflict(id) do nothing;
  if not exists(select 1 from public.marketing_reel_ideas where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id) then raise exception 'Created item unavailable' using errcode='PT410'; end if;
  update public.board_entity_conversions set state='CREATED' where id=receipt.id;
  return receipt.entity_id;
end;
$$;
create function public.create_marketing_note_from_board(p_conversion_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare receipt public.board_entity_conversions; existing uuid;
begin
  receipt:=private.require_board_entity_conversion(p_conversion_id,'marketing.research-note');
  if receipt.state='CREATED' then
    select id into existing from public.marketing_research where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id;
    if existing is null then raise exception 'Created item unavailable' using errcode='PT410'; end if;
    return existing;
  end if;
  insert into public.marketing_research(id,organization_id,title,content,category,source_label,source_url,created_by,updated_by,board_conversion_id)
    values(receipt.entity_id,receipt.organization_id,receipt.input->>'title',receipt.input->>'content',(receipt.input->>'category')::public.marketing_research_category,nullif(receipt.input->>'sourceLabel',''),nullif(receipt.input->>'sourceUrl',''),auth.uid(),auth.uid(),receipt.id) on conflict(id) do nothing;
  if not exists(select 1 from public.marketing_research where id=receipt.entity_id and organization_id=receipt.organization_id and board_conversion_id=receipt.id) then raise exception 'Created item unavailable' using errcode='PT410'; end if;
  update public.board_entity_conversions set state='CREATED' where id=receipt.id;
  return receipt.entity_id;
end;
$$;
revoke all on function public.create_marketing_idea_from_board(uuid),public.create_marketing_note_from_board(uuid) from public,anon;
grant execute on function public.create_marketing_idea_from_board(uuid),public.create_marketing_note_from_board(uuid) to authenticated;
