create type public.marketing_ask_council_message_role as enum ('USER', 'ASSISTANT');
create type public.marketing_ask_council_turn_status as enum (
  'PENDING', 'SUCCEEDED', 'FAILED'
);

create table public.marketing_ask_council_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  workflow_version text not null default 'marketing-ask-council-v1'
    check (workflow_version = 'marketing-ask-council-v1'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict
);

create index marketing_ask_council_conversations_history_idx
on public.marketing_ask_council_conversations(
  organization_id, archived_at, updated_at desc, id desc
);

create table public.marketing_ask_council_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  role public.marketing_ask_council_message_role not null,
  content text not null check (
    char_length(btrim(content)) between 1 and
      case when role = 'USER' then 2000 else 6000 end
  ),
  structured_output jsonb check (
    structured_output is null or (
      jsonb_typeof(structured_output) = 'object'
      and pg_column_size(structured_output) <= 32768
    )
  ),
  authored_by uuid,
  ai_run_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, conversation_id)
    references public.marketing_ask_council_conversations(organization_id, id)
    on delete restrict,
  foreign key (organization_id, authored_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, ai_run_id)
    references public.ai_runs(organization_id, id) on delete restrict,
  check (
    (role = 'USER' and authored_by is not null and ai_run_id is null and structured_output is null)
    or
    (role = 'ASSISTANT' and authored_by is null and ai_run_id is not null and structured_output is not null)
  )
);

create index marketing_ask_council_messages_thread_idx
on public.marketing_ask_council_messages(
  organization_id, conversation_id, created_at, id
);

create table public.marketing_ask_council_turns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  user_message_id uuid not null,
  assistant_message_id uuid,
  idempotency_key uuid not null,
  intent text not null check (intent in (
    'AUDIENCE', 'CONTENT_IDEA', 'HOOK', 'SCRIPT', 'BRAND', 'PERFORMANCE',
    'RESEARCH_EVIDENCE', 'TREND', 'COMPETITOR', 'RETENTION', 'VISUAL',
    'GENERAL_MARKETING'
  )),
  selected_specialists text[] not null check (
    cardinality(selected_specialists) between 1 and 3
    and selected_specialists <@ array[
      'marketing.audience-researcher', 'marketing.hook-strategist',
      'marketing.script-writer', 'marketing.brand-director',
      'marketing.retention-editor', 'marketing.visual-director',
      'marketing.competitor-analyst', 'marketing.trend-researcher',
      'marketing.content-strategist', 'marketing.creative-critic'
    ]::text[]
  ),
  routing_version text not null check (
    routing_version = 'marketing-ask-council-routing-v1'
  ),
  context_version text not null check (
    context_version = 'marketing-ask-council-context-v1'
  ),
  workflow_version text not null check (
    workflow_version = 'marketing-ask-council-v1'
  ),
  schema_version text not null check (
    schema_version = 'marketing-ask-council-answer-v1'
  ),
  context_snapshot jsonb not null check (
    jsonb_typeof(context_snapshot) = 'object'
    and pg_column_size(context_snapshot) <= 65536
  ),
  status public.marketing_ask_council_turn_status not null default 'PENDING',
  failed_specialist_id text,
  failure_category public.ai_error_category,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, created_by, idempotency_key),
  unique (conversation_id, user_message_id),
  foreign key (organization_id, conversation_id)
    references public.marketing_ask_council_conversations(organization_id, id)
    on delete restrict,
  foreign key (organization_id, user_message_id)
    references public.marketing_ask_council_messages(organization_id, id)
    on delete restrict,
  foreign key (organization_id, assistant_message_id)
    references public.marketing_ask_council_messages(organization_id, id)
    on delete restrict,
  foreign key (organization_id, created_by)
    references public.memberships(organization_id, user_id) on delete restrict,
  check (
    (status = 'PENDING' and assistant_message_id is null and completed_at is null
      and failure_category is null and failed_specialist_id is null)
    or
    (status = 'SUCCEEDED' and assistant_message_id is not null and completed_at is not null
      and failure_category is null and failed_specialist_id is null)
    or
    (status = 'FAILED' and assistant_message_id is null and completed_at is not null
      and failure_category is not null)
  )
);

