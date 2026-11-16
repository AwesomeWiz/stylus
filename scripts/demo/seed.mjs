import fs from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createResearchFixture } from "./research-fixture.mjs";
import { canonicalInventory, readDemoInventory } from "./inventory.mjs";
import { verifyDemoOrganization } from "./organization-identity.mjs";
import { ensureDemoTeam } from "./team.mjs";
import { ensureDemoAsset, cleanupDemoAssets } from "./assets.mjs";

const envFile =
  process.argv.find((arg) => arg.startsWith("--env-file="))?.slice(11) ??
  "apps/web/.env.local";
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service)
  throw Error(
    "Demo setup needs a configured development Supabase backend and server-only service key",
  );
const host = new URL(url).hostname;
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(host) ||
  process.argv.some((arg) => arg.startsWith("--allow-hosted-project="))
)
  throw Error(
    "Release demo writes require an isolated local Supabase stack; hosted projects are refused",
  );
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const owner = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const file = ".release-qa/demo.json";
fs.mkdirSync(".release-qa", { recursive: true });
let journal;
const identifiers = (value, prefix = "", found = []) => {
  if (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    found.push({ path: prefix, id: value });
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value))
      identifiers(child, prefix ? prefix + "." + key : key, found);
  return found;
};
const check = (result, step) => {
  if (result.error) {
    fs.writeFileSync(
      ".release-qa/demo-error.json",
      JSON.stringify(
        { step, code: result.error.code, message: result.error.message },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    throw Error(
      `Demo step failed: ${step} (${result.error.code ?? "request"})`,
    );
  }
  journal?.(step, result.data);
  return result.data;
};

if (process.argv.includes("--cleanup")) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  if (manifest.url !== url || manifest.name !== "Paper Orbit · Fictional demo")
    throw Error("Demo ownership guard failed");
  if (
    !/^[a-f0-9]{10}$/.test(manifest.token) ||
    !manifest.users.length ||
    manifest.users.length > 3
  )
    throw Error("STOP: unexpected recorded fixture accounts");
  for (const [index, account] of manifest.users.entries()) {
    if (account.email !== `stylus-demo-${manifest.token}-${index}@example.test`)
      throw Error("STOP: fixture account identity mismatch");
    const result = await admin.auth.admin.getUserById(account.id);
    if (
      result.error ||
      result.data.user.id !== account.id ||
      result.data.user.email !== account.email ||
      !account.email.endsWith("@example.test")
    )
      throw Error("Demo user identity mismatch");
  }
  if (manifest.organizationId) {
    if (!manifest.recordInventory)
      throw Error("STOP: exact demo row inventory is required before cleanup");
    const currentInventory = await readDemoInventory(manifest);
    if (
      JSON.stringify(currentInventory) !==
      JSON.stringify(canonicalInventory(manifest.recordInventory))
    )
      throw Error(
        "STOP: demo inventory changed; review and record exact expected IDs before cleanup",
      );
    check(
      await owner.auth.signInWithPassword({
        email: manifest.users[0].email,
        password: manifest.password,
      }),
      "cleanup sign-in",
    );
    const organization = await verifyDemoOrganization(
      owner,
      manifest,
      check,
      "cleanup ownership",
    );
    await cleanupDemoAssets({
      owner,
      manifest,
      check,
      save: () =>
        fs.writeFileSync(file, JSON.stringify(manifest, null, 2), {
          mode: 0o600,
        }),
    });
    check(
      await owner.rpc("delete_owned_organization", {
        p_organization_id: organization.id,
        p_confirmation_name: organization.name,
      }),
      "bounded organization cleanup",
    );
    if (
      (await readDemoInventory(manifest)).some((table) => table.records.length)
    )
      throw Error("STOP: demo organization records remain after cleanup");
  }
  for (const account of manifest.users)
    check(
      await admin.auth.admin.deleteUser(account.id),
      "bounded user cleanup",
    );
  for (const account of manifest.users) {
    const result = await admin.auth.admin.getUserById(account.id);
    if (
      result.data?.user ||
      (result.error?.status !== 404 && result.error?.code !== "user_not_found")
    )
      throw Error("STOP: exact fixture account deletion not confirmed");
  }
  delete manifest.password;
  manifest.state = "cleaned";
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  console.log(
    "Removed only the exact recorded fictional demo organization/users; unrelated data was not changed.",
  );
  process.exit(0);
}
const previousManifest = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : null;
if (
  previousManifest &&
  (!process.argv.includes("--resume") ||
    previousManifest.url !== url ||
    previousManifest.name !== "Paper Orbit · Fictional demo" ||
    previousManifest.state !== "creating")
)
  throw Error(
    "Demo manifest already exists. Preserve it; --resume is restricted to this exact unfinished fixture.",
  );
const token = previousManifest?.token ?? randomBytes(5).toString("hex");
const manifest = previousManifest ?? {
  state: "creating",
  startedAt: new Date().toISOString(),
  url,
  name: "Paper Orbit · Fictional demo",
  password: randomBytes(24).toString("base64url"),
  users: [],
  ids: {},
  events: [],
  token,
  allocations: {},
  insertResults: {},
  rpcResults: {},
};
const save = () =>
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2), { mode: 0o600 });
save();
journal = (step, value) => {
  const ids = identifiers(value);
  if (ids.length) {
    manifest.events.push({ step, ids });
    save();
  }
};
const allocate = (label) => {
  if (!manifest.allocations[label]) {
    manifest.allocations[label] = randomUUID();
    save();
  }
  return manifest.allocations[label];
};
const rpcCalls = new Map();
const seedRpc = async (name, args) => {
  // Record preallocated entity IDs before the write, including lost-response
  // recovery. Responses are journaled by check(); tokens/content are excluded.
  journal("intent:" + name, args);
  const index = rpcCalls.get(name) ?? 0;
  rpcCalls.set(name, index + 1);
  const key = name + ":" + index;
  if (Object.hasOwn(manifest.rpcResults, key))
    return { data: manifest.rpcResults[key], error: null };
  const result = await owner.rpc(name, args);
  if (!result.error) {
    manifest.rpcResults[key] = result.data;
    save();
  }
  return result;
};
for (const [index, name] of ["Alex", "Riley", "Jordan"].entries()) {
  const email = `stylus-demo-${token}-${index}@example.test`;
  if (manifest.users[index]) {
    const existing = check(
      await admin.auth.admin.getUserById(manifest.users[index].id),
      "verify exact existing fixture user",
    );
    if (
      existing.user.id !== manifest.users[index].id ||
      existing.user.email !== email ||
      manifest.users[index].email !== email
    )
      throw Error("STOP: fixture user identity mismatch");
    continue;
  }
  const data = check(
    await admin.auth.admin.createUser({
      email,
      password: manifest.password,
      email_confirm: true,
      user_metadata: { full_name: name },
    }),
    "create fictional account",
  );
  manifest.users.push({ id: data.user.id, email, name });
  save();
}
const actor = manifest.users[0].id;
check(
  await owner.auth.signInWithPassword({
    email: manifest.users[0].email,
    password: manifest.password,
  }),
  "owner sign-in",
);
const organization = check(
  await seedRpc("create_organization", { p_name: manifest.name }),
  "create isolated organization",
);
const org = organization.id;
manifest.organizationId = org;
save();
await verifyDemoOrganization(
  owner,
  manifest,
  check,
  "verify exact fixture organization",
);
await ensureDemoTeam({
  owner,
  createClient,
  url,
  key: anon,
  manifest,
  check,
  save,
});
check(
  await seedRpc("set_organization_plugin_enabled", {
    p_organization_id: org,
    p_plugin_id: "marketing",
    p_enabled: true,
  }),
  "enable demo Marketing",
);
const audit = { organization_id: org, created_by: actor, updated_by: actor };
const started = Date.parse(manifest.startedAt);
const day = (offset) =>
  new Date(started + offset * 86400000).toISOString().slice(0, 10);
