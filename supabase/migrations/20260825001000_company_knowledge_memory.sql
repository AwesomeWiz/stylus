create type public.memory_domain as enum ('company', 'marketing', 'agency');

create type public.memory_kind as enum (
  'FACT', 'DECISION', 'INSIGHT', 'PREFERENCE', 'NOTE'
);

create type public.memory_provenance as enum (
  'HUMAN', 'PLUGIN', 'IMPORTED', 'SYSTEM'
);

alter type public.activity_event_type add value if not exists 'MEMORY_CREATED';
alter type public.activity_event_type add value if not exists 'MEMORY_UPDATED';
alter type public.activity_event_type add value if not exists 'MEMORY_ARCHIVED';
alter type public.activity_event_type add value if not exists 'MEMORY_RESTORED';
alter type public.notification_entity_type add value if not exists 'KNOWLEDGE';

create table public.knowledge_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain public.memory_domain not null,
  kind public.memory_kind not null,
  title text not null constraint knowledge_memories_title_length
    check (char_length(btrim(title)) between 2 and 160),
  content text not null constraint knowledge_memories_content_length
    check (char_length(btrim(content)) between 1 and 10000),
  metadata jsonb not null default '{}'::jsonb,
  provenance public.memory_provenance not null,
  source_reference text,
  plugin_id text,
  effective_at timestamptz,
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  constraint knowledge_memories_metadata_valid check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 8192
  ),
  constraint knowledge_memories_source_reference_length check (
    source_reference is null
    or char_length(btrim(source_reference)) between 1 and 500
  ),
  constraint knowledge_memories_plugin_id_valid check (
    plugin_id is null
    or (
      plugin_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
      and char_length(plugin_id) between 2 and 50
    )
  ),
  constraint knowledge_memories_provenance_valid check (
    (provenance = 'HUMAN' and domain = 'company' and plugin_id is null and created_by is not null)
    or (provenance = 'PLUGIN' and plugin_id is not null)
    or (provenance in ('IMPORTED', 'SYSTEM') and plugin_id is null)
  ),
  constraint knowledge_memories_archive_valid check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  ),
  constraint knowledge_memories_created_by_membership_fkey
    foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint knowledge_memories_updated_by_membership_fkey
    foreign key (organization_id, updated_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  constraint knowledge_memories_archived_by_membership_fkey
    foreign key (organization_id, archived_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  unique (organization_id, id)
);

create index knowledge_memories_organization_domain_active_idx
on public.knowledge_memories(organization_id, domain, updated_at desc, id desc)
where archived_at is null;

create index knowledge_memories_organization_archive_idx
on public.knowledge_memories(organization_id, archived_at, updated_at desc, id desc);

create index knowledge_memories_search_idx
on public.knowledge_memories using gin(search_vector);

create trigger knowledge_memories_set_updated_at
before update on public.knowledge_memories
for each row execute function private.set_updated_at();

alter table public.knowledge_memories enable row level security;

create policy knowledge_memories_company_select_for_members
on public.knowledge_memories
for select
to authenticated
using (
  domain = 'company'
  and (select private.is_organization_member(organization_id))
);

revoke all on table public.knowledge_memories from public, anon, authenticated;
grant select (
  id, organization_id, domain, kind, title, content, metadata, provenance,
  source_reference, plugin_id, effective_at, created_by, updated_by,
  archived_at, archived_by, created_at, updated_at, search_vector
) on table public.knowledge_memories to authenticated;

comment on table public.knowledge_memories is
  'Explicit organization/domain-scoped durable memory. Canonical company profile fields remain in onboarding tables.';