create unique index marketing_ask_council_one_pending_turn_idx
on public.marketing_ask_council_turns(organization_id, conversation_id)
where status = 'PENDING';
create index marketing_ask_council_turn_history_idx
on public.marketing_ask_council_turns(
  organization_id, conversation_id, created_at desc, id desc
);

create table public.marketing_ask_council_specialist_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  turn_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 3),
  specialist_id text not null,
  ai_run_id uuid not null,
  structured_output jsonb not null check (
    jsonb_typeof(structured_output) = 'object'
    and pg_column_size(structured_output) <= 24576
  ),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (turn_id, ordinal),
  unique (turn_id, specialist_id),
  foreign key (organization_id, turn_id)
    references public.marketing_ask_council_turns(organization_id, id)
    on delete restrict,
  foreign key (organization_id, ai_run_id)
    references public.ai_runs(organization_id, id) on delete restrict
);

create table public.marketing_ask_council_context_refs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  turn_id uuid not null,
  reference_type text not null check (reference_type in (
    'RESEARCH_REPORT', 'RESEARCH_EVIDENCE', 'PERFORMANCE_LEARNING',
    'REEL_BRIEF', 'STRATEGIC_REVIEW'
  )),
  model_reference_id text not null check (
    model_reference_id ~ '^(RESEARCH|EVID|PERF|BRIEF|REVIEW)-[1-9][0-9]*$'
  ),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  research_report_id uuid,
  research_evidence_id uuid,
  performance_learning_id uuid,
  reel_brief_version_id uuid,
  strategic_review_id uuid,
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object' and pg_column_size(snapshot) <= 16384
  ),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (turn_id, model_reference_id),
  foreign key (organization_id, turn_id)
    references public.marketing_ask_council_turns(organization_id, id)
    on delete restrict,
  foreign key (organization_id, research_report_id)
    references public.marketing_external_research_reports(organization_id, id)
    on delete restrict,
  foreign key (organization_id, research_evidence_id)
    references public.marketing_external_research_evidence(organization_id, id)
    on delete restrict,
  foreign key (organization_id, performance_learning_id)
    references public.marketing_performance_learnings(organization_id, id)
    on delete restrict,
  foreign key (organization_id, reel_brief_version_id)
    references public.marketing_reel_brief_versions(organization_id, id)
    on delete restrict,
  foreign key (organization_id, strategic_review_id)
    references public.marketing_strategic_council_review_versions(organization_id, id)
    on delete restrict,
  check (num_nonnulls(
    research_report_id, research_evidence_id, performance_learning_id,
    reel_brief_version_id, strategic_review_id
  ) = 1),
  check (
    (reference_type = 'RESEARCH_REPORT' and research_report_id is not null)
    or (reference_type = 'RESEARCH_EVIDENCE' and research_evidence_id is not null)
    or (reference_type = 'PERFORMANCE_LEARNING' and performance_learning_id is not null)
    or (reference_type = 'REEL_BRIEF' and reel_brief_version_id is not null)
    or (reference_type = 'STRATEGIC_REVIEW' and strategic_review_id is not null)
  )
);

alter table public.marketing_ask_council_conversations enable row level security;
alter table public.marketing_ask_council_messages enable row level security;
alter table public.marketing_ask_council_turns enable row level security;
alter table public.marketing_ask_council_specialist_results enable row level security;
alter table public.marketing_ask_council_context_refs enable row level security;

