-- Marketing-owned working data. No AI execution, automatic learning or memory writes.
create table public.marketing_hypotheses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check(length(btrim(title)) between 2 and 160),
  statement text not null check(length(btrim(statement)) between 2 and 4000),
  status text not null default 'DRAFT' check(status in('DRAFT','READY_TO_TEST','TESTING','SUPPORTED','NOT_SUPPORTED','INCONCLUSIVE')),
  confidence text check(confidence in('LOW','MEDIUM','HIGH')),
  owner_id uuid, created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  archived_at timestamptz, board_conversion_id uuid,
  unique(organization_id,id),unique(organization_id,board_conversion_id),
  foreign key(organization_id,owner_id) references public.memberships(organization_id,user_id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,updated_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,board_conversion_id) references public.board_entity_conversions(organization_id,id) deferrable initially deferred
);
create table public.marketing_hypothesis_sources (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  hypothesis_id uuid not null, evidence_id uuid, evidence_run_id uuid, evidence_key text,
  note_id uuid, opportunity_report_id uuid, opportunity_index integer,
  created_by uuid not null, created_at timestamptz not null default clock_timestamp(), archived_at timestamptz,
  unique(organization_id,id),
  check(num_nonnulls(evidence_id,note_id,opportunity_report_id)=1),
  check((evidence_id is null and evidence_run_id is null and evidence_key is null) or
    (evidence_id is not null and evidence_run_id is not null and evidence_key is not null)),
  check((opportunity_report_id is null and opportunity_index is null) or
    (opportunity_report_id is not null and opportunity_index is not null and opportunity_index between 0 and 3)),
  foreign key(organization_id,hypothesis_id) references public.marketing_hypotheses(organization_id,id),
  foreign key(organization_id,evidence_id) references public.marketing_external_research_evidence(organization_id,id),
  foreign key(organization_id,note_id) references public.marketing_research(organization_id,id),
  foreign key(organization_id,opportunity_report_id) references public.marketing_external_research_reports(organization_id,id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id)
);
create unique index marketing_hypothesis_evidence_unique on public.marketing_hypothesis_sources(hypothesis_id,evidence_id) where evidence_id is not null;
create unique index marketing_hypothesis_note_unique on public.marketing_hypothesis_sources(hypothesis_id,note_id) where note_id is not null;
create unique index marketing_hypothesis_opportunity_unique on public.marketing_hypothesis_sources(hypothesis_id,opportunity_report_id,opportunity_index) where opportunity_report_id is not null;

