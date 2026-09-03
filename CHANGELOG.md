# Changelog

## Phase 3 — Production and Workload (2026-09-03)

Nil can delegate, editors work tasks and upload review versions, Nil passes or returns production, and everyone sees who has what on the Team Board and a per-person backlog.

- Migration `0004_production.sql`: `production_tasks`, `assignments`, `creative_versions` (private Storage bucket `creatives`, signed uploads, RLS by assignee/manager/DM), `production_reviews` (immutable, checklist from `app_settings`), workload thresholds; views `v_active_work`, `v_workload` (§77 counting, §78 status), `v_unassigned_work`, `v_dm_stats`, `v_ceo_stats`; `person_backlog(profile)` (five groups, next-actor derived from stage + permissions); Realtime on `content_records`, `production_tasks`, `profiles`; production transitions marked RPC-only.
- RPCs: `assign_production` (the §80 cascade: assignment row, record, activity, notification, Ready → Production), `create_task`, `update_task` (assignee or manager), `register_creative_version` (after a signed upload; flags creative-after-approval for Phase 5), `submit_for_production_review` (needs a creative and the folder link), `production_review` (pass → DM review; changes → back with a reason), `set_work_status`.
- Screens: Production tab (assignment with history, folder link with validation and missing warning, tasks with inline status, creative gallery with previews and downloads, submit, production review with checklist, review history), `/team` Team Board in the exact §73 order with live refresh and Assign dialog with workload hints, `/production` manager overview, `/people/[id]/backlog` and `/me` with the five groups and header counts matching the Team Board, work status selector.
- Tests: pgTAP 34 new (156 total), Playwright demo path (assign from Unassigned → Sumeej leads the board → task done → upload → folder → submit → return with reason → re-upload → pass → backlog shows history).
- Decisions S23–S25 recorded. Hosted: migration pushed.

Not done: thumbnail/poster-frame generation (previews use signed URLs and native video), task-due-today cron notification (Phase 6 notification rules).


## Phase 2 — Script Gate (2026-09-02)

The first real quality gate: scripts are versioned in the app, an AI evaluation scores each version and raises hard compliance flags, the approver pins a specific version, and any material change afterwards is detected and forces re-approval.

- Migrations `0002_script_gate.sql` and `0003_rpc_only_transitions.sql`: `script_versions` (append-only, draft/submitted/approved/superseded/changes_requested), `script_approvals` (immutable), `ai_evaluations` (provider, model, prompt_version, input_hash, scores, recommendations, hard_flags, verdict, requester), `ai_flag_resolutions`, `app_settings` (`require_ai_before_submit`, `script_reapproval_required`); FKs from `content_records` to current/approved versions; `v_script_approval_queue`; Kanban view gains latest AI score; gate transitions marked `rpc_only` so a plain Kanban move cannot skip the AI requirement.
- RPCs: `create_script_version`, `mark_version_material` (material → old approval superseded, pointer cleared, record back to Script Approval, approvers notified), `submit_script_for_approval` (requires an AI check when configured), `approve_script`, `request_script_changes`, `resolve_ai_flag` (dismiss needs a reason), `verify_nepali` (needs the `can_verify_nepali` flag), service-only `record_ai_evaluation` (writes evaluation + activity + notifications, sets Nepali verification pending; never moves a stage).
- AI layer in `lib/ai/` shared by Next and Deno: Zod schemas (9 categories, 10 hard-flag keys, ≤3 recommendations), prompt `script.v1`, provider interface with `mock` (deterministic rules) and `anthropic` (structured outputs, `claude-opus-5`) adapters, SHA-256 input hash for idempotency. Edge Function `evaluate-script` checks the caller via RPC, assembles record + reference data, calls the provider, stores through `record_ai_evaluation`.
- Screens: Script tab (editor → new version, current vs approved pills, SCRIPT CHANGED AFTER APPROVAL banner with material/non-material prompt, AI check card with flags → resolve/dismiss, category bars, recommendations; submit; approver actions; versions with word diff; approvals history; Nepali verification), `/approvals/scripts` queue and detail, AI score badge on Kanban cards.
- Tests: pgTAP 44 new assertions (122 total), Vitest 36 (golden cases: typo, guaranteed job, retired handle, Nepali on AU vs NP, proper nouns, Active IT framing, missing CTA; hashing; provider selection), Playwright demo path (V1 flagged → V2 clean → submit → approve → V3 material → re-approval → activity).
- Decisions S19–S21 recorded. Hosted: migrations pushed, `evaluate-script` deployed with `AI_PROVIDER=mock`.

To switch on the real model: `supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-…` (optional `ANTHROPIC_MODEL`). Golden cases against the real provider are a manual check after that.

## Phase 1 — Content Record and Workflow Engine (2026-09-02)

One master Content Record with a permanent ID, moved through 16 stages under database-enforced permission rules, with every move in the Activity tab and on a Kanban board.

