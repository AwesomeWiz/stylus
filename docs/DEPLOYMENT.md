# Stylus — Deployment Strategy

## Initial Constraint

Stylus should initially operate without a mandatory paid VPS.

---

# Initial Hosted Architecture

Use free-tier/serverless services where practical.

Conceptual deployment:

Team
-> hosted Stylus frontend/API
-> Supabase
-> queue/job infrastructure
-> lightweight hosted AI where available

Heavy jobs
-> optional Windows worker

---

# Developer Laptop

The developer laptop is not the production server.

It may provide optional heavy computation.

When offline:

- users can still log in
- tasks remain available
- whiteboards remain available
- company knowledge remains available
- stored marketing analysis remains available
- heavy queued work waits

---

# Windows Worker

Worker responsibilities may include:

- FFmpeg processing
- OpenCV processing
- transcription
- Ollama inference
- multimodal analysis

The worker connects outbound to hosted infrastructure.

Do not expose inbound Ollama ports.

---

# Future Migration

When funding/revenue permits:

Windows Worker
-> cloud GPU worker

Free/serverless components may later migrate to dedicated infrastructure
without changing core application contracts.

---

# Hosted Task Reminder Schedule

TASK-005 reminder delivery is a PostgreSQL operation and does not require an
always-running Stylus server. After applying
`20260825000500_reminders_notifications_activity.sql` to hosted Supabase:

1. In Supabase Dashboard, open Integrations, enable the Cron Postgres Module
   (`pg_cron`), then open Jobs.
2. Create the case-sensitive job `stylus-task-reminders`.
3. Use schedule `*/5 * * * *`.
4. Configure the SQL job as:

   ```sql
   select public.process_task_reminders();
   ```

5. Activate it, inspect Job History after a run, and test with an assigned
   active task due within an hour.

The repository creates the processor but intentionally does not provision the
hosted Cron job. Deployment ownership, extension enablement and run-history
monitoring stay explicit. Supabase documents direct database-function jobs at
<https://supabase.com/docs/guides/cron/quickstart> and extension enablement at
<https://supabase.com/docs/guides/cron/install>.

Supabase Free projects may be paused after low activity; no database job runs
while a project is paused. Review
<https://supabase.com/docs/guides/platform/free-project-pausing> for current
platform behavior. This is the known free-tier availability limitation, not a
dependency on the developer laptop.

---

# Deployment Philosophy

Optimize initially for:

- zero/low fixed cost
- security
- recoverability
- portability
- simple operations

Do not optimize for hypothetical massive scale.