create policy marketing_ask_council_conversations_select
on public.marketing_ask_council_conversations for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_ask_council_messages_select
on public.marketing_ask_council_messages for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_ask_council_turns_select
on public.marketing_ask_council_turns for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_ask_council_specialist_results_select
on public.marketing_ask_council_specialist_results for select to authenticated
using (private.marketing_plugin_available(organization_id));
create policy marketing_ask_council_context_refs_select
on public.marketing_ask_council_context_refs for select to authenticated
using (private.marketing_plugin_available(organization_id));

revoke all on public.marketing_ask_council_conversations,
  public.marketing_ask_council_messages,
  public.marketing_ask_council_turns,
  public.marketing_ask_council_specialist_results,
  public.marketing_ask_council_context_refs from public, anon, authenticated;
grant select on public.marketing_ask_council_conversations,
  public.marketing_ask_council_messages,
  public.marketing_ask_council_turns,
  public.marketing_ask_council_specialist_results,
  public.marketing_ask_council_context_refs to authenticated;

create function private.reject_marketing_ask_council_history_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Ask Council history is immutable' using errcode = '42501';
end;
$$;

create trigger marketing_ask_council_messages_immutable
before update or delete on public.marketing_ask_council_messages
for each row execute function private.reject_marketing_ask_council_history_mutation();
create trigger marketing_ask_council_specialist_results_immutable
before update or delete on public.marketing_ask_council_specialist_results
for each row execute function private.reject_marketing_ask_council_history_mutation();
create trigger marketing_ask_council_context_refs_immutable
before update or delete on public.marketing_ask_council_context_refs
for each row execute function private.reject_marketing_ask_council_history_mutation();

create function private.protect_marketing_ask_council_turn_provenance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE'
     or new.organization_id is distinct from old.organization_id
     or new.conversation_id is distinct from old.conversation_id
     or new.user_message_id is distinct from old.user_message_id
     or new.idempotency_key is distinct from old.idempotency_key
     or new.intent is distinct from old.intent
     or new.selected_specialists is distinct from old.selected_specialists
     or new.routing_version is distinct from old.routing_version
     or new.context_version is distinct from old.context_version
     or new.workflow_version is distinct from old.workflow_version
     or new.schema_version is distinct from old.schema_version
     or new.context_snapshot is distinct from old.context_snapshot
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Ask Council turn provenance is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger marketing_ask_council_turn_provenance_immutable
before update or delete on public.marketing_ask_council_turns
for each row execute function private.protect_marketing_ask_council_turn_provenance();