const insertCalls = new Map();
const insert = async (table, fields, client = owner) => {
  const index = insertCalls.get(table) ?? 0;
  insertCalls.set(table, index + 1);
  const key = table + ":" + index,
    cached = manifest.insertResults[key];
  if (cached) {
    let query = client.from(table).select().eq("organization_id", org);
    if (cached.id) query = query.eq("id", cached.id);
    const row = check(
      await query.single(),
      "verify exact fixture row:" + table,
    );
    if (row.organization_id !== org || (cached.id && row.id !== cached.id))
      throw Error("STOP: fixture record identity mismatch");
    return row;
  }
  const row = check(
    await client.from(table).insert(fields).select().single(),
    table,
  );
  manifest.insertResults[key] = {
    ...(row.id ? { id: row.id } : {}),
    organizationId: org,
  };
  save();
  return row;
};
await insert("company_profiles", {
  ...audit,
  company_name: "Paper Orbit",
  short_description:
    "Fictional demo: guided workspaces for small creative teams to reach their first useful outcome.",
  industry: "Team software · fictional",
  stage: "PRE_PRODUCT",
  problem_statement:
    "Small teams hesitate when setup asks for every decision at once.",
  affected_audience: "Independent creative teams of two to eight people",
  value_proposition: "A clear first step, with the rest available when needed.",
  product_status: "TESTING",
  near_term_objective: "Evaluate a progressive first-session setup.",
});
await insert("audience_profiles", {
  ...audit,
  name: "Small creative teams",
  description: "Fictional early teams coordinating their first shared project.",
  is_primary: true,
  pain_points: ["Too many setup decisions"],
  goals: ["Reach a useful first session"],
});
await insert("brand_profiles", {
  ...audit,
  status: "DEFINED",
  personality_traits: ["Clear", "Considerate"],
  tone_of_voice: ["Direct", "Practical"],
});
await insert("marketing_profiles", {
  ...audit,
  primary_objective: "VALIDATION",
  primary_channels: ["Interviews", "Instagram"],
  content_focus: ["First-session clarity"],
  stage: "EXPERIMENTING",
});
await insert("onboarding_progress", {
  organization_id: org,
  started_by: actor,
  updated_by: actor,
  current_step: 8,
  completed_at: new Date().toISOString(),
});
const milestone = { id: allocate("milestone") };
check(
  await seedRpc("save_milestone", {
    p_organization_id: org,
    p_id: milestone.id,
    p_title: "Validate a clearer first session",
    p_description: "Fictional validation checkpoint.",
    p_target_date: day(14),
    p_status: "ACTIVE",
    p_owner_id: actor,
    p_archived: false,
    p_expected_updated_at: null,
  }),
  "milestone",
);
manifest.ids.milestone = milestone.id;
const taskTitles = [
  "Build the guided setup variant",
  "Instrument first-session completion",
  "Review the fictional workshop notes",
  "Prepare the next interview guide",
  "Choose one message to test",
  "Share the experiment decision",
];
manifest.ids.tasks = [];
for (const [index, title] of taskTitles.entries()) {
  const task = await insert("tasks", {
    ...audit,
    title,
    description: "Fictional demonstration work. No real customer information.",
    status: index === 1 ? "IN_PROGRESS" : "TODO",
    priority: index < 2 ? "HIGH" : "MEDIUM",
    assignee_id: manifest.users[index % 2].id,
    due_at: new Date(Date.now() + (index - 1) * 86400000).toISOString(),
  });
  manifest.ids.tasks.push(task.id);
  save();
  check(
    await seedRpc("set_task_milestone", {
      p_organization_id: org,
      p_task_id: task.id,
      p_milestone_id: milestone.id,
    }),
    "assign milestone through authorized API",
  );
}
check(
  await seedRpc("set_task_dependency", {
    p_organization_id: org,
    p_task_id: manifest.ids.tasks[1],
    p_blocked_by_id: manifest.ids.tasks[0],
    p_link: true,
  }),
  "task prerequisite",
);
const note = { id: allocate("note") };
check(
  await seedRpc("save_core_note", {
    p_organization_id: org,
    p_id: note.id,
    p_title: "First-session decision log",
    p_content:
      "Fictional working note\n\nObservation: teams hesitate at the initial setup.\nDecision: test one clear first step before adding more choices.\nUnknown: whether the effect persists after a week.",
    p_archived: false,
    p_expected_updated_at: null,
  }),
  "working note",
);
check(
  await seedRpc("set_core_note_link", {
    p_organization_id: org,
    p_note_id: note.id,
    p_kind: "task",
    p_target_id: manifest.ids.tasks[0],
    p_link: true,
  }),
  "canonical working note link",
);
manifest.ids.note = note.id;
const research = await insert("marketing_research", {
  ...audit,
  title: "Fictional workshop observations",
  content:
    "Fictional evaluation, not customer research: six of eight sample participants paused when all setup choices appeared together. This tiny synthetic sample does not establish causation.",
  source_label: "Fictional demo workshop",
  category: "CUSTOMER",
});
const campaign = await insert("marketing_campaigns", {
  ...audit,
  name: "One clear first step",
  objective:
    "Fictional campaign: explain the first useful outcome without promising everything at once.",
  status: "ACTIVE",
  starts_on: day(-3),
  ends_on: day(14),
});
manifest.ids.campaign = campaign.id;
await insert("marketing_competitors", {
  ...audit,
  name: "Fictional alternative: a shared checklist",
  notes: "An invented comparison for the demo, not a real company's analysis.",
});
await insert("marketing_reel_ideas", {
  ...audit,
  title: "Start with one useful decision",
  concept:
    "Show how a team moves from a blank workspace to one clear commitment.",
  hook: "Your first session should not feel like a questionnaire.",
  status: "READY",
  campaign_id: campaign.id,
});
// A cancelled, explicitly fictional fixture provides exact Evidence provenance
// without claiming any model or provider execution succeeded.
const fixtureIds = {
  invocation: allocate("research-invocation"),
};
journal("intent:immutable-fictional-evidence", fixtureIds);
const { job, run, source, evidence } = await createResearchFixture({
  owner,
  service: admin,
  manifest,
  invocation: fixtureIds.invocation,
  check,
  save,
});
journal("created:immutable-fictional-evidence", { job, run, source, evidence });
manifest.ids.evidence = evidence.id;
manifest.ids.researchRun = run.id;
const hypothesis = allocate("hypothesis");
check(
  await seedRpc("save_marketing_hypothesis", {
    p_organization_id: org,
    p_id: hypothesis,
    p_fields: {
      title: "Fewer first-session decisions improve activation",
      statement:
        "We believe a single clear setup step will help small teams reach a first useful outcome.",
      status: "READY_TO_TEST",
      confidence: "LOW",
      ownerId: actor,
    },
    p_source: {
      kind: "evidence",
      id: evidence.id,
      runId: run.id,
      evidenceKey: "EVID-1",
    },
  }),
  "reviewed hypothesis",
);
manifest.ids.hypothesis = hypothesis;
const experiment = allocate("experiment"),
  fields = {
    title: "Guided setup variant",
    hypothesisId: hypothesis,
    testPlan:
      "Fictional evaluation: compare an all-at-once setup with a progressive version in eight synthetic sessions.",
    successCriteria:
      "At least six of eight fictional sessions reach the first shared task without help.",
    status: "PLANNED",
    ownerId: actor,
    startsOn: day(-7),
    endsOn: day(-1),
  };
