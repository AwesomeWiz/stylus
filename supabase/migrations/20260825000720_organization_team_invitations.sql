create type public.organization_invitation_status as enum (
  'PENDING', 'ACCEPTED', 'REVOKED'
);

create extension if not exists pgcrypto with schema extensions;

alter table public.memberships add column removed_at timestamptz;
create index memberships_active_user_idx on public.memberships(user_id, organization_id)
where removed_at is null;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.removed_at is null
  );
$$;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = any(allowed_roles)
      and membership.removed_at is null
  );
$$;

create or replace function public.list_organization_task_members(p_organization_id uuid)
returns table (member_user_id uuid, display_name text, role public.organization_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_member(p_organization_id)) then
    raise exception 'Organization membership required' using errcode = '42501';
  end if;
  return query
  select membership.user_id,
    coalesce(nullif(btrim(authenticated_user.raw_user_meta_data ->> 'full_name'), ''), 'Teammate'),
    membership.role
  from public.memberships as membership
  join auth.users as authenticated_user on authenticated_user.id = membership.user_id
  where membership.organization_id = p_organization_id and membership.removed_at is null
  order by case membership.role when 'OWNER' then 1 when 'ADMIN' then 2 when 'MEMBER' then 3 else 4 end,
    2, membership.user_id;
end;
$$;

create function private.enforce_active_board_mention_recipient()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.mentioned_user_id
      and membership.removed_at is null
  ) then
    raise exception 'Mentioned user must be an active organization member'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger board_comment_mentions_require_active_member
before insert on public.board_comment_mentions
for each row execute function private.enforce_active_board_mention_recipient();

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null,
  token_hash bytea not null unique,
  status public.organization_invitation_status not null default 'PENDING',
  invited_by uuid not null,
  accepted_by uuid,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_email_valid check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  constraint organization_invitations_role_valid check (role in ('MEMBER', 'VIEWER')),
  constraint organization_invitations_inviter_fkey foreign key (invited_by)
    references auth.users(id) on delete restrict,
  constraint organization_invitations_acceptor_fkey foreign key (accepted_by)
    references auth.users(id) on delete restrict,
  constraint organization_invitations_state_valid check (
    (status = 'PENDING' and accepted_by is null and accepted_at is null and revoked_at is null)
    or (status = 'ACCEPTED' and accepted_by is not null and accepted_at is not null and revoked_at is null)
    or (status = 'REVOKED' and accepted_by is null and accepted_at is null and revoked_at is not null)
  )
);

create unique index organization_invitations_active_email_key
on public.organization_invitations(organization_id, email)
where status = 'PENDING';
create index organization_invitations_organization_created_idx
on public.organization_invitations(organization_id, created_at desc);

create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row execute function private.set_updated_at();

