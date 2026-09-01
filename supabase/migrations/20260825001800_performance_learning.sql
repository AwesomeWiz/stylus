create type public.marketing_performance_platform as enum ('INSTAGRAM');
create type public.marketing_performance_content_type as enum ('REEL');
create type public.marketing_performance_snapshot_source as enum ('MANUAL');
create type public.marketing_performance_horizon as enum (
  'EARLY', 'SHORT_TERM', 'SEVEN_DAY', 'MATURE'
);
create type public.marketing_performance_metric as enum ('SAVE_RATE_BY_REACH');
create type public.marketing_performance_evidence_strength as enum (
  'WEAK', 'MODERATE', 'STRONG'
);
create type public.marketing_performance_evidence_role as enum (
  'BASELINE', 'SEGMENT'
);

create table public.marketing_published_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform public.marketing_performance_platform not null default 'INSTAGRAM',
  content_type public.marketing_performance_content_type not null default 'REEL',
  platform_native_id text check (
    platform_native_id is null or char_length(btrim(platform_native_id)) between 1 and 160
  ),
  canonical_url text check (
    canonical_url is null or (
      char_length(canonical_url) <= 500 and canonical_url ~* '^https://'
    )
  ),
  internal_label text not null check (char_length(btrim(internal_label)) between 1 and 160),
  published_at timestamptz not null,
  duration_seconds numeric(10,3) check (duration_seconds > 0 and duration_seconds <= 10800),
  source_reel_brief_version_id uuid,
  content_opportunity_type text check (content_opportunity_type is null or content_opportunity_type in (
    'RELATABLE_PAIN', 'EDUCATIONAL', 'MYTH_BUSTING', 'DEBATE',
    'TREND_EXPLAINER', 'BUYING_OBJECTION', 'IDENTITY_ASPIRATION',
    'QUESTION_ANSWER', 'BRAND_TRUST', 'PRODUCT_CONTEXT'
  )),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, source_reel_brief_version_id)
    references public.marketing_reel_brief_versions(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create unique index marketing_published_content_native_idx
on public.marketing_published_content(organization_id, platform, platform_native_id)
where platform_native_id is not null;
create index marketing_published_content_publication_idx
on public.marketing_published_content(organization_id, published_at desc);
create index marketing_published_content_platform_idx
on public.marketing_published_content(organization_id, platform, published_at desc)
where archived_at is null;
create index marketing_published_content_brief_idx
on public.marketing_published_content(organization_id, source_reel_brief_version_id)
where source_reel_brief_version_id is not null;

create table public.marketing_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  published_content_id uuid not null,
  source_type public.marketing_performance_snapshot_source not null default 'MANUAL',
  observed_at timestamptz not null,
  views bigint check (views between 0 and 9000000000000000),
  reach bigint check (reach between 0 and 9000000000000000),
  likes bigint check (likes between 0 and 9000000000000000),
  comments bigint check (comments between 0 and 9000000000000000),
  shares bigint check (shares between 0 and 9000000000000000),
  saves bigint check (saves between 0 and 9000000000000000),
  total_watch_time_seconds numeric(20,3) check (
    total_watch_time_seconds between 0 and 9000000000000000
  ),
  average_watch_time_seconds numeric(20,3) check (
    average_watch_time_seconds between 0 and 9000000000000000
  ),
  completion_rate numeric(10,9) check (completion_rate between 0 and 1),
  profile_visits bigint check (profile_visits between 0 and 9000000000000000),
  follows bigint check (follows between 0 and 9000000000000000),
  link_clicks bigint check (link_clicks between 0 and 9000000000000000),
  notes text check (notes is null or char_length(notes) <= 1000),
  source_label text check (source_label is null or char_length(source_label) <= 160),
  entered_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, published_content_id, id),
  foreign key (organization_id, published_content_id)
    references public.marketing_published_content(organization_id, id) on delete restrict,
  foreign key (organization_id, entered_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  check (num_nonnulls(
    views, reach, likes, comments, shares, saves, total_watch_time_seconds,
    average_watch_time_seconds, completion_rate, profile_visits, follows, link_clicks
  ) > 0)
);

create index marketing_performance_snapshots_history_idx
on public.marketing_performance_snapshots(
  organization_id, published_content_id, observed_at desc
);

