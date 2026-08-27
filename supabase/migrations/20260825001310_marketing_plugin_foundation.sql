create type public.marketing_reel_idea_status as enum ('IDEA', 'DRAFT', 'READY');
create type public.marketing_campaign_status as enum ('PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED');
create type public.marketing_research_category as enum ('CUSTOMER', 'COMPETITOR', 'TREND', 'CONTENT', 'OTHER');
create type public.marketing_brief_status as enum ('DRAFT', 'READY', 'APPROVED');

alter table public.competitors
  add constraint competitors_organization_id_id_unique unique (organization_id, id);

create function private.marketing_plugin_available(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_organization_member(p_organization_id)
    and exists (
      select 1 from public.organization_plugins as plugin
      where plugin.organization_id = p_organization_id
        and plugin.plugin_id = 'marketing' and plugin.enabled
    );
$$;

create function private.marketing_plugin_writable(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.marketing_plugin_available(p_organization_id)
    and private.has_organization_role(
      p_organization_id,
      array['OWNER', 'ADMIN', 'MEMBER']::public.organization_role[]
    );
$$;

create table public.marketing_competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  website_url text check (website_url is null or (char_length(website_url) <= 500 and website_url ~* '^https?://')),
  instagram_handle text check (instagram_handle is null or char_length(instagram_handle) <= 80),
  instagram_profile_url text check (instagram_profile_url is null or (char_length(instagram_profile_url) <= 500 and instagram_profile_url ~* '^https?://')),
  notes text check (notes is null or char_length(notes) <= 4000),
  core_competitor_id uuid,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, core_competitor_id) references public.competitors(organization_id, id) on delete restrict
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  objective text not null check (char_length(btrim(objective)) between 1 and 1000),
  notes text check (notes is null or char_length(notes) <= 4000),
  starts_on date, ends_on date,
  status public.marketing_campaign_status not null default 'PLANNING',
  created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (organization_id, id),
  check (starts_on is null or ends_on is null or ends_on >= starts_on),
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by) references public.memberships(organization_id, user_id) on delete restrict
);

create table public.marketing_reel_ideas (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  concept text check (concept is null or char_length(concept) <= 2000),
  hook text check (hook is null or char_length(hook) <= 1000),
  content_angle text check (content_angle is null or char_length(content_angle) <= 1000),
  call_to_action text check (call_to_action is null or char_length(call_to_action) <= 500),
  notes text check (notes is null or char_length(notes) <= 4000),
  status public.marketing_reel_idea_status not null default 'IDEA', campaign_id uuid,
  created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, campaign_id) references public.marketing_campaigns(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by) references public.memberships(organization_id, user_id) on delete restrict
);

create table public.marketing_research (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  content text not null check (char_length(btrim(content)) between 1 and 8000),
  source_label text check (source_label is null or char_length(source_label) <= 160),
  source_url text check (source_url is null or (char_length(source_url) <= 500 and source_url ~* '^https?://')),
  category public.marketing_research_category not null default 'OTHER',
  created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by) references public.memberships(organization_id, user_id) on delete restrict
);

create table public.marketing_creative_briefs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  objective text not null check (char_length(btrim(objective)) between 1 and 1200),
  target_audience text check (target_audience is null or char_length(target_audience) <= 1200),
  core_message text check (core_message is null or char_length(core_message) <= 1200),
  tone_direction text check (tone_direction is null or char_length(tone_direction) <= 1000),
  call_to_action text check (call_to_action is null or char_length(call_to_action) <= 500),
  visual_direction text check (visual_direction is null or char_length(visual_direction) <= 1500),
  notes text check (notes is null or char_length(notes) <= 4000),
  status public.marketing_brief_status not null default 'DRAFT', campaign_id uuid,
  created_by uuid not null, updated_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, campaign_id) references public.marketing_campaigns(organization_id, id) on delete restrict,
  foreign key (organization_id, created_by) references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, updated_by) references public.memberships(organization_id, user_id) on delete restrict
);

create function private.prepare_marketing_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.marketing_plugin_writable(new.organization_id) then
    raise exception 'Marketing mutation permission required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Marketing ownership fields are immutable' using errcode = '42501';
    end if;
    if old.archived_at is null and new.archived_at is not null then
      new.archived_at := now();
    elsif old.archived_at is not null and new.archived_at is not null then
      new.archived_at := old.archived_at;
    end if;
    new.updated_at := now(); new.updated_by := v_actor;
  else
    new.created_by := v_actor; new.updated_by := v_actor;
  end if;
  return new;
end;
$$;

create function private.record_marketing_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_event public.activity_event_type; v_title text;
begin
  v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'name', 'Marketing record');
  if tg_op = 'INSERT' then v_event := 'MARKETING_RECORD_CREATED';
  elsif old.archived_at is null and new.archived_at is not null then v_event := 'MARKETING_RECORD_ARCHIVED';
  elsif old.archived_at is not null and new.archived_at is null then v_event := 'MARKETING_RECORD_RESTORED';
  else v_event := 'MARKETING_RECORD_UPDATED'; end if;
  insert into public.activity_events (organization_id, actor_id, event_type, entity_type, entity_id, metadata)
  values (new.organization_id, auth.uid(), v_event, 'MARKETING', new.id,
    jsonb_build_object('record_type', tg_argv[0], 'title', left(v_title, 160)));
  return new;
end;
$$;

do $$ declare v_table text; v_kind text; begin
  for v_table, v_kind in values
    ('marketing_competitors','competitor'), ('marketing_campaigns','campaign'),
    ('marketing_reel_ideas','reel idea'), ('marketing_research','research note'),
    ('marketing_creative_briefs','creative brief')
  loop
    execute format('create trigger %I_prepare before insert or update on public.%I for each row execute function private.prepare_marketing_record()', v_table, v_table);
    execute format('create trigger %I_activity after insert or update on public.%I for each row execute function private.record_marketing_activity(%L)', v_table, v_table, v_kind);
    execute format('alter table public.%I enable row level security', v_table);
    execute format('create policy %I_select on public.%I for select to authenticated using (private.marketing_plugin_available(organization_id))', v_table, v_table);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (private.marketing_plugin_writable(organization_id))', v_table, v_table);
    execute format('create policy %I_update on public.%I for update to authenticated using (private.marketing_plugin_writable(organization_id)) with check (private.marketing_plugin_writable(organization_id))', v_table, v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant select, insert, update on table public.%I to authenticated', v_table);
  end loop;
end $$;

create index marketing_competitors_active_idx on public.marketing_competitors(organization_id, updated_at desc) where archived_at is null;
create index marketing_campaigns_active_idx on public.marketing_campaigns(organization_id, status, updated_at desc) where archived_at is null;
create index marketing_reel_ideas_active_idx on public.marketing_reel_ideas(organization_id, status, updated_at desc) where archived_at is null;
create index marketing_reel_ideas_campaign_idx on public.marketing_reel_ideas(organization_id, campaign_id) where campaign_id is not null;
create index marketing_research_active_idx on public.marketing_research(organization_id, updated_at desc) where archived_at is null;
create index marketing_briefs_active_idx on public.marketing_creative_briefs(organization_id, status, updated_at desc) where archived_at is null;
create index marketing_briefs_campaign_idx on public.marketing_creative_briefs(organization_id, campaign_id) where campaign_id is not null;

revoke all on function private.marketing_plugin_available(uuid), private.marketing_plugin_writable(uuid), private.prepare_marketing_record(), private.record_marketing_activity() from public, anon, authenticated;
grant execute on function private.marketing_plugin_available(uuid), private.marketing_plugin_writable(uuid) to authenticated;
