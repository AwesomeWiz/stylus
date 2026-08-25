create type public.company_stage as enum (
  'IDEA', 'VALIDATION', 'PRE_PRODUCT', 'MVP', 'BETA', 'LAUNCHED', 'GROWTH'
);

create type public.product_status as enum (
  'CONCEPT', 'RESEARCHING', 'DESIGNING', 'BUILDING', 'TESTING', 'AVAILABLE'
);

create type public.brand_status as enum ('UNDECIDED', 'EXPLORING', 'DEFINED');

create type public.marketing_objective as enum (
  'AWARENESS', 'TRUST', 'AUTHORITY', 'AUDIENCE_GROWTH', 'COMMUNITY',
  'WAITLIST', 'PRODUCT_EDUCATION', 'VALIDATION', 'FUTURE_DEMAND'
);

create type public.marketing_stage as enum (
  'NOT_STARTED', 'EXPERIMENTING', 'BUILDING_AUDIENCE', 'CONSISTENT', 'SCALING'
);

create type public.competitor_type as enum (
  'DIRECT', 'INDIRECT', 'ALTERNATIVE', 'INSPIRATION'
);

create table public.company_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  company_name text not null constraint company_profiles_name_length
    check (char_length(btrim(company_name)) between 2 and 80),
  short_description text not null constraint company_profiles_description_length
    check (char_length(btrim(short_description)) between 10 and 300),
  industry text not null constraint company_profiles_industry_length
    check (char_length(btrim(industry)) between 2 and 80),
  stage public.company_stage not null,
  primary_market text,
  website text,
  instagram text,
  problem_statement text,
  affected_audience text,
  problem_importance text,
  current_alternatives text[] not null default '{}',
  startup_idea text,
  core_insight text,
  product_concept text,
  value_proposition text,
  core_capabilities text[] not null default '{}',
  differentiators text[] not null default '{}',
  product_status public.product_status,
  near_term_objective text,
  positioning_category text,
  status_quo text,
  positioning_difference text,
  desired_perception text,
  key_promise text,
  reasons_to_believe text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audience_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null constraint audience_profiles_name_length
    check (char_length(btrim(name)) between 2 and 80),
  description text not null constraint audience_profiles_description_length
    check (char_length(btrim(description)) between 10 and 500),
  characteristics text[] not null default '{}',
  pain_points text[] not null default '{}',
  goals text[] not null default '{}',
  motivations text[] not null default '{}',
  objections text[] not null default '{}',
  attention_channels text[] not null default '{}',
  is_primary boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index audience_profiles_one_primary_per_organization_idx
on public.audience_profiles(organization_id) where is_primary;
create index audience_profiles_organization_id_idx
on public.audience_profiles(organization_id);

create table public.brand_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status public.brand_status not null default 'UNDECIDED',
  personality_traits text[] not null default '{}',
  tone_of_voice text[] not null default '{}',
  desired_emotions text[] not null default '{}',
  communication_traits text[] not null default '{}',
  emphasize text[] not null default '{}',
  avoid text[] not null default '{}',
  visual_direction text,
  primary_colors text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  primary_objective public.marketing_objective not null,
  secondary_objectives public.marketing_objective[] not null default '{}',
  primary_channels text[] not null default '{}',
  content_focus text[] not null default '{}',
  desired_audience_action text,
  stage public.marketing_stage not null default 'NOT_STARTED',
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null constraint competitors_name_length
    check (char_length(btrim(name)) between 2 and 120),
  website text,
  instagram text,
  short_description text,
  relevance text,
  type public.competitor_type not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competitors_active_organization_id_idx
on public.competitors(organization_id) where archived_at is null;

