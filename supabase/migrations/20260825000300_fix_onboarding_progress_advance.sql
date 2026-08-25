create function public.advance_onboarding_progress(
  p_organization_id uuid,
  p_completed_step smallint
)
returns smallint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := (select auth.uid());
  advanced_step smallint;
  durable_step smallint;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_completed_step not between 1 and 7 then
    raise exception 'Completed onboarding step must be between 1 and 7'
      using errcode = '22023';
  end if;

  if not (select private.has_organization_role(
    p_organization_id,
    array['OWNER', 'ADMIN']::public.organization_role[]
  )) then
    raise exception 'Organization management permission required'
      using errcode = '42501';
  end if;

  select current_step
  into durable_step
  from public.onboarding_progress
  where organization_id = p_organization_id;

  if p_completed_step > coalesce(durable_step, 1) then
    raise exception 'Onboarding steps cannot be skipped' using errcode = '22023';
  end if;

  insert into public.onboarding_progress (
    organization_id,
    current_step,
    started_by,
    updated_by
  )
  values (
    p_organization_id,
    (p_completed_step + 1)::smallint,
    authenticated_user_id,
    authenticated_user_id
  )
  on conflict (organization_id) do update
  set
    current_step = greatest(
      public.onboarding_progress.current_step,
      excluded.current_step
    ),
    updated_by = authenticated_user_id
  returning current_step into advanced_step;

  return advanced_step;
end;
$$;

comment on function public.advance_onboarding_progress(uuid, smallint) is
  'Idempotently records one completed onboarding step and returns the durable resumable step.';

revoke all on function public.advance_onboarding_progress(uuid, smallint)
from public, anon;
grant execute on function public.advance_onboarding_progress(uuid, smallint)
to authenticated;