create table public.marketing_performance_learnings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform public.marketing_performance_platform not null,
  content_type public.marketing_performance_content_type not null,
  observation_horizon public.marketing_performance_horizon not null,
  metric public.marketing_performance_metric not null,
  comparison_dimension text not null check (comparison_dimension = 'CONTENT_OPPORTUNITY_TYPE'),
  subject_value text not null check (subject_value in (
    'RELATABLE_PAIN', 'EDUCATIONAL', 'MYTH_BUSTING', 'DEBATE',
    'TREND_EXPLAINER', 'BUYING_OBJECTION', 'IDENTITY_ASPIRATION',
    'QUESTION_ANSWER', 'BRAND_TRUST', 'PRODUCT_CONTEXT'
  )),
  sample_count integer not null check (sample_count between 3 and 100),
  baseline_sample_count integer not null check (baseline_sample_count between 5 and 100),
  segment_value numeric(30,12) not null check (segment_value >= 0),
  baseline_value numeric(30,12) not null check (baseline_value >= 0),
  difference numeric(30,12) not null,
  evidence_strength public.marketing_performance_evidence_strength not null,
  summary text not null check (char_length(btrim(summary)) between 1 and 800),
  caveats text[] not null check (
    cardinality(caveats) between 1 and 4 and pg_column_size(caveats) <= 2400
  ),
  algorithm_version text not null default 'marketing-performance-learning-v1'
    check (algorithm_version = 'marketing-performance-learning-v1'),
  generation_key text not null check (generation_key ~ '^[0-9a-f]{64}$'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, generation_key),
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  check (abs(difference - (segment_value - baseline_value)) <= 0.000000000002)
);

create index marketing_performance_learnings_history_idx
on public.marketing_performance_learnings(
  organization_id, created_at desc, metric, observation_horizon
);

create table public.marketing_performance_learning_evidence (
  organization_id uuid not null,
  learning_id uuid not null,
  published_content_id uuid not null,
  snapshot_id uuid not null,
  evidence_role public.marketing_performance_evidence_role not null,
  source_reel_brief_version_id uuid,
  created_at timestamptz not null default now(),
  primary key (learning_id, snapshot_id),
  foreign key (organization_id, learning_id)
    references public.marketing_performance_learnings(organization_id, id) on delete restrict,
  foreign key (organization_id, published_content_id, snapshot_id)
    references public.marketing_performance_snapshots(
      organization_id, published_content_id, id
    ) on delete restrict,
  foreign key (organization_id, source_reel_brief_version_id)
    references public.marketing_reel_brief_versions(organization_id, id) on delete restrict
);

create index marketing_performance_learning_evidence_content_idx
on public.marketing_performance_learning_evidence(
  organization_id, published_content_id, learning_id
);

alter table public.marketing_published_content enable row level security;
alter table public.marketing_performance_snapshots enable row level security;
alter table public.marketing_performance_learnings enable row level security;
alter table public.marketing_performance_learning_evidence enable row level security;

create policy marketing_published_content_select
on public.marketing_published_content for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_performance_snapshots_select
on public.marketing_performance_snapshots for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_performance_learnings_select
on public.marketing_performance_learnings for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_performance_learning_evidence_select
on public.marketing_performance_learning_evidence for select to authenticated
using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_published_content,
  public.marketing_performance_snapshots,
  public.marketing_performance_learnings,
  public.marketing_performance_learning_evidence from public, anon, authenticated;
grant select on public.marketing_published_content,
  public.marketing_performance_snapshots,
  public.marketing_performance_learnings,
  public.marketing_performance_learning_evidence to authenticated;

create function private.marketing_performance_actor_writable(
  p_organization_id uuid,
  p_actor_id uuid
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships as membership
    join public.organization_plugins as plugin
      on plugin.organization_id = membership.organization_id
      and plugin.plugin_id = 'marketing'
      and plugin.enabled
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_id
      and membership.removed_at is null
      and membership.role in ('OWNER', 'ADMIN', 'MEMBER')
  );
$$;

create function private.reject_marketing_performance_history_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Performance history is immutable' using errcode = '42501';
end;
$$;