create function private.marketing_ask_council_executable(
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

create function private.assert_marketing_ask_council_ai_run(
  p_organization_id uuid,
  p_actor_id uuid,
  p_ai_run_id uuid,
  p_require_success boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.ai_runs as ai
    where ai.organization_id = p_organization_id
      and ai.id = p_ai_run_id
      and ai.actor_id = p_actor_id
      and ai.plugin_id = 'marketing'
      and ai.capability = 'marketing.ask-council.execute'
      and ai.operation = 'generate_structured'
      and ai.requested_tier = 'BALANCED'
      and (
        (p_require_success and ai.status = 'SUCCEEDED')
        or (not p_require_success and ai.status in (
          'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'
        ))
      )
  ) then
    raise exception 'Ask Council AI run provenance invalid' using errcode = '22023';
  end if;
end;
$$;

create function public.start_marketing_ask_council_turn(
  p_organization_id uuid,
  p_actor_id uuid,
  p_conversation_id uuid,
  p_idempotency_key uuid,
  p_question text,
  p_intent text,
  p_selected_specialists text[],
  p_context_snapshot jsonb,
  p_context_refs jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_conversation public.marketing_ask_council_conversations%rowtype;
  v_turn public.marketing_ask_council_turns%rowtype;
  v_message_id uuid;
  v_ref jsonb;
begin
  if not private.marketing_ask_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Ask Council execution denied' using errcode = '42501';
  end if;
  if char_length(btrim(p_question)) not between 3 and 2000
     or p_intent not in (
       'AUDIENCE', 'CONTENT_IDEA', 'HOOK', 'SCRIPT', 'BRAND', 'PERFORMANCE',
       'RESEARCH_EVIDENCE', 'TREND', 'COMPETITOR', 'RETENTION', 'VISUAL',
       'GENERAL_MARKETING'
     )
     or cardinality(p_selected_specialists) not between 1 and 3
     or jsonb_typeof(p_context_snapshot) <> 'object'
     or pg_column_size(p_context_snapshot) > 65536
     or jsonb_typeof(p_context_refs) <> 'array'
     or jsonb_array_length(p_context_refs) > 15 then
    raise exception 'Ask Council request invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_actor_id::text || ':' || p_idempotency_key::text,
    2000
  ));
  select * into v_turn
  from public.marketing_ask_council_turns as turn_record
  where turn_record.organization_id = p_organization_id
    and turn_record.created_by = p_actor_id
    and turn_record.idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'conversationId', v_turn.conversation_id,
      'shouldExecute', false,
      'status', v_turn.status,
      'turnId', v_turn.id,
      'userMessageId', v_turn.user_message_id
    );
  end if;

  if p_conversation_id is null then
    insert into public.marketing_ask_council_conversations (
      organization_id, title, created_by
    ) values (
      p_organization_id, left(btrim(p_question), 160), p_actor_id
    ) returning * into v_conversation;
    insert into public.activity_events (
      organization_id, actor_id, event_type, entity_type, entity_id, metadata
    ) values (
      p_organization_id, p_actor_id, 'MARKETING_RECORD_CREATED', 'MARKETING',
      v_conversation.id,
      jsonb_build_object('record_type', 'Ask Council conversation', 'title', v_conversation.title)
    );
  else
    select * into v_conversation
    from public.marketing_ask_council_conversations as conversation
    where conversation.organization_id = p_organization_id
      and conversation.id = p_conversation_id
      and conversation.archived_at is null
    for update;
    if not found then
      raise exception 'Ask Council conversation unavailable' using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1 from public.marketing_ask_council_turns as pending
    where pending.organization_id = p_organization_id
      and pending.conversation_id = v_conversation.id
      and pending.status = 'PENDING'
  ) then
    raise exception 'Ask Council conversation is busy' using errcode = '55000';
  end if;

  insert into public.marketing_ask_council_messages (
    organization_id, conversation_id, role, content, authored_by
  ) values (
    p_organization_id, v_conversation.id, 'USER', btrim(p_question), p_actor_id
  ) returning id into v_message_id;

  insert into public.marketing_ask_council_turns (
    organization_id, conversation_id, user_message_id, idempotency_key,
    intent, selected_specialists, routing_version, context_version,
    workflow_version, schema_version, context_snapshot, created_by
  ) values (
    p_organization_id, v_conversation.id, v_message_id, p_idempotency_key,
    p_intent, p_selected_specialists, 'marketing-ask-council-routing-v1',
    'marketing-ask-council-context-v1', 'marketing-ask-council-v1',
    'marketing-ask-council-answer-v1', p_context_snapshot, p_actor_id
  ) returning * into v_turn;

  for v_ref in select value from jsonb_array_elements(p_context_refs)
  loop
    insert into public.marketing_ask_council_context_refs (
      organization_id, turn_id, reference_type, model_reference_id, label,
      research_report_id, research_evidence_id, performance_learning_id,
      reel_brief_version_id, strategic_review_id, snapshot
    ) values (
      p_organization_id, v_turn.id, v_ref->>'referenceType',
      v_ref->>'modelReferenceId', v_ref->>'label',
      nullif(v_ref->>'researchReportId', '')::uuid,
      nullif(v_ref->>'researchEvidenceId', '')::uuid,
      nullif(v_ref->>'performanceLearningId', '')::uuid,
      nullif(v_ref->>'reelBriefVersionId', '')::uuid,
      nullif(v_ref->>'strategicReviewId', '')::uuid,
      v_ref->'snapshot'
    );
  end loop;

  update public.marketing_ask_council_conversations
  set updated_at = now()
  where organization_id = p_organization_id and id = v_conversation.id;

  return jsonb_build_object(
    'conversationId', v_conversation.id,
    'shouldExecute', true,
    'status', v_turn.status,
    'turnId', v_turn.id,
    'userMessageId', v_message_id
  );
