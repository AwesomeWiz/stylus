import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Immutable, explicitly authored evidence is a test fixture, not an application
// creation API. Use the operator's existing SQL workflow; never widen service
// grants or enqueue an executable job just to fabricate a successful AI result.
export function createResearchFixture({
  organizationId,
  actor,
  ids,
  hostedRef,
}) {
  const values = [organizationId, actor, ...Object.values(ids)];
  if (
    values.some(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  )
    throw Error("Unexpected fixture identity");
  if (
    hostedRef &&
    fs.readFileSync("supabase/.temp/project-ref", "utf8").trim() !== hostedRef
  )
    throw Error("Fixture CLI/backend link mismatch");
  const sql = `begin;
do $$ begin
 if not exists(select 1 from public.organizations where id='${organizationId}' and created_by='${actor}' and name='Paper Orbit · Fictional demo') then raise exception 'Fixture ownership mismatch'; end if;
 if not exists(select 1 from public.memberships where organization_id='${organizationId}' and user_id='${actor}' and role='OWNER' and removed_at is null) then raise exception 'Fixture actor mismatch'; end if;
 if exists(select 1 from public.jobs where id='${ids.job}' and (organization_id<>'${organizationId}' or created_by<>'${actor}' or status<>'CANCELLED')) then raise exception 'Unexpected existing job';end if;
 if exists(select 1 from public.marketing_external_research_runs where id='${ids.run}' and (organization_id<>'${organizationId}' or created_by<>'${actor}' or job_id<>'${ids.job}' or status<>'CANCELLED')) then raise exception 'Unexpected existing run';end if;
 if exists(select 1 from public.marketing_external_research_sources where id='${ids.source}' and (organization_id<>'${organizationId}' or run_id<>'${ids.run}')) then raise exception 'Unexpected existing source';end if;
 if exists(select 1 from public.marketing_external_research_evidence where id='${ids.evidence}' and (organization_id<>'${organizationId}' or run_id<>'${ids.run}' or source_id<>'${ids.source}')) then raise exception 'Unexpected existing evidence';end if;
end $$;
insert into public.jobs(id,organization_id,created_by,plugin_id,job_type,capability,execution_class,status,timeout_seconds,error_category,completed_at,cancellation_requested_at,cancelled_at)
values('${ids.job}','${organizationId}','${actor}','marketing','marketing.external-research.run','marketing.external-research.execute','SERVERLESS','CANCELLED',120,'cancelled',now(),now(),now()) on conflict(id) do nothing;
insert into public.marketing_external_research_runs(id,organization_id,created_by,job_id,invocation_key,request_snapshot,status,requested_source_count,completed_at,failure_category,evidence_count)
values('${ids.run}','${organizationId}','${actor}','${ids.job}','${ids.invocation}','{"fictionalDemo":true}','CANCELLED',1,now(),'cancelled',1) on conflict(id) do nothing;
insert into public.marketing_external_research_sources(id,organization_id,run_id,source_key,adapter,status,canonical_url,title,fetched_at,content_hash,safe_metadata)
values('${ids.source}','${organizationId}','${ids.run}','SRC-1','rss-atom','SUCCEEDED','https://example.test/fictional-workshop','Fictional demo observation - no external retrieval',now(),repeat('a',64),'{"fictionalDemo":true}') on conflict(id) do nothing;
insert into public.marketing_external_research_evidence(id,organization_id,run_id,source_id,evidence_id,evidence_type,excerpt)
values('${ids.evidence}','${organizationId}','${ids.run}','${ids.source}','EVID-1','DISCUSSION','Fictional observation: trial participants hesitated when the initial workspace exposed every setup choice.') on conflict(id) do nothing;
commit;`;
  const file = path.resolve(".release-qa/demo-research-fixture.sql");
  fs.writeFileSync(file, sql, { mode: 0o600 });
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/supabase/dist/supabase.js",
      "db",
      "query",
      hostedRef ? "--linked" : "--local",
      "--file",
      file,
      "--output-format",
      "json",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 60000, input: "" },
  );
  fs.writeFileSync(
    ".release-qa/demo-research-fixture.log",
    (result.stdout ?? "") + (result.stderr ?? ""),
    { mode: 0o600 },
  );
  if (result.status !== 0)
    throw Error(
      "Exact-ID research fixture failed; inspect the ignored log, do not guess or widen privileges",
    );
  return {
    job: { id: ids.job },
    run: { id: ids.run },
    source: { id: ids.source },
    evidence: { id: ids.evidence },
  };
}