create trigger marketing_performance_snapshots_immutable
before update or delete on public.marketing_performance_snapshots
for each row execute function private.reject_marketing_performance_history_mutation();
create trigger marketing_performance_learnings_immutable
before update or delete on public.marketing_performance_learnings
for each row execute function private.reject_marketing_performance_history_mutation();
create trigger marketing_performance_learning_evidence_immutable
before update or delete on public.marketing_performance_learning_evidence
for each row execute function private.reject_marketing_performance_history_mutation();

create function public.register_marketing_published_content(
  p_organization_id uuid,
  p_internal_label text,
  p_published_at timestamptz,
  p_canonical_url text default null,
  p_platform_native_id text default null,
  p_source_reel_brief_version_id uuid default null,
  p_content_opportunity_type text default null,
  p_duration_seconds numeric default null
) returns public.marketing_published_content
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_record public.marketing_published_content%rowtype;
begin
  if v_actor is null or not private.marketing_performance_actor_writable(
    p_organization_id, v_actor
  ) then
    raise exception 'Performance mutation permission required' using errcode = '42501';
  end if;
  if p_source_reel_brief_version_id is not null and not exists (
    select 1 from public.marketing_reel_brief_versions as brief
    where brief.organization_id = p_organization_id
      and brief.id = p_source_reel_brief_version_id
  ) then
    raise exception 'Reel Brief version is not eligible' using errcode = '22023';
  end if;
  insert into public.marketing_published_content (
    organization_id, internal_label, published_at, canonical_url,
    platform_native_id, source_reel_brief_version_id,
    content_opportunity_type, duration_seconds, created_by, updated_by
  ) values (
    p_organization_id, btrim(p_internal_label), p_published_at,
    nullif(btrim(p_canonical_url), ''), nullif(btrim(p_platform_native_id), ''),
    p_source_reel_brief_version_id, p_content_opportunity_type,
    p_duration_seconds, v_actor, v_actor
  ) returning * into v_record;
  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor, 'MARKETING_RECORD_CREATED', 'MARKETING', v_record.id,
    jsonb_build_object('record_type', 'published content', 'title', v_record.internal_label)
  );
  return v_record;
end;
$$;

create function public.set_marketing_published_content_archived(
  p_organization_id uuid,
  p_content_id uuid,
  p_archived boolean
) returns public.marketing_published_content
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_record public.marketing_published_content%rowtype;
begin
  if v_actor is null or not private.marketing_performance_actor_writable(
    p_organization_id, v_actor
  ) then
    raise exception 'Performance mutation permission required' using errcode = '42501';
  end if;
  update public.marketing_published_content as content set
    archived_at = case when p_archived then coalesce(content.archived_at, now()) else null end,
    updated_at = now(), updated_by = v_actor
  where content.organization_id = p_organization_id and content.id = p_content_id
  returning * into v_record;
  if not found then
    raise exception 'Published content not found' using errcode = '22023';
  end if;
  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor,
    case when p_archived then 'MARKETING_RECORD_ARCHIVED'::public.activity_event_type
      else 'MARKETING_RECORD_RESTORED'::public.activity_event_type end,
    'MARKETING', v_record.id,
    jsonb_build_object('record_type', 'published content', 'title', v_record.internal_label)
  );
  return v_record;
end;
$$;

create function public.add_marketing_performance_snapshot(
  p_organization_id uuid,
  p_published_content_id uuid,
  p_observed_at timestamptz,
  p_views bigint default null,
  p_reach bigint default null,
  p_likes bigint default null,
  p_comments bigint default null,
  p_shares bigint default null,
  p_saves bigint default null,
  p_total_watch_time_seconds numeric default null,
  p_average_watch_time_seconds numeric default null,
  p_completion_rate numeric default null,
  p_profile_visits bigint default null,
  p_follows bigint default null,
  p_link_clicks bigint default null,
  p_notes text default null,
  p_source_label text default null
) returns public.marketing_performance_snapshots
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_published_at timestamptz;
  v_record public.marketing_performance_snapshots%rowtype;