end;
$$;

create function public.record_marketing_ask_council_specialist(
  p_organization_id uuid,
  p_actor_id uuid,
  p_turn_id uuid,
  p_ordinal smallint,
  p_specialist_id text,
  p_ai_run_id uuid,
  p_structured_output jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v_turn public.marketing_ask_council_turns%rowtype;
begin
  if p_ordinal not between 1 and 3
     or jsonb_typeof(p_structured_output) <> 'object'
     or pg_column_size(p_structured_output) > 24576 then
    raise exception 'Ask Council specialist result invalid' using errcode = '22023';
  end if;
  if not private.marketing_ask_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Ask Council execution denied' using errcode = '42501';
  end if;
  select * into v_turn from public.marketing_ask_council_turns as turn_record
  where turn_record.organization_id = p_organization_id
    and turn_record.id = p_turn_id
    and turn_record.created_by = p_actor_id
    and turn_record.status = 'PENDING'
  for update;
  if not found
     or v_turn.selected_specialists[p_ordinal] is distinct from p_specialist_id
     or (select count(*) from public.marketing_ask_council_specialist_results as result
         where result.turn_id = p_turn_id) <> p_ordinal - 1 then
    raise exception 'Ask Council specialist transition invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_ask_council_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, true
  );
  insert into public.marketing_ask_council_specialist_results (
    organization_id, turn_id, ordinal, specialist_id, ai_run_id, structured_output
  ) values (
    p_organization_id, p_turn_id, p_ordinal, p_specialist_id,
    p_ai_run_id, p_structured_output
  );
end;
$$;

