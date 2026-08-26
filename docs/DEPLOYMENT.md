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

# Hosted Whiteboard Realtime

After applying `20260825000700_extend_collaboration_enums.sql` and
`20260825000710_whiteboard_collaboration.sql` to hosted Supabase:

1. In Realtime Settings, disable **Allow public access** so only private channels
   authorized by `realtime.messages` RLS policies can connect.
2. Confirm the `supabase_realtime` publication contains `board_elements` and
   `board_comments`. The migration adds these tables idempotently; no dashboard
   publication edit should normally be required.
3. Keep table RLS enabled. Postgres Changes authorization comes from the existing
   organization-member SELECT policies, while Presence uses the private
   `board:<uuid>` topic policies created by the migration.
4. Perform the documented two-browser test with two organization members, then a
   VIEWER and a user from another organization. Confirm channel cleanup by closing
   one board and observing Presence update.

Do not enable public board channels or publish additional tables for TASK-007.

---

# Team Invitation Delivery

Apply `20260825000720_organization_team_invitations.sql` before TASK-007
multi-user QA. OWNER/ADMIN creates an invitation on Team and copies the displayed
seven-day link for manual sharing. Regeneration invalidates the previous link.

Transactional email is not configured and the UI does not claim delivery. A
future provider may send the same application-generated link, but must not receive
database credentials or bypass the invitation acceptance function.

---

# Hosted Plugin Framework

Apply `20260825000800_plugin_framework.sql` before TASK-008 hosted QA. No hosted
extension, worker, service-role credential, plugin package download or secret
configuration is required.

After migration, use two organizations and OWNER/ADMIN/MEMBER/VIEWER accounts to
verify Apps state isolation, manager-only enablement, enabled navigation and the
guarded `/apps/example` route. Disablement must hide and deny the example route
without deleting its `organization_plugins` row.

---

# Deployment Philosophy

Optimize initially for:

- zero/low fixed cost
- security
- recoverability
- portability
- simple operations

Do not optimize for hypothetical massive scale.
