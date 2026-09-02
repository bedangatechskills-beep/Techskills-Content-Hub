-- ============================================================================
-- seed.sql — the current team as invitation-pending profiles (§13).
-- Names are examples bound to roles; the app never hard-codes people.
-- E-mail addresses marked PLACEHOLDER must be corrected before inviting.
-- Runs on `supabase db reset` (local). For the hosted dev project use
-- `pnpm bootstrap:admin` then invite the rest from /admin/users.
-- ============================================================================

insert into public.profiles (full_name, email, job_title, role_id, is_final_approver, is_super_admin, account_status)
select v.full_name, v.email, v.job_title, r.id, v.is_final_approver, v.is_super_admin, 'invitation_pending'
from (values
  ('Biraj',   'biraj@techskills.institute',   'CEO',                       'ceo_final_approver',      true,  true),   -- PLACEHOLDER email
  ('Siris',   'siris@techskills.institute',   'Digital Marketing Manager', 'dm_manager',              false, false),  -- PLACEHOLDER email
  ('Nil',     'nil@techskills.institute',     'Production Manager',        'production_manager',      false, false),  -- PLACEHOLDER email
  ('Sumeej',  'sumeej@techskills.institute',  'Senior Editor',             'senior_production',       false, false),  -- PLACEHOLDER email
  ('Prasant', 'prasant@techskills.institute', 'Editor',                    'junior_production',       false, false),  -- PLACEHOLDER email
  ('Bedanga', 'app@techskills.institute',     'Mentor / Systems',          'mentor_content_reviewer', false, true),   -- builder; super admin so the system can be administered
  ('Keshar',  'keshar@techskills.institute',  'Publisher',                 'publisher',               false, false)   -- PLACEHOLDER email
) as v(full_name, email, job_title, role_key, is_final_approver, is_super_admin)
join public.roles r on r.key = v.role_key
on conflict (email) do nothing;

-- Team memberships (Roles vs Teams §13)
insert into public.team_memberships (team_id, profile_id)
select t.id, p.id
from (values
  ('biraj@techskills.institute',   'ceo'),
  ('siris@techskills.institute',   'dm'),
  ('nil@techskills.institute',     'production'),
  ('sumeej@techskills.institute',  'production'),
  ('prasant@techskills.institute', 'production'),
  ('app@techskills.institute',     'dm'),
  ('app@techskills.institute',     'content_reviewer'),
  ('app@techskills.institute',     'admin'),
  ('keshar@techskills.institute',  'dm')
) as v(email, team_key)
join public.profiles p on p.email = v.email
join public.teams t on t.key = v.team_key
on conflict do nothing;

-- Primary teams
update public.profiles p set primary_team_id = t.id
from (values
  ('biraj@techskills.institute',   'ceo'),
  ('siris@techskills.institute',   'dm'),
  ('nil@techskills.institute',     'production'),
  ('sumeej@techskills.institute',  'production'),
  ('prasant@techskills.institute', 'production'),
  ('app@techskills.institute',     'content_reviewer'),
  ('keshar@techskills.institute',  'dm')
) as v(email, team_key)
join public.teams t on t.key = v.team_key
where p.email = v.email;

-- Production Team supervisor
update public.teams t set supervisor_id = p.id
from public.profiles p
where t.key = 'production' and p.email = 'nil@techskills.institute';

-- ---------------------------------------------------------------------------
-- Phase 1 dev reference data: programs and campaigns (examples from the spec)
-- ---------------------------------------------------------------------------
insert into public.programs (name, description, location) values
  ('AI-Powered Web Application Developer Job Ready Program', 'Flagship full-stack program.', 'AU + NP'),
  ('Cyber Security Job Ready Program', 'Security fundamentals to SOC readiness.', 'AU'),
  ('Data Analytics Job Ready Program', 'Analytics and BI career track.', 'AU + NP')
on conflict (name) do nothing;

insert into public.campaigns (name, program_id, start_date, end_date, status, notes)
select v.name, p.id, v.start_date::date, v.end_date::date, v.status, v.notes
from (values
  ('September Kathmandu Intake', 'AI-Powered Web Application Developer Job Ready Program', '2026-09-01', '2026-09-30', 'active', 'NP intake push'),
  ('October Sydney Open Day', 'Cyber Security Job Ready Program', '2026-10-01', '2026-10-15', 'planned', 'North Strathfield + Rockdale')
) as v(name, program_name, start_date, end_date, status, notes)
join public.programs p on p.name = v.program_name
where not exists (select 1 from public.campaigns c where c.name = v.name);