create function public.complete_marketing_ask_council_turn(
  p_organization_id uuid,
  p_actor_id uuid,
  p_turn_id uuid,
  p_ai_run_id uuid,
  p_answer jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_turn public.marketing_ask_council_turns%rowtype;
  v_message_id uuid;
begin
  if jsonb_typeof(p_answer) <> 'object' or pg_column_size(p_answer) > 32768
     or char_length(btrim(p_answer->>'answer')) not between 1 and 2500 then
    raise exception 'Ask Council answer invalid' using errcode = '22023';
  end if;
  if not private.marketing_ask_council_executable(p_organization_id, p_actor_id) then
    raise exception 'Ask Council execution denied' using errcode = '42501';
  end if;
  select * into v_turn from public.marketing_ask_council_turns as turn_record
  where turn_record.organization_id = p_organization_id
    and turn_record.id = p_turn_id
    and turn_record.created_by = p_actor_id
    and turn_record.status = 'PENDING'
  for update;
  if not found or (
    select count(*) from public.marketing_ask_council_specialist_results as result
    where result.turn_id = p_turn_id
  ) <> cardinality(v_turn.selected_specialists) then
    raise exception 'Ask Council completion invalid' using errcode = '22023';
  end if;
  perform private.assert_marketing_ask_council_ai_run(
    p_organization_id, p_actor_id, p_ai_run_id, true
  );
  insert into public.marketing_ask_council_messages (
    organization_id, conversation_id, role, content, structured_output, ai_run_id
  ) values (
    p_organization_id, v_turn.conversation_id, 'ASSISTANT', p_answer->>'answer',
    p_answer, p_ai_run_id
  ) returning id into v_message_id;
  update public.marketing_ask_council_turns
  set status = 'SUCCEEDED', assistant_message_id = v_message_id, completed_at = now()
  where organization_id = p_organization_id and id = p_turn_id;
  update public.marketing_ask_council_conversations
  set updated_at = now()
  where organization_id = p_organization_id and id = v_turn.conversation_id;
  insert into public.activity_events (
    organization_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_organization_id, p_actor_id, 'MARKETING_RECORD_UPDATED', 'MARKETING',
    v_turn.conversation_id,
    jsonb_build_object('record_type', 'Ask Council conversation', 'action', 'response completed')
  );
  return jsonb_build_object(
    'assistantMessageId', v_message_id,
    'conversationId', v_turn.conversation_id,
    'turnId', p_turn_id
  );
end;
$$;

create function public.fail_marketing_ask_council_turn(
  p_organization_id uuid,
  p_actor_id uuid,
  p_turn_id uuid,
  p_failure_category public.ai_error_category,
  p_failed_specialist_id text default null,
  p_ai_run_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.marketing_ask_council_turns as turn_record
  where turn_record.organization_id = p_organization_id
    and turn_record.id = p_turn_id
    and turn_record.created_by = p_actor_id
    and turn_record.status = 'PENDING'
  for update;
  if not found then return; end if;
  if p_ai_run_id is not null then
    perform private.assert_marketing_ask_council_ai_run(
      p_organization_id, p_actor_id, p_ai_run_id, false
    );
  end if;
  update public.marketing_ask_council_turns
  set status = 'FAILED', failed_specialist_id = p_failed_specialist_id,
      failure_category = p_failure_category, completed_at = now()
  where organization_id = p_organization_id and id = p_turn_id;
end;
$$;

create function public.set_marketing_ask_council_conversation_archived(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_archived boolean
) returns public.marketing_ask_council_conversations
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_conversation public.marketing_ask_council_conversations%rowtype;
begin
  if v_actor is null or not private.marketing_ask_council_executable(
    p_organization_id, v_actor
  ) then
    raise exception 'Ask Council archive denied' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.marketing_ask_council_turns as turn_record
    where turn_record.organization_id = p_organization_id
      and turn_record.conversation_id = p_conversation_id
      and turn_record.status = 'PENDING'
  ) then
    raise exception 'Ask Council conversation is busy' using errcode = '55000';
  end if;
  update public.marketing_ask_council_conversations
  set archived_at = case when p_archived then now() else null end,
      updated_at = now()
  where organization_id = p_organization_id and id = p_conversation_id
  returning * into v_conversation;
  if not found then
    raise exception 'Ask Council conversation unavailable' using errcode = '22023';
  end if;
  return v_conversation;
end;
$$;

revoke all on function private.reject_marketing_ask_council_history_mutation(),
  private.protect_marketing_ask_council_turn_provenance(),
  private.marketing_ask_council_executable(uuid, uuid),
  private.assert_marketing_ask_council_ai_run(uuid, uuid, uuid, boolean),
  public.start_marketing_ask_council_turn(uuid, uuid, uuid, uuid, text, text, text[], jsonb, jsonb),
  public.record_marketing_ask_council_specialist(uuid, uuid, uuid, smallint, text, uuid, jsonb),
  public.complete_marketing_ask_council_turn(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_ask_council_turn(uuid, uuid, uuid, public.ai_error_category, text, uuid),
  public.set_marketing_ask_council_conversation_archived(uuid, uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.start_marketing_ask_council_turn(uuid, uuid, uuid, uuid, text, text, text[], jsonb, jsonb),
  public.record_marketing_ask_council_specialist(uuid, uuid, uuid, smallint, text, uuid, jsonb),
  public.complete_marketing_ask_council_turn(uuid, uuid, uuid, uuid, jsonb),
  public.fail_marketing_ask_council_turn(uuid, uuid, uuid, public.ai_error_category, text, uuid)
to service_role;
grant execute on function
  public.set_marketing_ask_council_conversation_archived(uuid, uuid, boolean)
to authenticated;