begin
  if v_actor is null or not private.marketing_performance_actor_writable(
    p_organization_id, v_actor
  ) then
    raise exception 'Performance mutation permission required' using errcode = '42501';
  end if;
  select content.published_at into v_published_at
  from public.marketing_published_content as content
  where content.organization_id = p_organization_id
    and content.id = p_published_content_id
    and content.archived_at is null;
  if not found then
    raise exception 'Published content is not eligible' using errcode = '22023';
  end if;
  if p_observed_at < v_published_at then
    raise exception 'Observation cannot precede publication' using errcode = '22023';
  end if;
  insert into public.marketing_performance_snapshots (
    organization_id, published_content_id, observed_at, views, reach, likes,
    comments, shares, saves, total_watch_time_seconds,
    average_watch_time_seconds, completion_rate, profile_visits, follows,
    link_clicks, notes, source_label, entered_by
  ) values (
    p_organization_id, p_published_content_id, p_observed_at, p_views, p_reach,
    p_likes, p_comments, p_shares, p_saves, p_total_watch_time_seconds,
    p_average_watch_time_seconds, p_completion_rate, p_profile_visits, p_follows,
    p_link_clicks, nullif(btrim(p_notes), ''), nullif(btrim(p_source_label), ''),
    v_actor
  ) returning * into v_record;
  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, v_actor, 'MARKETING_RECORD_CREATED', 'MARKETING', v_record.id,
    jsonb_build_object('record_type', 'performance snapshot', 'content_id', p_published_content_id)
  );
  return v_record;
end;
$$;

create function public.create_marketing_performance_learning(
  p_organization_id uuid,
  p_actor_id uuid,
  p_platform public.marketing_performance_platform,
  p_content_type public.marketing_performance_content_type,
  p_horizon public.marketing_performance_horizon,
  p_metric public.marketing_performance_metric,
  p_subject_value text,
  p_summary text,
  p_caveats text[],
  p_evidence jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_learning_id uuid;
  v_generation_key text;
  v_baseline_count integer;
  v_segment_count integer;
  v_baseline numeric;
  v_segment numeric;
  v_strength public.marketing_performance_evidence_strength;
begin
  if not private.marketing_performance_actor_writable(p_organization_id, p_actor_id) then
    raise exception 'Performance mutation permission required' using errcode = '42501';
  end if;
  if p_metric <> 'SAVE_RATE_BY_REACH'
     or jsonb_typeof(p_evidence) <> 'array'
     or jsonb_array_length(p_evidence) > 100 then
    raise exception 'Performance learning input invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
    left join public.marketing_performance_snapshots as snapshot
      on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id
    left join public.marketing_published_content as content
      on content.organization_id = snapshot.organization_id
      and content.id = snapshot.published_content_id
    where snapshot.id is null or content.id is null
      or content.platform <> p_platform or content.content_type <> p_content_type
      or item.evidence_role not in ('BASELINE', 'SEGMENT')
      or snapshot.reach is null or snapshot.reach = 0 or snapshot.saves is null
      or case
        when snapshot.observed_at - content.published_at < interval '24 hours' then 'EARLY'
        when snapshot.observed_at - content.published_at < interval '72 hours' then 'SHORT_TERM'
        when snapshot.observed_at - content.published_at < interval '8 days' then 'SEVEN_DAY'
        else 'MATURE'
      end <> p_horizon::text
      or (item.evidence_role = 'SEGMENT' and content.content_opportunity_type is distinct from p_subject_value)
  ) then
    raise exception 'Performance learning evidence invalid' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text))
     <> (select count(distinct item.snapshot_id) from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)) then
    raise exception 'Performance learning evidence duplicated' using errcode = '22023';
  end if;

  select count(*) into v_baseline_count
  from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
  join public.marketing_performance_snapshots as snapshot
    on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id;

  with ordered as (
    select snapshot.saves::numeric / snapshot.reach::numeric as rate,
      row_number() over (order by snapshot.saves::numeric / snapshot.reach::numeric) as ordinal,
      count(*) over () as item_count
    from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
    join public.marketing_performance_snapshots as snapshot
      on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id
  )
  select avg(ordered.rate) into v_baseline from ordered
  where ordered.ordinal in ((ordered.item_count + 1) / 2, (ordered.item_count + 2) / 2);

  select count(*) into v_segment_count
  from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
  join public.marketing_performance_snapshots as snapshot
    on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id
  where item.evidence_role = 'SEGMENT';

  with ordered as (
    select snapshot.saves::numeric / snapshot.reach::numeric as rate,
      row_number() over (order by snapshot.saves::numeric / snapshot.reach::numeric) as ordinal,
      count(*) over () as item_count
    from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
    join public.marketing_performance_snapshots as snapshot
      on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id
    where item.evidence_role = 'SEGMENT'
  )
  select avg(ordered.rate) into v_segment from ordered
  where ordered.ordinal in ((ordered.item_count + 1) / 2, (ordered.item_count + 2) / 2);

  if v_baseline_count < 5 or v_segment_count < 3 then
    return null;
  end if;
  v_strength := case
    when v_segment_count >= 10 then 'STRONG'
    when v_segment_count >= 5 then 'MODERATE'
    else 'WEAK'
  end;
  select encode(extensions.digest(
    p_organization_id::text || ':' || p_platform::text || ':' || p_horizon::text
      || ':' || p_metric::text || ':' || p_subject_value || ':' ||
      (select string_agg(item.snapshot_id::text || ':' || item.evidence_role, ',' order by item.snapshot_id)
       from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)),
    'sha256'
  ), 'hex') into v_generation_key;

  insert into public.marketing_performance_learnings (
    organization_id, platform, content_type, observation_horizon, metric,
    comparison_dimension, subject_value, sample_count, baseline_sample_count,
    segment_value, baseline_value, difference, evidence_strength, summary,
    caveats, generation_key, created_by
  ) values (
    p_organization_id, p_platform, p_content_type, p_horizon, p_metric,
    'CONTENT_OPPORTUNITY_TYPE', p_subject_value, v_segment_count, v_baseline_count,
    v_segment, v_baseline, v_segment - v_baseline, v_strength, p_summary,
    p_caveats, v_generation_key, p_actor_id
  ) on conflict (organization_id, generation_key) do nothing
  returning id into v_learning_id;
  if v_learning_id is null then return null; end if;

  insert into public.marketing_performance_learning_evidence (
    organization_id, learning_id, published_content_id, snapshot_id,
    evidence_role, source_reel_brief_version_id
  )
  select p_organization_id, v_learning_id, snapshot.published_content_id,
    snapshot.id, item.evidence_role::public.marketing_performance_evidence_role,
    content.source_reel_brief_version_id
  from jsonb_to_recordset(p_evidence) as item(snapshot_id uuid, evidence_role text)
  join public.marketing_performance_snapshots as snapshot
    on snapshot.organization_id = p_organization_id and snapshot.id = item.snapshot_id
  join public.marketing_published_content as content
    on content.organization_id = snapshot.organization_id
    and content.id = snapshot.published_content_id;

  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, p_actor_id, 'MARKETING_RECORD_CREATED', 'MARKETING', v_learning_id,
    jsonb_build_object('record_type', 'performance learning', 'metric', p_metric)
  );
  return v_learning_id;