create table public.marketing_experiments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  hypothesis_id uuid not null, title text not null check(length(btrim(title)) between 2 and 160),
  test_plan text not null default '' check(length(test_plan)<=4000),
  success_criteria text not null default '' check(length(success_criteria)<=2000),
  status text not null default 'DRAFT' check(status in('DRAFT','PLANNED','RUNNING','EVALUATING','COMPLETE','CANCELLED')),
  owner_id uuid, starts_on date, ends_on date,
  outcome text check(outcome in('SUPPORTED','NOT_SUPPORTED','INCONCLUSIVE')),
  result_summary text check(length(result_summary)<=4000), evaluated_at timestamptz, evaluated_by uuid,
  evaluated_hypothesis_statement text, evaluated_source_ids uuid[],
  created_by uuid not null, updated_by uuid not null, created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(), archived_at timestamptz, board_conversion_id uuid,
  unique(organization_id,id),unique(organization_id,board_conversion_id),
  check(ends_on is null or starts_on is null or ends_on>=starts_on),
  check(status not in('RUNNING','EVALUATING','COMPLETE') or length(btrim(success_criteria))>0),
  check((status='COMPLETE' and outcome is not null and result_summary is not null and length(btrim(result_summary))>0 and evaluated_at is not null and evaluated_by is not null
    and evaluated_hypothesis_statement is not null and evaluated_source_ids is not null and cardinality(evaluated_source_ids)<=30) or
    (status<>'COMPLETE' and num_nonnulls(outcome,result_summary,evaluated_at,evaluated_by,evaluated_hypothesis_statement,evaluated_source_ids)=0)),
  foreign key(organization_id,hypothesis_id) references public.marketing_hypotheses(organization_id,id),
  foreign key(organization_id,owner_id) references public.memberships(organization_id,user_id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,updated_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,evaluated_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,board_conversion_id) references public.board_entity_conversions(organization_id,id) deferrable initially deferred
);
create table public.marketing_experiment_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  experiment_id uuid not null, task_id uuid, campaign_id uuid, reel_idea_id uuid, creative_brief_id uuid,
  reel_brief_version_id uuid, performance_snapshot_id uuid, performance_learning_id uuid,
  created_by uuid not null, created_at timestamptz not null default clock_timestamp(), archived_at timestamptz,
  check(num_nonnulls(task_id,campaign_id,reel_idea_id,creative_brief_id,reel_brief_version_id,performance_snapshot_id,performance_learning_id)=1),
  unique(organization_id,id),
  foreign key(organization_id,experiment_id) references public.marketing_experiments(organization_id,id),
  foreign key(organization_id,task_id) references public.tasks(organization_id,id),
  foreign key(organization_id,campaign_id) references public.marketing_campaigns(organization_id,id),
  foreign key(organization_id,reel_idea_id) references public.marketing_reel_ideas(organization_id,id),
  foreign key(organization_id,creative_brief_id) references public.marketing_creative_briefs(organization_id,id),
  foreign key(organization_id,reel_brief_version_id) references public.marketing_reel_brief_versions(organization_id,id),
  foreign key(organization_id,performance_snapshot_id) references public.marketing_performance_snapshots(organization_id,id),
  foreign key(organization_id,performance_learning_id) references public.marketing_performance_learnings(organization_id,id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id)
);
create unique index marketing_experiment_target_unique on public.marketing_experiment_links
  (experiment_id,coalesce(task_id,campaign_id,reel_idea_id,creative_brief_id,reel_brief_version_id,performance_snapshot_id,performance_learning_id));
create table public.marketing_learnings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  experiment_id uuid not null, title text not null check(length(btrim(title)) between 2 and 160),
  conclusion text not null check(length(btrim(conclusion)) between 2 and 4000),
  confidence text not null default 'MEDIUM' check(confidence in('LOW','MEDIUM','HIGH')),
  created_by uuid not null, updated_by uuid not null, created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(), archived_at timestamptz,
  unique(organization_id,id), unique(organization_id,experiment_id),
  foreign key(organization_id,experiment_id) references public.marketing_experiments(organization_id,id),
  foreign key(organization_id,created_by) references public.memberships(organization_id,user_id),
  foreign key(organization_id,updated_by) references public.memberships(organization_id,user_id)
);

-- All reads are plugin/tenant scoped. Only the bounded actor-deriving RPCs write.
do $$declare t text;begin
  foreach t in array array['marketing_hypotheses','marketing_hypothesis_sources','marketing_experiments','marketing_experiment_links','marketing_learnings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using(private.marketing_plugin_available(organization_id))',t||'_read',t);
    if t in('marketing_hypotheses','marketing_experiments','marketing_learnings') then
      execute format('create index %I on public.%I(organization_id,updated_at desc,id)',t||'_list',t);
    end if;
  end loop;
end$$;
create index marketing_hypothesis_sources_parent on public.marketing_hypothesis_sources(organization_id,hypothesis_id);
create index marketing_experiment_links_parent on public.marketing_experiment_links(organization_id,experiment_id);
create index marketing_experiment_links_tasks on public.marketing_experiment_links(organization_id,task_id) where task_id is not null;
create index marketing_experiment_links_campaigns on public.marketing_experiment_links(organization_id,campaign_id) where campaign_id is not null;

create function private.require_growth_editor(p_org uuid) returns uuid
language plpgsql security definer set search_path='' as $$begin
  if not coalesce(private.marketing_plugin_writable(p_org),false) then raise exception 'Growth workspace unavailable' using errcode='42501';end if;
  return auth.uid();
