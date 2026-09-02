# Changelog

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