end;
$$;

revoke all on function private.marketing_performance_actor_writable(uuid, uuid),
  private.reject_marketing_performance_history_mutation(),
  public.register_marketing_published_content(uuid, text, timestamptz, text, text, uuid, text, numeric),
  public.set_marketing_published_content_archived(uuid, uuid, boolean),
  public.add_marketing_performance_snapshot(uuid, uuid, timestamptz, bigint, bigint, bigint, bigint, bigint, bigint, numeric, numeric, numeric, bigint, bigint, bigint, text, text),
  public.create_marketing_performance_learning(uuid, uuid, public.marketing_performance_platform, public.marketing_performance_content_type, public.marketing_performance_horizon, public.marketing_performance_metric, text, text, text[], jsonb)
from public, anon, authenticated;

grant execute on function
  public.register_marketing_published_content(uuid, text, timestamptz, text, text, uuid, text, numeric),
  public.set_marketing_published_content_archived(uuid, uuid, boolean),
  public.add_marketing_performance_snapshot(uuid, uuid, timestamptz, bigint, bigint, bigint, bigint, bigint, bigint, numeric, numeric, numeric, bigint, bigint, bigint, text, text)
to authenticated;
grant execute on function
  public.create_marketing_performance_learning(uuid, uuid, public.marketing_performance_platform, public.marketing_performance_content_type, public.marketing_performance_horizon, public.marketing_performance_metric, text, text, text[], jsonb)
to service_role;
