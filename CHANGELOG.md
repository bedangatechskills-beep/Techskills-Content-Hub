# Changelog

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

Verified locally after installing Docker Desktop: `supabase start` applies migration and seeds; `supabase test db` 43/43; Playwright 3/3; Edge Function invite verified against the local edge runtime and Mailpit. Fixes from those runs: guard trigger now checks `current_user` (was `session_user`), `reactivate_user` casts its enum, transaction-local bypass setting removed as redundant. Types now generated (`database.generated.ts`). Still to do: hosted Supabase + Vercel dev deploy and inviting the real team.
