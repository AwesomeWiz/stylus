create function private.ai_trace_metadata_has_forbidden_key(p_value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_child jsonb;
  v_key text;
begin
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in
      select entry.key, entry.value
      from jsonb_each(p_value) as entry
    loop
      if lower(v_key) = any(array[
        'prompt', 'response', 'messages', 'input', 'output', 'content'
      ]) then
        return true;
      end if;
      if private.ai_trace_metadata_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in
      select element.value
      from jsonb_array_elements(p_value) as element
    loop
      if private.ai_trace_metadata_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

revoke all on function private.ai_trace_metadata_has_forbidden_key(jsonb)
from public, anon, authenticated;

alter table public.ai_runs
drop constraint ai_runs_trace_metadata_valid;

alter table public.ai_runs
add constraint ai_runs_trace_metadata_valid check (
  jsonb_typeof(trace_metadata) = 'object'
  and octet_length(trace_metadata::text) <= 8192
  and not private.ai_trace_metadata_has_forbidden_key(trace_metadata)
);
