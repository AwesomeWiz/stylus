import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pgtap } from "@electric-sql/pglite-pgtap";

// This creates an empty in-memory PostgreSQL instance. It never reads .env,
// connects to a URL, touches hosted data or supplies permissive policy mocks.
const db = new PGlite({ extensions: { pgcrypto, pgtap } });
const upgrade = process.argv.includes("--upgrade");
const catalog = process.argv.includes("--catalog");
const filters = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"));
const report = {
  engine: "PGlite PostgreSQL + real pgcrypto/pgTAP",
  upgrade,
  migrations: [],
  suites: [],
};
try {
  await db.exec(await fs.readFile("scripts/database/bootstrap.sql", "utf8"));
  const files = (await fs.readdir("supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  let sentinel;
  for (const file of files) {
    // Retain actual pre-integration work through every remaining forward
    // migration, including the release correction to platform-default grants.
    if (upgrade && !sentinel && file >= "20261111000100") {
      await db.exec(`insert into auth.users(id,email) values('ffff0000-0000-4000-8000-000000000001','upgrade@example.test');
        insert into public.organizations(id,name,created_by) values('ffff0000-0000-4000-8000-000000000002','Upgrade sentinel','ffff0000-0000-4000-8000-000000000001');
        insert into public.memberships(organization_id,user_id,role) values('ffff0000-0000-4000-8000-000000000002','ffff0000-0000-4000-8000-000000000001','OWNER');
        select set_config('request.jwt.claim.sub','ffff0000-0000-4000-8000-000000000001',false);
        insert into public.tasks(id,organization_id,title,created_by,updated_by) values('ffff0000-0000-4000-8000-000000000003','ffff0000-0000-4000-8000-000000000002','Existing upgrade task','ffff0000-0000-4000-8000-000000000001','ffff0000-0000-4000-8000-000000000001');
        insert into public.boards(id,organization_id,title,created_by,updated_by) values('ffff0000-0000-4000-8000-000000000004','ffff0000-0000-4000-8000-000000000002','Existing upgrade board','ffff0000-0000-4000-8000-000000000001','ffff0000-0000-4000-8000-000000000001');
        insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,created_by,updated_by) values('ffff0000-0000-4000-8000-000000000005','ffff0000-0000-4000-8000-000000000002','ffff0000-0000-4000-8000-000000000004','STICKY',10,20,200,160,'{"text":"Existing upgrade note"}','ffff0000-0000-4000-8000-000000000001','ffff0000-0000-4000-8000-000000000001');`);
      sentinel = true;
    }
    const sql = await fs.readFile("supabase/migrations/" + file, "utf8");
    await db.exec(sql);
    report.migrations.push({
      file,
      sha256: createHash("sha256").update(sql).digest("hex"),
    });
  }
  if (upgrade) {
    if (!sentinel) throw Error("Upgrade boundary not found");
    const result = await db.query(
      "select name from public.organizations where id='ffff0000-0000-4000-8000-000000000002'",
    );
    if (result.rows[0]?.name !== "Upgrade sentinel")
      throw Error("Upgrade lost existing data");
    await db.exec("set role authenticated");
    const tasks = await db.query(
      "select title from public.tasks where id='ffff0000-0000-4000-8000-000000000003'",
    );
    if (tasks.rows[0]?.title !== "Existing upgrade task")
      throw Error("Upgrade lost task data or authorized read access");
    const board = await db.query(
      "select title from public.boards where id='ffff0000-0000-4000-8000-000000000004'",
    );
    const element = await db.query(
      "update public.board_elements set x=21,updated_by='ffff0000-0000-4000-8000-000000000001' where id='ffff0000-0000-4000-8000-000000000005' returning x,content",
    );
    if (
      board.rows[0]?.title !== "Existing upgrade board" ||
      element.rows[0]?.x !== 21 ||
      element.rows[0]?.content?.text !== "Existing upgrade note"
    )
      throw Error("Upgrade lost Board work or allowed column writes");
    const identity = await db.query(
      "select has_column_privilege('authenticated','public.board_elements','board_id','UPDATE') as allowed",
    );
    if (identity.rows[0]?.allowed !== false)
      throw Error("Upgrade retained broad Board identity privileges");
    report.upgradePreserved = [
      "organization",
      "task",
      "authenticated-owner-read",
      "board",
      "board-object-content",
      "authorized-column-write",
      "identity-update-denied",
    ];
    console.log(
      "PASS pre-integration upgrade retains organization, Task, Board/object content and authorized writes; identity updates denied",
    );
  }
  if (catalog) {
    report.catalog = (
      await db.query(`select c.relname as table_name,c.relrowsecurity as rls,
      array(select a.attname from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped order by a.attnum) as columns,
      array(select a.attname from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum where i.indrelid=c.oid and i.indisprimary order by k.position) as primary_key,
      (select json_agg(json_build_object('role',p.grantee,'privilege',p.privilege_type)) from information_schema.role_table_grants p where p.table_schema='public' and p.table_name=c.relname and p.grantee in ('anon','authenticated','service_role')) as grants,
      (select json_agg(json_build_object('name',p.policyname,'roles',p.roles,'command',p.cmd)) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`)
    ).rows;
    report.definers = (
      await db.query(
        `select p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prosecdef order by p.proname`,
      )
    ).rows;
  }
  const suites =
    upgrade || catalog
      ? []
      : (await fs.readdir("supabase/tests/database"))
          .filter(
            (file) =>
              file.endsWith(".test.sql") &&
              (!filters.length || filters.includes(file)),
          )
          .sort();
  if (
    !upgrade &&
    !catalog &&
    (!suites.length || filters.some((file) => !suites.includes(file)))
  )
    throw Error("Unknown SQL suite selection");
  for (const file of suites) {
    const results = await db.exec(
      await fs.readFile("supabase/tests/database/" + file, "utf8"),
    );
    const tap = results
      .flatMap((result) => result.rows)
      .flatMap((row) => Object.values(row))
      .filter((value) => typeof value === "string");
    const failures = tap.filter(
      (line) => /^not ok/.test(line) || line.includes("Looks like"),
    );
    const assertions = tap.filter((line) => /^ok \d/.test(line)).length;
    const plans = tap.filter((line) => /^1\.\.\d+$/.test(line));
    if (
      plans.length !== 1 ||
      Number(plans[0].slice(3)) !==
        assertions + failures.filter((line) => /^not ok/.test(line)).length
    )
      failures.push("Missing or inconsistent TAP plan");
    report.suites.push({ file, assertions, failures });
    console.log(
      `${failures.length ? "FAIL" : "PASS"} ${file}: ${assertions} assertions`,
    );
    for (const failure of failures) console.error(failure);
    if (failures.length) process.exitCode = 1;
    await db.exec("reset role");
  }
  console.log(
    `${report.suites.length} suites; ${report.suites.reduce((count, suite) => count + suite.assertions, 0)} assertions; ${files.length} migrations`,
  );
} catch (error) {
  report.error = { code: error.code, message: error.message };
  console.error(JSON.stringify(report.error));
  process.exitCode = 1;
} finally {
  await fs.mkdir(".release-qa", { recursive: true });
  await fs.writeFile(
    `.release-qa/sql-${catalog ? "catalog" : upgrade ? "upgrade" : "fresh"}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await db.close();
}
