-- Marketing owns its daily projection. Core receives no private schema/model.
create function public.marketing_daily_attention(p_organization_id uuid,p_now timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
  if not private.is_organization_member(p_organization_id) or not exists(select 1 from public.organization_plugins where organization_id=p_organization_id and plugin_id='marketing' and enabled) then raise exception 'Work unavailable' using errcode='42501';end if;
  if p_now is null then raise exception 'Reference time required' using errcode='22023';end if;
  with evaluating as (
    select id,title,owner_id,ends_on from public.marketing_experiments where organization_id=p_organization_id and archived_at is null and status='EVALUATING' order by (owner_id=auth.uid()) desc nulls last,ends_on nulls last,id limit 6
  ),ending as (
    select id,title,owner_id,ends_on from public.marketing_experiments where organization_id=p_organization_id and archived_at is null and status='RUNNING' and ends_on<=p_now::date+7 order by ends_on,id limit 6
  ),untested as (
    select h.id,h.title,h.owner_id from public.marketing_hypotheses h where h.organization_id=p_organization_id and h.archived_at is null and h.status='READY_TO_TEST' and h.confidence='HIGH' and not exists(select 1 from public.marketing_experiments e where e.organization_id=p_organization_id and e.hypothesis_id=h.id and e.status<>'CANCELLED') order by h.updated_at desc,h.id desc limit 3
  ),campaigns as (
    select id,name,ends_on from public.marketing_campaigns where organization_id=p_organization_id and archived_at is null and status='ACTIVE' and ends_on<=p_now::date+7 order by ends_on,id limit 3
  ),learning as (
    select id,title,updated_at from public.marketing_learnings where organization_id=p_organization_id and archived_at is null and created_at>=p_now-interval '7 days' order by created_at desc,id desc limit 3
  ),items as (
    select jsonb_build_object('id','experiment:'||e.id,'kind','experiment','title',e.title,'href','/apps/marketing/experiments?item='||e.id,'scope',case when e.owner_id=auth.uid() then 'personal' else 'team' end,'reason','Ready for evaluation','timestamp',e.ends_on,'ownerId',e.owner_id,'rank',1) value from evaluating e
    union all select jsonb_build_object('id','experiment:'||e.id,'kind','experiment','title',e.title,'href','/apps/marketing/experiments?item='||e.id,'scope',case when e.owner_id=auth.uid() then 'personal' else 'team' end,'reason',case when e.ends_on<p_now::date then 'Experiment end date passed' else 'Experiment ending soon' end,'timestamp',e.ends_on,'ownerId',e.owner_id,'rank',2) from ending e
    union all select jsonb_build_object('id','hypothesis:'||h.id,'kind','hypothesis','title',h.title,'href','/apps/marketing/hypotheses?item='||h.id,'scope',case when h.owner_id=auth.uid() then 'personal' else 'team' end,'reason','High-confidence belief ready to test','timestamp',null,'ownerId',h.owner_id,'rank',4) from untested h
    union all select jsonb_build_object('id','campaign:'||c.id,'kind','campaign','title',c.name,'href','/apps/marketing/campaigns?item='||c.id,'scope','team','reason',case when c.ends_on<p_now::date then 'Campaign end date passed' else 'Campaign ending soon' end,'timestamp',c.ends_on,'ownerId',null,'rank',3) from campaigns c
    union all select jsonb_build_object('id','learning:'||l.id,'kind','learning','title',l.title,'href','/apps/marketing/learn?item='||l.id,'scope','team','reason','Recently recorded learning','timestamp',l.updated_at,'ownerId',null,'rank',5) from learning l
  )select coalesce(jsonb_agg(value order by (value->>'rank')::integer,value->>'id'),'[]') into result from items;
  return result;
end$$;
revoke all on function public.marketing_daily_attention(uuid,timestamptz) from public,anon;
grant execute on function public.marketing_daily_attention(uuid,timestamptz) to authenticated;