create table public.onboarding_progress (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  current_step smallint not null default 1 constraint onboarding_progress_step_range
    check (current_step between 1 and 8),
  completed_at timestamptz,
  started_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.company_profiles is
  'Authoritative structured company, problem, product and positioning source data.';
comment on table public.audience_profiles is
  'Organization audience segments. Onboarding establishes one primary segment.';
comment on table public.onboarding_progress is
  'Durable progress through the eight-step company onboarding flow.';

create function private.enforce_onboarding_record_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Organization ownership cannot be reassigned' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'Record creator cannot be reassigned' using errcode = '42501';
  end if;
  if (select auth.uid()) is not null and new.updated_by is distinct from (select auth.uid()) then
    raise exception 'Updater must match authenticated user' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (select auth.uid()) is not null
    and new.created_by is distinct from (select auth.uid()) then
    raise exception 'Creator must match authenticated user' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function private.enforce_onboarding_progress_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Organization ownership cannot be reassigned' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.started_by is distinct from old.started_by then
    raise exception 'Onboarding starter cannot be reassigned' using errcode = '42501';
  end if;
  if (select auth.uid()) is not null and new.updated_by is distinct from (select auth.uid()) then
    raise exception 'Updater must match authenticated user' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (select auth.uid()) is not null
    and new.started_by is distinct from (select auth.uid()) then
    raise exception 'Onboarding starter must match authenticated user' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger company_profiles_prevent_organization_reassignment
before insert or update on public.company_profiles
for each row execute function private.enforce_onboarding_record_scope();
create trigger audience_profiles_prevent_organization_reassignment
before insert or update on public.audience_profiles
for each row execute function private.enforce_onboarding_record_scope();
create trigger brand_profiles_prevent_organization_reassignment
before insert or update on public.brand_profiles
for each row execute function private.enforce_onboarding_record_scope();
create trigger marketing_profiles_prevent_organization_reassignment
before insert or update on public.marketing_profiles
for each row execute function private.enforce_onboarding_record_scope();
create trigger competitors_prevent_organization_reassignment
before insert or update on public.competitors
for each row execute function private.enforce_onboarding_record_scope();
create trigger onboarding_progress_prevent_organization_reassignment
before insert or update on public.onboarding_progress
for each row execute function private.enforce_onboarding_progress_scope();

create trigger company_profiles_set_updated_at before update on public.company_profiles
for each row execute function private.set_updated_at();
create trigger audience_profiles_set_updated_at before update on public.audience_profiles
for each row execute function private.set_updated_at();
create trigger brand_profiles_set_updated_at before update on public.brand_profiles
for each row execute function private.set_updated_at();
create trigger marketing_profiles_set_updated_at before update on public.marketing_profiles
for each row execute function private.set_updated_at();
create trigger competitors_set_updated_at before update on public.competitors
for each row execute function private.set_updated_at();
create trigger onboarding_progress_set_updated_at before update on public.onboarding_progress
for each row execute function private.set_updated_at();

alter table public.company_profiles enable row level security;
alter table public.audience_profiles enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.marketing_profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.onboarding_progress enable row level security;

revoke all on table public.company_profiles from anon, authenticated;
revoke all on table public.audience_profiles from anon, authenticated;
revoke all on table public.brand_profiles from anon, authenticated;
revoke all on table public.marketing_profiles from anon, authenticated;
revoke all on table public.competitors from anon, authenticated;
revoke all on table public.onboarding_progress from anon, authenticated;

grant select, insert, update on table public.company_profiles to authenticated;
grant select, insert, update on table public.audience_profiles to authenticated;
grant select, insert, update on table public.brand_profiles to authenticated;
grant select, insert, update on table public.marketing_profiles to authenticated;
grant select, insert, update on table public.competitors to authenticated;
grant select, insert, update on table public.onboarding_progress to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'company_profiles', 'audience_profiles', 'brand_profiles',
    'marketing_profiles', 'competitors', 'onboarding_progress'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_organization_member(organization_id)))',
      target_table || '_select_for_members', target_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.has_organization_role(organization_id, array[''OWNER'', ''ADMIN'']::public.organization_role[])))',
      target_table || '_insert_for_managers', target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.has_organization_role(organization_id, array[''OWNER'', ''ADMIN'']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array[''OWNER'', ''ADMIN'']::public.organization_role[])))',
      target_table || '_update_for_managers', target_table
    );
  end loop;
end;
$$;
