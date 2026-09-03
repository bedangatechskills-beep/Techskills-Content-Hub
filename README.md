# TechSkills Content Hub

Internal web app for the TechSkills.institute marketing team. Tracks every piece of social-media content from request to publish with quality gates built in, so the CEO only ever sees work that has already been checked.

The single reference for scope and decisions is the Obsidian vault at `C:\beast_mode\TechSkills Content Hub`. Start at `00 Home.md`, then `Plans/Plan Index.md`.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · shadcn/ui · Supabase (Auth, Postgres + RLS, Storage, Edge Functions) · Zod · TanStack Query · Vitest · Playwright · pgTAP.

## Standing rules

- No AI-generated video, avatars, voice or translation. AI is for QA, stock images and mockups only.
- AI never approves, moves a stage, publishes or edits approved content.
- Every state change is a Postgres function (`security definer`) that writes the append-only activity log. The UI never writes those tables directly.
- Names bind to roles and permission flags, never to people.
- Users are disabled, never deleted.

## Local development

Prerequisites: Node 22+, pnpm 11, Docker Desktop (for local Supabase).

```bash
pnpm install
cp .env.example .env.local        # then paste the keys printed by `pnpm db:start`
pnpm db:start                     # starts Postgres, Auth, applies migrations + seed
pnpm dev                          # http://localhost:3000
```

Seeded local logins (password `Password123!` for all):

| Email                        | Role                      | Notes                                            |
| ---------------------------- | ------------------------- | ------------------------------------------------ |
| app@techskills.institute     | Mentor / Content Reviewer | super admin, DM + Content Reviewer + Admin teams |
| biraj@techskills.institute   | CEO / Final Approver      | final approver, super admin                      |
| siris@techskills.institute   | DM Manager                |                                                  |
| nil@techskills.institute     | Production Manager        | Production Team supervisor                       |
| sumeej@techskills.institute  | Senior Production         |                                                  |
| prasant@techskills.institute | Junior Production         |                                                  |
| keshar@techskills.institute  | Publisher                 |                                                  |

The e-mail addresses other than `app@` are placeholders in `supabase/seed.sql`. Correct them before inviting the real team.

## Tests

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test:unit       # vitest (lib/permissions etc.)
pnpm test:db         # pgTAP RLS tests in supabase/tests (needs local Supabase running)
pnpm test:e2e        # playwright against local dev + local Supabase
```

## Hosted dev project

1. Create a Supabase project. `supabase link --project-ref <ref>` then `pnpm db:push`.
2. `pnpm functions:deploy` and set the function secret `APP_URL` to the Vercel URL.
3. In Supabase Auth settings: disable public sign-ups, add `<APP_URL>/auth/callback` to redirect URLs, set Site URL.
4. Deploy to Vercel with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.
5. Locally, with `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, run `pnpm bootstrap:admin -- "Your Name" you@techskills.institute` once. Invite everyone else from `/admin/users`.

## Layout

```
app/            routes: (auth) login/reset/invite, (app) shell + admin, auth/callback
components/     shadcn ui + shell + admin + forms
lib/            env, supabase clients, permissions, auth + admin server actions
supabase/       migrations/, seed.sql, seed_local_auth.sql, tests/ (pgTAP), functions/admin-users
scripts/        bootstrap-admin.ts
```

See `CHANGELOG.md` for what each phase delivered.

## AI provider modes

`AI_PROVIDER` (Edge Function secret on the hosted project; `supabase/functions/.env` locally) selects the adapter:

| Mode        | What happens                                                                                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock`      | Deterministic rules, instant. Used by the automated tests.                                                                                                                                                                                                                                                                            |
| `queue`     | The Edge Function assembles the prompt and parks it in `ai_evaluation_requests`. A worker evaluates it and stores the result: `pnpm ai:queue list` / `prepare <id> <dir>` / `complete <id> <result.json>`. Today the worker is the Claude Code session building the hub; results carry provider `queue`, model `claude-code-session`. |
| `anthropic` | Real model via the Anthropic SDK. `supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-…`                                                                                                                                                                                                                             |

Before running `pnpm test:e2e` locally, set `supabase/functions/.env` back to `AI_PROVIDER=mock` and restart Supabase; the browser tests expect instant results.