end$$;
revoke all on function private.require_growth_editor(uuid) from public,anon,authenticated;

create function private.validate_growth_owner(p_org uuid,p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$begin
  if p_owner is not null and not exists(select 1 from public.memberships where organization_id=p_org and user_id=p_owner and removed_at is null) then
    raise exception 'Owner unavailable' using errcode='22023';end if;
end$$;
revoke all on function private.validate_growth_owner(uuid,uuid) from public,anon,authenticated;

create function public.save_marketing_hypothesis(p_organization_id uuid,p_id uuid,p_fields jsonb,p_expected_updated_at timestamptz default null,p_source jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); old public.marketing_hypotheses;begin
  if p_id is null or p_fields is null or jsonb_typeof(p_fields)<>'object' or pg_column_size(p_fields)>16384
    or p_fields-array['title','statement','status','confidence','ownerId','archived']<>'{}'::jsonb then raise exception 'Invalid hypothesis' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into old from public.marketing_hypotheses where id=p_id and organization_id=p_organization_id for update;
  if old.id is null and p_expected_updated_at is not null then raise exception 'Hypothesis unavailable' using errcode='42501';end if;
  if old.id is not null and old.updated_at is distinct from p_expected_updated_at then raise exception 'Hypothesis changed; reload' using errcode='PT409';end if;
  perform private.validate_growth_owner(p_organization_id,nullif(p_fields->>'ownerId','')::uuid);
  if old.id is null then
    insert into public.marketing_hypotheses(id,organization_id,title,statement,status,confidence,owner_id,created_by,updated_by)
      values(p_id,p_organization_id,p_fields->>'title',p_fields->>'statement',coalesce(p_fields->>'status','DRAFT'),nullif(p_fields->>'confidence',''),nullif(p_fields->>'ownerId','')::uuid,actor,actor);
  else
    update public.marketing_hypotheses set title=p_fields->>'title',statement=p_fields->>'statement',status=p_fields->>'status',confidence=nullif(p_fields->>'confidence',''),owner_id=nullif(p_fields->>'ownerId','')::uuid,
      archived_at=case when coalesce((p_fields->>'archived')::boolean,false) then coalesce(old.archived_at,clock_timestamp()) else null end,updated_by=actor,updated_at=clock_timestamp() where id=old.id;
  end if;
  if p_source is not null then perform public.link_marketing_hypothesis_source(p_organization_id,p_id,p_source,false);end if;
  return p_id;
end$$;

create function public.link_marketing_hypothesis_source(p_organization_id uuid,p_hypothesis_id uuid,p_source jsonb,p_archived boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); source_id uuid; hypothesis public.marketing_hypotheses; ev public.marketing_external_research_evidence; report public.marketing_external_research_reports;
begin
  select * into hypothesis from public.marketing_hypotheses where id=p_hypothesis_id and organization_id=p_organization_id and archived_at is null for update;
  if hypothesis.id is null then raise exception 'Hypothesis unavailable' using errcode='42501';end if;
  if p_source is null or jsonb_typeof(p_source)<>'object' or p_source-array['kind','id','runId','evidenceKey','index']<>'{}'::jsonb then raise exception 'Invalid source' using errcode='22023';end if;
  if p_source->>'kind'='evidence' then
    select * into ev from public.marketing_external_research_evidence where organization_id=p_organization_id and id=(p_source->>'id')::uuid and run_id=(p_source->>'runId')::uuid and evidence_id=p_source->>'evidenceKey';
    if ev.id is null then raise exception 'Evidence unavailable' using errcode='42501';end if;
    select id into source_id from public.marketing_hypothesis_sources where hypothesis_id=p_hypothesis_id and evidence_id=ev.id;
  elsif p_source->>'kind'='note' then
    if not exists(select 1 from public.marketing_research where organization_id=p_organization_id and id=(p_source->>'id')::uuid and (archived_at is null or p_archived)) then raise exception 'Note unavailable' using errcode='42501';end if;
    select id into source_id from public.marketing_hypothesis_sources where hypothesis_id=p_hypothesis_id and note_id=(p_source->>'id')::uuid;
  elsif p_source->>'kind'='opportunity' then
    select * into report from public.marketing_external_research_reports where organization_id=p_organization_id and id=(p_source->>'id')::uuid;
    if report.id is null or (p_source->>'index')::integer not between 0 and 3 or jsonb_typeof(report.structured_report#>array['contentOpportunities',p_source->>'index']) is distinct from 'object' then raise exception 'Opportunity unavailable' using errcode='42501';end if;
    select id into source_id from public.marketing_hypothesis_sources where hypothesis_id=p_hypothesis_id and opportunity_report_id=report.id and opportunity_index=(p_source->>'index')::integer;
  else raise exception 'Invalid source kind' using errcode='22023';end if;
  if source_id is not null then
    if not p_archived and exists(select 1 from public.marketing_hypothesis_sources where id=source_id and archived_at is not null) and (select count(*) from public.marketing_hypothesis_sources where hypothesis_id=p_hypothesis_id and archived_at is null)>=30 then raise exception 'At most 30 sources' using errcode='22023';end if;
    update public.marketing_hypothesis_sources set archived_at=case when p_archived then clock_timestamp() else null end where id=source_id;return source_id;
  end if;
  if p_archived then raise exception 'Source unavailable' using errcode='42501';end if;
  if (select count(*) from public.marketing_hypothesis_sources where hypothesis_id=p_hypothesis_id and archived_at is null)>=30 then raise exception 'At most 30 sources' using errcode='22023';end if;
  insert into public.marketing_hypothesis_sources(organization_id,hypothesis_id,evidence_id,evidence_run_id,evidence_key,note_id,opportunity_report_id,opportunity_index,created_by)
    values(p_organization_id,p_hypothesis_id,ev.id,ev.run_id,ev.evidence_id,case when p_source->>'kind'='note' then (p_source->>'id')::uuid end,report.id,case when report.id is not null then (p_source->>'index')::integer end,actor) returning id into source_id;
  return source_id;
end$$;

create function public.save_marketing_experiment(p_organization_id uuid,p_id uuid,p_fields jsonb,p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); old public.marketing_experiments; next_status text:=coalesce(p_fields->>'status','DRAFT');begin
  if p_id is null or p_fields is null or jsonb_typeof(p_fields)<>'object' or pg_column_size(p_fields)>32768 or
    p_fields-array['title','hypothesisId','testPlan','successCriteria','status','ownerId','startsOn','endsOn','archived']<>'{}'::jsonb then raise exception 'Invalid experiment' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into old from public.marketing_experiments where id=p_id and organization_id=p_organization_id for update;
  if old.id is null and p_expected_updated_at is not null then raise exception 'Experiment unavailable' using errcode='42501';end if;
  if old.id is not null and old.updated_at is distinct from p_expected_updated_at then raise exception 'Experiment changed; reload' using errcode='PT409';end if;
  if old.status='COMPLETE' then
    if p_fields->>'title'<>old.title or p_fields->>'hypothesisId'<>old.hypothesis_id::text or p_fields->>'testPlan'<>old.test_plan or p_fields->>'successCriteria'<>old.success_criteria or next_status<>'COMPLETE'
      or nullif(p_fields->>'ownerId','')::uuid is distinct from old.owner_id or nullif(p_fields->>'startsOn','')::date is distinct from old.starts_on or nullif(p_fields->>'endsOn','')::date is distinct from old.ends_on then raise exception 'Completed evaluation is immutable' using errcode='22023';end if;
    update public.marketing_experiments set archived_at=case when coalesce((p_fields->>'archived')::boolean,false) then coalesce(old.archived_at,clock_timestamp()) else null end,updated_by=actor,updated_at=clock_timestamp() where id=old.id;return old.id;
  end if;
  if not exists(select 1 from public.marketing_hypotheses where organization_id=p_organization_id and id=(p_fields->>'hypothesisId')::uuid and archived_at is null) then raise exception 'Hypothesis unavailable' using errcode='42501';end if;
  perform private.validate_growth_owner(p_organization_id,nullif(p_fields->>'ownerId','')::uuid);
  if old.id is null and next_status not in('DRAFT','PLANNED') or next_status='COMPLETE' or
    (old.status='CANCELLED' and next_status<>'CANCELLED') or
    (old.status in('DRAFT','PLANNED') and next_status not in('DRAFT','PLANNED','RUNNING','CANCELLED')) or
    (old.status='RUNNING' and next_status not in('RUNNING','EVALUATING','CANCELLED')) or
    (old.status='EVALUATING' and next_status not in('EVALUATING','RUNNING','CANCELLED')) then raise exception 'Invalid lifecycle transition' using errcode='22023';end if;
  if old.id is null then
    insert into public.marketing_experiments(id,organization_id,hypothesis_id,title,test_plan,success_criteria,status,owner_id,starts_on,ends_on,created_by,updated_by)
      values(p_id,p_organization_id,(p_fields->>'hypothesisId')::uuid,p_fields->>'title',coalesce(p_fields->>'testPlan',''),coalesce(p_fields->>'successCriteria',''),next_status,nullif(p_fields->>'ownerId','')::uuid,nullif(p_fields->>'startsOn','')::date,nullif(p_fields->>'endsOn','')::date,actor,actor);
  else
    if old.hypothesis_id<>(p_fields->>'hypothesisId')::uuid then raise exception 'Hypothesis identity is immutable' using errcode='22023';end if;
    update public.marketing_experiments set title=p_fields->>'title',test_plan=coalesce(p_fields->>'testPlan',''),success_criteria=coalesce(p_fields->>'successCriteria',''),status=next_status,owner_id=nullif(p_fields->>'ownerId','')::uuid,starts_on=nullif(p_fields->>'startsOn','')::date,ends_on=nullif(p_fields->>'endsOn','')::date,
      archived_at=case when coalesce((p_fields->>'archived')::boolean,false) then coalesce(old.archived_at,clock_timestamp()) else null end,updated_by=actor,updated_at=clock_timestamp() where id=old.id;
  end if;return p_id;
end$$;

create function public.link_marketing_experiment(p_organization_id uuid,p_experiment_id uuid,p_kind text,p_target_id uuid,p_archived boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); table_name text; column_name text; target uuid; link_id uuid; experiment public.marketing_experiments;begin
  select * into experiment from public.marketing_experiments where organization_id=p_organization_id and id=p_experiment_id and archived_at is null for update;
  if experiment.id is null then raise exception 'Experiment unavailable' using errcode='42501';end if;
  if experiment.status in('COMPLETE','CANCELLED') then raise exception 'Closed execution links are immutable' using errcode='22023';end if;
  select x.t,x.c into table_name,column_name from(values
    ('task','tasks','task_id'),('campaign','marketing_campaigns','campaign_id'),('reel-idea','marketing_reel_ideas','reel_idea_id'),('creative-brief','marketing_creative_briefs','creative_brief_id'),('reel-brief','marketing_reel_brief_versions','reel_brief_version_id'),('snapshot','marketing_performance_snapshots','performance_snapshot_id'),('performance-learning','marketing_performance_learnings','performance_learning_id')) x(k,t,c) where x.k=p_kind;
  if table_name is null then raise exception 'Invalid link kind' using errcode='22023';end if;
  execute format('select id from public.%I where organization_id=$1 and id=$2 %s',table_name,case when p_kind in('campaign','reel-idea','creative-brief') and not p_archived then 'and archived_at is null' else '' end) into target using p_organization_id,p_target_id;
  if target is null then raise exception 'Link target unavailable' using errcode='42501';end if;
  execute format('select id from public.marketing_experiment_links where experiment_id=$1 and %I=$2',column_name) into link_id using p_experiment_id,p_target_id;
  if link_id is not null then
    if not p_archived and exists(select 1 from public.marketing_experiment_links where id=link_id and archived_at is not null) and (select count(*) from public.marketing_experiment_links where experiment_id=p_experiment_id and archived_at is null)>=50 then raise exception 'At most 50 execution/result links' using errcode='22023';end if;
    update public.marketing_experiment_links set archived_at=case when p_archived then clock_timestamp() else null end where id=link_id;return link_id;
  end if;
  if p_archived then raise exception 'Link unavailable' using errcode='42501';end if;
  if (select count(*) from public.marketing_experiment_links where experiment_id=p_experiment_id and archived_at is null)>=50 then raise exception 'At most 50 execution/result links' using errcode='22023';end if;
  execute format('insert into public.marketing_experiment_links(organization_id,experiment_id,%I,created_by) values($1,$2,$3,$4) returning id',column_name) into link_id using p_organization_id,p_experiment_id,p_target_id,actor;return link_id;
end$$;

create function public.save_marketing_learning(p_organization_id uuid,p_id uuid,p_experiment_id uuid,p_title text,p_conclusion text,p_confidence text,p_archived boolean default false,p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); old public.marketing_learnings;begin
  perform 1 from public.marketing_experiments where organization_id=p_organization_id and id=p_experiment_id and status='COMPLETE'
    and (archived_at is null or exists(select 1 from public.marketing_learnings where id=p_id and organization_id=p_organization_id and experiment_id=p_experiment_id)) for update;
  if not found then raise exception 'Completed experiment required' using errcode='42501';end if;
  select * into old from public.marketing_learnings where organization_id=p_organization_id and id=p_id for update;
  if old.id is not null then
    if old.experiment_id<>p_experiment_id or old.updated_at is distinct from p_expected_updated_at then raise exception 'Learning changed; reload' using errcode='PT409';end if;
    update public.marketing_learnings set title=p_title,conclusion=p_conclusion,confidence=p_confidence,archived_at=case when p_archived then coalesce(old.archived_at,clock_timestamp()) else null end,updated_by=actor,updated_at=clock_timestamp() where id=old.id;
  else
    if p_expected_updated_at is not null then raise exception 'Learning unavailable' using errcode='42501';end if;
    insert into public.marketing_learnings(id,organization_id,experiment_id,title,conclusion,confidence,created_by,updated_by) values(p_id,p_organization_id,p_experiment_id,p_title,p_conclusion,p_confidence,actor,actor);
  end if;return p_id;
end$$;

create function public.evaluate_marketing_experiment(p_organization_id uuid,p_experiment_id uuid,p_outcome text,p_result_summary text,p_expected_updated_at timestamptz,p_learning jsonb default null,p_update_hypothesis boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); experiment public.marketing_experiments; hypothesis public.marketing_hypotheses; source_ids uuid[];begin
  select * into experiment from public.marketing_experiments where organization_id=p_organization_id and id=p_experiment_id and archived_at is null for update;
  if experiment.id is null then raise exception 'Experiment unavailable' using errcode='42501';end if;
  if experiment.updated_at is distinct from p_expected_updated_at then raise exception 'Experiment changed; reload' using errcode='PT409';end if;
  if experiment.status<>'EVALUATING' then raise exception 'Move experiment to Evaluating first' using errcode='22023';end if;
  select * into hypothesis from public.marketing_hypotheses where organization_id=p_organization_id and id=experiment.hypothesis_id for update;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into source_ids from public.marketing_hypothesis_sources where hypothesis_id=hypothesis.id and archived_at is null;
  update public.marketing_experiments set status='COMPLETE',outcome=p_outcome,result_summary=p_result_summary,evaluated_at=clock_timestamp(),evaluated_by=actor,evaluated_hypothesis_statement=hypothesis.statement,evaluated_source_ids=source_ids,updated_at=clock_timestamp(),updated_by=actor where id=experiment.id;
  if p_learning is not null then
    if jsonb_typeof(p_learning)<>'object' or pg_column_size(p_learning)>16384 or p_learning-array['id','title','conclusion','confidence']<>'{}'::jsonb then raise exception 'Invalid learning' using errcode='22023';end if;
    perform public.save_marketing_learning(p_organization_id,(p_learning->>'id')::uuid,experiment.id,p_learning->>'title',p_learning->>'conclusion',p_learning->>'confidence',false,null);
  end if;
  if p_update_hypothesis then
    if hypothesis.archived_at is not null then raise exception 'Archived hypothesis cannot change' using errcode='22023';end if;
    update public.marketing_hypotheses set status=p_outcome,updated_at=clock_timestamp(),updated_by=actor where id=hypothesis.id;
  end if;return experiment.id;
end$$;

revoke all on function public.save_marketing_hypothesis(uuid,uuid,jsonb,timestamptz,jsonb),public.link_marketing_hypothesis_source(uuid,uuid,jsonb,boolean),public.save_marketing_experiment(uuid,uuid,jsonb,timestamptz),public.link_marketing_experiment(uuid,uuid,text,uuid,boolean),public.save_marketing_learning(uuid,uuid,uuid,text,text,text,boolean,timestamptz),public.evaluate_marketing_experiment(uuid,uuid,text,text,timestamptz,jsonb,boolean) from public,anon;
grant execute on function public.save_marketing_hypothesis(uuid,uuid,jsonb,timestamptz,jsonb),public.link_marketing_hypothesis_source(uuid,uuid,jsonb,boolean),public.save_marketing_experiment(uuid,uuid,jsonb,timestamptz),public.link_marketing_experiment(uuid,uuid,text,uuid,boolean),public.save_marketing_learning(uuid,uuid,uuid,text,text,text,boolean,timestamptz),public.evaluate_marketing_experiment(uuid,uuid,text,text,timestamptz,jsonb,boolean) to authenticated;

-- The Marketing boundary checks source/plugin authority, then requests the public
-- Core memory mutation. It never inserts/updates a memory table itself.
create function public.promote_marketing_learning(p_organization_id uuid,p_learning_id uuid,p_kind public.memory_kind,p_title text,p_content text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_growth_editor(p_organization_id); learning public.marketing_learnings; memory_id uuid;begin
  select * into learning from public.marketing_learnings where organization_id=p_organization_id and id=p_learning_id and archived_at is null for update;
  if learning.id is null then raise exception 'Learning unavailable' using errcode='42501';end if;
  select id into memory_id from public.create_company_memory_once(p_organization_id,'marketing.learning:'||learning.id::text,p_kind,p_title,p_content,
    'Learning '||learning.id::text||'; Experiment '||learning.experiment_id::text);
  return memory_id;
end$$;
revoke all on function public.promote_marketing_learning(uuid,uuid,public.memory_kind,text,text) from public,anon;
grant execute on function public.promote_marketing_learning(uuid,uuid,public.memory_kind,text,text) to authenticated;

create function public.marketing_growth_counts(p_organization_id uuid,p_ids uuid[])
returns table(id uuid,source_count bigint,experiment_count bigint)
language plpgsql stable security invoker set search_path='' as $$begin
  if p_ids is null or cardinality(p_ids)>25 then raise exception 'At most 25 hypotheses' using errcode='22023';end if;
  return query select h.id,
    (select count(*) from public.marketing_hypothesis_sources s where s.organization_id=p_organization_id and s.hypothesis_id=h.id and s.archived_at is null),
    (select count(*) from public.marketing_experiments e where e.organization_id=p_organization_id and e.hypothesis_id=h.id and e.archived_at is null)
  from public.marketing_hypotheses h where h.organization_id=p_organization_id and h.id=any(p_ids);
end$$;
revoke all on function public.marketing_growth_counts(uuid,uuid[]) from public,anon;
grant execute on function public.marketing_growth_counts(uuid,uuid[]) to authenticated;