- Migration `0001_content_core.sql`: reference tables (regions, campuses, programs, campaigns, platforms, objectives, content pillars, differentiators, content types, reference handles incl. the retired `@techskillsitcareer`, brand facts), `workflow_statuses` (16), `allowed_transitions` (33 rows keyed by permission), `content_records` + platforms/differentiators, `content_id_sequences`, `activity_log`, `stage_history` (generated duration, one open row per record), `comments`, `notifications`; views `v_kanban_cards` (card fields, overdue, live stalled flag) and `v_stage_durations`.
- RPCs: `create_content_record` (generates `TS-{AU|NP}-{YYMM}-{seq}` in the region timezone), `move_stage` (transition lookup by caller permission, reason enforcement, Final Approver flag for Final Approved, stage history, activity, next-actor notifications), `update_content_fields` (permission by field group, specific audit events for priority, folder link, assignment, due dates), `add_comment`/`edit_comment`/`resolve_comment`, `available_transitions`, `mark_notifications_read`.
- pgTAP: 35 assertions (ID generation and independence per region, permissions, forward/backward moves, reasons stored, stage-history integrity, Final Approver gate, field-change events, mentions).
- Screens: `/content` list with filters, `/content/new` intake (region, campus, content type required, "One-off" allowed), `/content/[id]` record page (header with status pill, live stage timer, priority, owners, due dates, "Updated x ago by y", stalled/overdue; move actions with reason dialog; tabs Overview / Script / Production / Reviews / Comments / Activity), `/board` Kanban with drag-and-drop, optimistic move, reason prompt, DB rejection rollback, `/admin/reference` CRUD for all reference tables (soft delete only).
- Playwright: demo path (Siris creates and moves to Script; Sumeej sees no forward actions; Nil moves back with a reason; Activity shows all events; card on board).
- Decisions S14–S18 recorded in the vault (video type list, live stalled flag instead of a cron job, reference data edited under RLS, region-timezone month segment, content-review skip rule).

Not yet: comment editing UI (RPC exists), Edge-Function stalled job (replaced by the view column), Phase 6 notification rules (minimal next-actor notifications only).

## Phase 0 — Foundation (2026-09-02)

Deployed-ready empty app where the team can log in; roles, teams and permissions exist as data with RLS enforcing them.

- Next.js 15 + TypeScript strict + Tailwind 4 + shadcn/ui scaffold, Vitest, Playwright, Prettier, GitHub Actions (lint, typecheck, unit, pgTAP).
- Migration `0000_foundation.sql`: `roles`, `permissions`, `role_permissions`, `teams`, `profiles`, `team_memberships`; enums for account and work status; helper functions `auth_profile()`, `is_active_user()`, `has_permission()`, `in_team()`, `is_final_approver()`, `is_super_admin()`, `my_access()`; admin RPCs for create/update/flags/disable/reactivate/teams; auth triggers that link invited profiles by e-mail and activate on first sign-in; a trigger that blocks privileged column changes outside admin RPCs; RLS baseline; system seed for 10 roles, 17 permissions, 5 teams.
- `seed.sql` creates the current team as invitation-pending profiles; `seed_local_auth.sql` adds local-only auth users.
- pgTAP tests: disabled user reads nothing; DM cannot grant self admin; reviewer cannot change another's role; Final Approver flag independent of admin; super admin implies admin.* but never final approval; create/assign/disable/reactivate lifecycle keeps history.
- Auth: email + password sign-in, sign-out, forgot/reset password, invitation with first-time password setup, disabled-account block (middleware + auth ban), session persistence via `@supabase/ssr`.
- Edge Function `admin-users`: invite, resend invite, send reset, disable (bans auth user), reactivate. Runs the DB RPC as the caller first, then uses the service role only for auth.admin.
- Admin screens: users list, invite, user detail (profile/role/teams form, Final Approver / Super Admin / Nepali flags, lifecycle actions), teams list, new team, team detail with supervisor and members.
- App shell with permission-aware sidebar, placeholder dashboard, 403 and 404 pages.

Deviations from the plan file, recorded in the vault: `profiles.id` is its own uuid with a nullable `auth_user_id` link (so pending profiles can exist before an auth user); one Edge Function `admin-users` with actions instead of a separate `invite-user`; invitation route is `/invite` (Supabase carries the token); Nepali verifier flag exposed in the admin UI already (S8).

Verified locally after installing Docker Desktop: `supabase start` applies migration and seeds; `supabase test db` 43/43; Playwright 3/3; Edge Function invite verified against the local edge runtime and Mailpit. Fixes from those runs: guard trigger now checks `current_user` (was `session_user`), `reactivate_user` casts its enum, transaction-local bypass setting removed as redundant. Types now generated (`database.generated.ts`). Hosted dev deployed 2026-09-02 (Supabase `content-hub-dev`, Vercel `techskills-content-hub`). First real invitation exposed a bug: admin-generated links use the implicit flow and return tokens in the URL fragment, which the PKCE-configured browser client ignores. `/auth/callback` now hands those to `/auth/complete`, which sets the session from the fragment and hard-navigates on. Verified headlessly against the local stack: invite link → set password → dashboard.