check(
  await seedRpc("save_marketing_experiment", {
    p_organization_id: org,
    p_id: experiment,
    p_fields: fields,
  }),
  "planned experiment",
);
for (const taskId of manifest.ids.tasks.slice(0, 2))
  check(
    await seedRpc("link_marketing_experiment", {
      p_organization_id: org,
      p_experiment_id: experiment,
      p_kind: "task",
      p_target_id: taskId,
    }),
    "canonical task link",
  );
check(
  await seedRpc("link_marketing_experiment", {
    p_organization_id: org,
    p_experiment_id: experiment,
    p_kind: "campaign",
    p_target_id: campaign.id,
  }),
  "canonical campaign link",
);
for (const status of ["RUNNING", "EVALUATING"]) {
  const existing = check(
    await owner
      .from("marketing_experiments")
      .select("updated_at")
      .eq("id", experiment)
      .single(),
    "experiment version",
  );
  check(
    await seedRpc("save_marketing_experiment", {
      p_organization_id: org,
      p_id: experiment,
      p_fields: { ...fields, status },
      p_expected_updated_at: existing.updated_at,
    }),
    "explicit experiment stage",
  );
}
const existing = check(
  await owner
    .from("marketing_experiments")
    .select("updated_at")
    .eq("id", experiment)
    .single(),
  "evaluation version",
);
check(
  await seedRpc("evaluate_marketing_experiment", {
    p_organization_id: org,
    p_experiment_id: experiment,
    p_outcome: "SUPPORTED",
    p_result_summary:
      "Fictional evaluation: six of eight synthetic sessions completed the first step. This is demo content, not a measured product claim.",
    p_expected_updated_at: existing.updated_at,
    p_update_hypothesis: false,
  }),
  "explicit fictional evaluation",
);
const learning = allocate("learning");
check(
  await seedRpc("save_marketing_learning", {
    p_organization_id: org,
    p_id: learning,
    p_experiment_id: experiment,
    p_title: "Progressive setup deserves a larger test",
    p_conclusion:
      "Fictional learning: a clear first step helped this synthetic sample. Test with real participants before generalizing.",
    p_confidence: "LOW",
  }),
  "reviewed learning",
);
if (process.argv.includes("--confirm-demo-memory"))
  manifest.ids.memory = check(
    await seedRpc("promote_marketing_learning", {
      p_organization_id: org,
      p_learning_id: learning,
      p_kind: "INSIGHT",
      p_title: "Fictional approved setup insight",
      p_content:
        "Demo-only reviewed insight: progressive setup is a candidate worth testing. No real customer evidence is claimed.",
    }),
    "explicit demo Memory confirmation",
  );