create function public.list_organization_team(p_organization_id uuid)
returns table (
  member_user_id uuid,
  email text,
  display_name text,
  role public.organization_role,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select membership.user_id,
    authenticated_user.email::text,
    coalesce(
      nullif(btrim(authenticated_user.raw_user_meta_data ->> 'full_name'), ''),
      split_part(authenticated_user.email, '@', 1),
      'Stylus user'
    ),
    membership.role,
    membership.created_at
  from public.memberships as membership
  join auth.users as authenticated_user on authenticated_user.id = membership.user_id
  where membership.organization_id = p_organization_id
    and membership.removed_at is null
    and (select private.is_organization_member(p_organization_id))
  order by membership.created_at, membership.user_id;
$$;

create function public.list_organization_invitations(p_organization_id uuid)
returns table (
  id uuid,
  email text,
  role public.organization_role,
  status public.organization_invitation_status,
  inviter_name text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select invitation.id,
    invitation.email,
    invitation.role,
    invitation.status,
    coalesce(
      nullif(btrim(inviter.raw_user_meta_data ->> 'full_name'), ''),
      split_part(inviter.email, '@', 1),
      'Stylus user'
    ),
    invitation.expires_at,
    invitation.accepted_at,
    invitation.created_at
  from public.organization_invitations as invitation
  join auth.users as inviter on inviter.id = invitation.invited_by
  where invitation.organization_id = p_organization_id
    and (select private.has_organization_role(
      p_organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    ))
  order by invitation.created_at desc, invitation.id;
$$;

create function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role public.organization_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_organization_id uuid;
  v_email text := lower(btrim(p_email));
  v_invitation public.organization_invitations%rowtype;
begin
  v_organization_id := p_organization_id;
  if v_organization_id is null or not (select private.has_organization_role(
    v_organization_id, array['OWNER', 'ADMIN']::public.organization_role[]
  )) then
    raise exception 'Organization management permission required' using errcode = '42501';
  end if;
  if p_role not in ('MEMBER', 'VIEWER') then
    raise exception 'Invitations may grant MEMBER or VIEWER only' using errcode = '22023';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitation token hash is invalid' using errcode = '22023';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '31 days' then
    raise exception 'Invitation expiration is invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.memberships as membership
    join auth.users as existing_user on existing_user.id = membership.user_id
    where membership.organization_id = v_organization_id
      and membership.removed_at is null
      and lower(existing_user.email) = v_email
  ) then
    raise exception 'This email is already an organization member' using errcode = '23505';
  end if;
  insert into public.organization_invitations (
    organization_id, email, role, token_hash, invited_by, expires_at
  ) values (
    v_organization_id, v_email, p_role, decode(p_token_hash, 'hex'), v_actor, p_expires_at
  ) returning * into v_invitation;
  return v_invitation.id;
end;
$$;

create function public.regenerate_organization_invitation(
  p_organization_id uuid,
  p_invitation_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_invitation public.organization_invitations%rowtype;
begin
  select invitation.* into v_invitation
  from public.organization_invitations as invitation
  where invitation.id = p_invitation_id for update;
  if not found or v_invitation.organization_id <> p_organization_id or not (select private.has_organization_role(
    v_invitation.organization_id, array['OWNER', 'ADMIN']::public.organization_role[]
  )) then raise exception 'Invitation management permission required' using errcode = '42501'; end if;
  if v_invitation.status <> 'PENDING' then
    raise exception 'Only pending invitations can be regenerated' using errcode = '22023';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now()
    or p_expires_at > now() + interval '31 days' then
    raise exception 'Invitation regeneration is invalid' using errcode = '22023';
  end if;
  update public.organization_invitations as invitation
  set token_hash = decode(p_token_hash, 'hex'), expires_at = p_expires_at
  where invitation.id = v_invitation.id returning * into v_invitation;
  return v_invitation.id;
end;
$$;

create function public.revoke_organization_invitation(p_organization_id uuid, p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_invitation public.organization_invitations%rowtype;
begin
  select invitation.* into v_invitation from public.organization_invitations as invitation
  where invitation.id = p_invitation_id for update;
  if not found or v_invitation.organization_id <> p_organization_id or not (select private.has_organization_role(
    v_invitation.organization_id, array['OWNER', 'ADMIN']::public.organization_role[]
  )) then raise exception 'Invitation management permission required' using errcode = '42501'; end if;
  if v_invitation.status <> 'PENDING' then
    raise exception 'Only pending invitations can be revoked' using errcode = '22023';
  end if;
  update public.organization_invitations as invitation
  set status = 'REVOKED', revoked_at = now()
  where invitation.id = v_invitation.id returning * into v_invitation;
  return v_invitation.id;
end;
$$;

create function public.preview_organization_invitation(p_token text)
returns table (organization_name text, role public.organization_role, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select organization.name, invitation.role, invitation.expires_at
  from public.organization_invitations as invitation
  join public.organizations as organization on organization.id = invitation.organization_id
  where invitation.token_hash = extensions.digest(p_token, 'sha256')
    and invitation.status = 'PENDING' and invitation.expires_at > now();
$$;

create function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_email text;
  v_invitation public.organization_invitations%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select lower(authenticated_user.email) into v_email from auth.users as authenticated_user where authenticated_user.id = v_actor;
  select invitation.* into v_invitation from public.organization_invitations as invitation
  where invitation.token_hash = extensions.digest(p_token, 'sha256') for update;
  if not found then raise exception 'Invitation is invalid' using errcode = '22023'; end if;
  if v_invitation.status = 'ACCEPTED' and v_invitation.accepted_by = v_actor and exists (
    select 1 from public.memberships as membership
    where membership.organization_id = v_invitation.organization_id and membership.user_id = v_actor
      and membership.removed_at is null
  ) then return v_invitation.organization_id; end if;
  if v_invitation.status <> 'PENDING' then raise exception 'Invitation is no longer active' using errcode = '22023'; end if;
  if v_invitation.expires_at <= now() then raise exception 'Invitation has expired' using errcode = '22023'; end if;
  if v_email is distinct from v_invitation.email then raise exception 'Invitation email does not match authenticated user' using errcode = '42501'; end if;
  insert into public.memberships (organization_id, user_id, role)
  values (v_invitation.organization_id, v_actor, v_invitation.role)
  on conflict (organization_id, user_id) do update
  set role = excluded.role, removed_at = null, created_at = now();
  update public.organization_invitations as invitation
  set status = 'ACCEPTED', accepted_by = v_actor, accepted_at = now()
  where invitation.id = v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

create function public.update_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.organization_role
)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_membership public.memberships%rowtype;
  v_target public.memberships%rowtype;
begin
  select membership.* into v_actor_membership from public.memberships as membership
  where membership.organization_id = p_organization_id and membership.user_id = v_actor
    and membership.removed_at is null;
  select membership.* into v_target from public.memberships as membership
  where membership.organization_id = v_actor_membership.organization_id and membership.user_id = p_user_id
    and membership.removed_at is null for update;
  if not found or v_actor_membership.role not in ('OWNER', 'ADMIN') then raise exception 'Member management permission required' using errcode = '42501'; end if;
  if v_target.role = 'OWNER' or p_role not in ('MEMBER', 'VIEWER') then raise exception 'OWNER roles cannot be changed here' using errcode = '42501'; end if;
  if v_actor_membership.role = 'ADMIN' and v_target.role = 'ADMIN' then raise exception 'ADMIN cannot manage ADMIN' using errcode = '42501'; end if;
  update public.memberships as membership set role = p_role
  where membership.organization_id = v_target.organization_id and membership.user_id = v_target.user_id
  returning * into v_target;
  return v_target;
end;
$$;

create function public.remove_organization_member(p_organization_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_membership public.memberships%rowtype;
  v_target public.memberships%rowtype;
begin
  select membership.* into v_actor_membership from public.memberships as membership
  where membership.organization_id = p_organization_id and membership.user_id = v_actor
    and membership.removed_at is null;
  select membership.* into v_target from public.memberships as membership
  where membership.organization_id = v_actor_membership.organization_id and membership.user_id = p_user_id
    and membership.removed_at is null for update;
  if not found or v_actor_membership.role not in ('OWNER', 'ADMIN') then raise exception 'Member management permission required' using errcode = '42501'; end if;
  if v_target.role = 'OWNER' then raise exception 'OWNER cannot be removed' using errcode = '42501'; end if;
  if v_actor_membership.role = 'ADMIN' and v_target.role = 'ADMIN' then raise exception 'ADMIN cannot manage ADMIN' using errcode = '42501'; end if;
  update public.memberships as membership set removed_at = now()
  where membership.organization_id = v_target.organization_id and membership.user_id = v_target.user_id;
  return true;
end;
$$;

alter table public.organization_invitations enable row level security;
revoke all on table public.organization_invitations from public, anon, authenticated;

revoke all on function public.list_organization_team(uuid) from public, anon;
revoke all on function public.list_organization_invitations(uuid) from public, anon;
revoke all on function public.create_organization_invitation(uuid, text, public.organization_role, text, timestamptz) from public, anon;
revoke all on function public.regenerate_organization_invitation(uuid, uuid, text, timestamptz) from public, anon;
revoke all on function public.revoke_organization_invitation(uuid, uuid) from public, anon;
revoke all on function public.accept_organization_invitation(text) from public, anon;
revoke all on function public.update_organization_member_role(uuid, uuid, public.organization_role) from public, anon;
revoke all on function public.remove_organization_member(uuid, uuid) from public, anon;
revoke all on function public.preview_organization_invitation(text) from public;

grant execute on function public.list_organization_team(uuid) to authenticated;
grant execute on function public.list_organization_invitations(uuid) to authenticated;
grant execute on function public.create_organization_invitation(uuid, text, public.organization_role, text, timestamptz) to authenticated;
grant execute on function public.regenerate_organization_invitation(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid, uuid) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.update_organization_member_role(uuid, uuid, public.organization_role) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;
grant execute on function public.preview_organization_invitation(text) to anon, authenticated;