manifest.ids.experiment = experiment;
manifest.ids.learning = learning;
const section = allocate("section");
let objectIndex = 0;
const object = (kind, x, y, content, extra = {}) => ({
  id: allocate("board-object:" + objectIndex++),
  element_type: kind,
  x,
  y,
  width: 240,
  height: 150,
  rotation: 0,
  z_index: 10,
  parent_id: null,
  locked: false,
  content,
  style: {},
  metadata: {},
  ...extra,
});
const objects = [
  object(
    "SECTION",
    40,
    40,
    { title: "From observation to a test", collapsed: false },
    { id: section, width: 1100, height: 760, z_index: 0 },
  ),
  object(
    "STICKY",
    80,
    130,
    { text: "EVIDENCE\nFictional workshop: setup creates hesitation." },
    { parent_id: section, style: { background: "#f4dfb8" } },
  ),
  object(
    "STICKY",
    380,
    130,
    { text: "HYPOTHESIS\nOffer one clear first step." },
    { parent_id: section, style: { background: "#d8e8df" } },
  ),
  object(
    "STICKY",
    680,
    130,
    { text: "EXPERIMENT\nCompare the guided setup variant." },
    { parent_id: section, style: { background: "#dfe2fa" } },
  ),
  object(
    "TEXT",
    80,
    360,
    {
      text: "Fictional workspace · Evidence → Hypothesis → Experiment → Execution → Learning",
    },
    { width: 940, height: 100, parent_id: section },
  ),
];
objects.push(
  object(
    "ENTITY_CARD",
    80,
    510,
    {
      reference: {
        organizationId: org,
        entityType: "core.task",
        entityId: manifest.ids.tasks[0],
      },
    },
    { width: 320, height: 150, parent_id: section },
  ),
  object(
    "ENTITY_CARD",
    480,
    510,
    {
      reference: {
        organizationId: org,
        entityType: "marketing.hypothesis",
        entityId: hypothesis,
        sourcePlugin: "marketing",
      },
    },
    { width: 400, height: 150, parent_id: section },
  ),
);
const board = check(
  await seedRpc("create_board_from_template", {
    p_organization_id: org,
    p_title: "First-session learning board",
    p_template_key: "research-synthesis",
    p_elements: objects,
  }),
  "native board",
);
manifest.ids.board = board.id;
await ensureDemoAsset({ owner, manifest, allocate, check, save });
manifest.recordInventory = await readDemoInventory(manifest);
manifest.inventoryAt = new Date().toISOString();
manifest.state = "ready";
save();
console.log(
  "Fictional demo created. Credentials/record IDs are only in ignored .release-qa/demo.json. No model/provider was invoked.",
);
