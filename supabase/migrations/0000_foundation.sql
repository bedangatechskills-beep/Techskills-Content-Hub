-- ============================================================================
-- 0000_foundation.sql — Phase 0: roles, teams, permissions, profiles, RLS
-- Vault refs: Authentication and Login · User Profile and Account Status ·
--             Roles vs Teams · Admin and Team Management · Permissions and RLS
-- Rules: names bind to roles and flags, never people. Users are disabled,
--        never deleted. Privileged writes go through security-definer RPCs.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (§8 account status, §83 work status)
-- ---------------------------------------------------------------------------
create type public.account_status as enum (
  'active', 'invitation_pending', 'disabled', 'archived_demo'
);

create type public.work_status as enum (
  'available', 'working', 'reviewing', 'editing', 'recording', 'meeting',
  'waiting_for_feedback', 'waiting_for_approval', 'deadline_risk', 'away', 'offline'
);

-- ---------------------------------------------------------------------------
-- Roles and permissions (§12, §106) — permissions are data, not code
-- ---------------------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z_]+$'),
  name        text not null,
  description text,
  is_system   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text
);

create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- Teams (§11, §15) — supervisor FK added after profiles exists
-- ---------------------------------------------------------------------------
create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique check (key ~ '^[a-z_]+$'),
  name          text not null,
  description   text,
  supervisor_id uuid,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (§7) — one row per staff member. `id` is the profile id; the
-- Supabase auth user is linked through `auth_user_id` once the invitation is
-- accepted, so pending profiles can exist before an auth user does.
-- Passwords are never stored here.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users(id) on delete set null,
  full_name         text not null check (length(trim(full_name)) > 0),
  email             text not null unique check (email = lower(email)),
  photo_url         text,
  job_title         text,
  role_id           uuid references public.roles(id),
  account_status    public.account_status not null default 'invitation_pending',
  work_status       public.work_status not null default 'offline',
  primary_team_id   uuid references public.teams(id),
  is_final_approver boolean not null default false,
  is_super_admin    boolean not null default false,
  can_verify_nepali boolean not null default false,
  last_login_at     timestamptz,
  last_active_at    timestamptz,
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_at        timestamptz not null default now()
);

create index profiles_role_id_idx on public.profiles(role_id);
create index profiles_account_status_idx on public.profiles(account_status);

alter table public.teams
  add constraint teams_supervisor_id_fkey
  foreign key (supervisor_id) references public.profiles(id);

create table public.team_memberships (
  team_id    uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  added_by   uuid references public.profiles(id),
  primary key (team_id, profile_id)
);

create index team_memberships_profile_id_idx on public.team_memberships(profile_id);

-- ---------------------------------------------------------------------------
-- Helper functions. All are STABLE and security definer so RLS policies can
-- call them without recursing into the tables they protect.
-- ---------------------------------------------------------------------------
create or replace function public.auth_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$
  select p.* from public.profiles p where p.auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.auth_profile_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid() and p.account_status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.account_status = 'active'
      and p.is_super_admin
  );
$$;

create or replace function public.is_final_approver()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.account_status = 'active'
      and p.is_final_approver
  );
$$;

-- Permission = role permission, or super admin flag (super admin implies every
-- admin.* permission but NEVER final approval, which is its own flag).
create or replace function public.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.auth_user_id = auth.uid()
      and p.account_status = 'active'
      and perm.key = p_key
  )
  or (p_key like 'admin.%' and public.is_super_admin());
$$;

create or replace function public.in_team(p_team_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.team_memberships tm on tm.profile_id = p.id
    join public.teams t on t.id = tm.team_id
    where p.auth_user_id = auth.uid()
      and p.account_status = 'active'
      and t.key = p_team_key
      and t.is_active
  );
$$;

-- Everything the app needs after login in one call (§6 steps 2–6).
create or replace function public.my_access()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when p.id is null then null else jsonb_build_object(
    'profile', to_jsonb(p),
    'role', (select to_jsonb(r) from public.roles r where r.id = p.role_id),
    'permissions', coalesce((
      select jsonb_agg(perm.key order by perm.key)
      from public.role_permissions rp
      join public.permissions perm on perm.id = rp.permission_id
      where rp.role_id = p.role_id
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'key', t.key, 'name', t.name) order by t.name)
      from public.team_memberships tm
      join public.teams t on t.id = tm.team_id
      where tm.profile_id = p.id
    ), '[]'::jsonb)
  ) end
  from public.profiles p
  where p.auth_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Link an auth user to its invited profile by email. If no profile was
-- prepared, create a pending one with no role so an admin can finish it.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid;
begin
  update public.profiles
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null
  returning id into v_profile_id;

  if v_profile_id is null and not exists (select 1 from public.profiles where auth_user_id = new.id) then
    insert into public.profiles (auth_user_id, full_name, email, account_status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      lower(new.email),
      'invitation_pending'
    );
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- First successful sign-in completes the invitation; every sign-in stamps
-- last_login_at. Disabled accounts are never reactivated here.
create or replace function public.handle_auth_user_signed_in()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
    update public.profiles
       set last_login_at  = new.last_sign_in_at,
           last_active_at = new.last_sign_in_at,
           account_status = case when account_status = 'invitation_pending' then 'active' else account_status end
     where auth_user_id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_auth_user_signed_in();

-- Users may edit only their own non-privileged fields directly. Role, flags,
-- status, email and team assignment change only through admin RPCs below.
create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql as $$
begin
  -- Security-definer admin RPCs run as their owner (postgres), as do
  -- migrations, seed and the service role. Plain authenticated callers never
  -- pass this check.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.role_id           is distinct from old.role_id
  or new.is_final_approver is distinct from old.is_final_approver
  or new.is_super_admin    is distinct from old.is_super_admin
  or new.can_verify_nepali is distinct from old.can_verify_nepali
  or new.account_status    is distinct from old.account_status
  or new.email             is distinct from old.email
  or new.primary_team_id   is distinct from old.primary_team_id
  or new.auth_user_id      is distinct from old.auth_user_id
  or new.created_by        is distinct from old.created_by
  or new.created_at        is distinct from old.created_at
  or new.last_login_at     is distinct from old.last_login_at
  then
    raise exception 'privileged profile fields can only be changed by an administrator action'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Admin RPCs (security definer). Each validates permission first.
-- ---------------------------------------------------------------------------
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('admin.users') then
    raise exception 'admin.users permission required' using errcode = '42501';
  end if;
end $$;

-- Create a staff profile (invitation pending). The Edge Function then sends
-- the Supabase invitation e-mail; the auth trigger links by e-mail.
create or replace function public.admin_create_profile(
  p_full_name text,
  p_email     text,
  p_role_key  text,
  p_job_title text default null,
  p_team_keys text[] default '{}'
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
  v_profile public.profiles;
  v_me uuid := public.auth_profile_id();
begin
  perform public.assert_admin();

  select id into v_role_id from public.roles where key = p_role_key;
  if v_role_id is null then
    raise exception 'unknown role %', p_role_key using errcode = '22023';
  end if;

  insert into public.profiles (full_name, email, job_title, role_id, created_by)
  values (trim(p_full_name), lower(trim(p_email)), p_job_title, v_role_id, v_me)
  returning * into v_profile;

  insert into public.team_memberships (team_id, profile_id, added_by)
  select t.id, v_profile.id, v_me from public.teams t where t.key = any(p_team_keys);

  if cardinality(p_team_keys) > 0 then
    update public.profiles
       set primary_team_id = (select t.id from public.teams t where t.key = p_team_keys[1])
     where id = v_profile.id;
  end if;

  select * into v_profile from public.profiles where id = v_profile.id;
  return v_profile;
end $$;

-- Update profile details, role and team membership. Flags are separate.
create or replace function public.admin_update_profile(
  p_profile_id      uuid,
  p_full_name       text default null,
  p_email           text default null,
  p_job_title       text default null,
  p_role_key        text default null,
  p_primary_team_key text default null,
  p_team_keys       text[] default null
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles;
  v_me uuid := public.auth_profile_id();
begin
  perform public.assert_admin();

  -- Nobody may change their own role.
  if p_role_key is not null and p_profile_id = v_me then
    raise exception 'you cannot change your own role' using errcode = '42501';
  end if;

  update public.profiles p
     set full_name       = coalesce(nullif(trim(p_full_name), ''), p.full_name),
         email           = coalesce(lower(nullif(trim(p_email), '')), p.email),
         job_title       = coalesce(p_job_title, p.job_title),
         role_id         = coalesce((select r.id from public.roles r where r.key = p_role_key), p.role_id),
         primary_team_id = coalesce((select t.id from public.teams t where t.key = p_primary_team_key), p.primary_team_id)
   where p.id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_team_keys is not null then
    delete from public.team_memberships tm
     where tm.profile_id = p_profile_id
       and tm.team_id not in (select t.id from public.teams t where t.key = any(p_team_keys));
    insert into public.team_memberships (team_id, profile_id, added_by)
    select t.id, p_profile_id, v_me from public.teams t
     where t.key = any(p_team_keys)
    on conflict do nothing;
    -- primary team must be one of the memberships
    update public.profiles set primary_team_id = null
     where id = p_profile_id
       and primary_team_id is not null
       and primary_team_id not in (select team_id from public.team_memberships where profile_id = p_profile_id);
    select * into v_profile from public.profiles where id = p_profile_id;
  end if;

  return v_profile;
end $$;

-- Final Approver flag: independent of Admin (§14). Admins toggle it for
-- others, never for themselves.
create or replace function public.admin_set_final_approver(p_profile_id uuid, p_value boolean)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  perform public.assert_admin();
  if p_profile_id = public.auth_profile_id() then
    raise exception 'you cannot change your own Final Approver flag' using errcode = '42501';
  end if;
  update public.profiles set is_final_approver = p_value where id = p_profile_id returning * into v_profile;
  if v_profile.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return v_profile;
end $$;

-- Super Admin flag: only super admins grant it, never to themselves.
create or replace function public.admin_set_super_admin(p_profile_id uuid, p_value boolean)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  if not public.is_super_admin() then
    raise exception 'super admin required' using errcode = '42501';
  end if;
  if p_profile_id = public.auth_profile_id() then
    raise exception 'you cannot change your own Super Admin flag' using errcode = '42501';
  end if;
  update public.profiles set is_super_admin = p_value where id = p_profile_id returning * into v_profile;
  if v_profile.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return v_profile;
end $$;

create or replace function public.admin_set_can_verify_nepali(p_profile_id uuid, p_value boolean)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  perform public.assert_admin();
  update public.profiles set can_verify_nepali = p_value where id = p_profile_id returning * into v_profile;
  if v_profile.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return v_profile;
end $$;

-- Disable keeps the row and every reference (§9). Session revocation is done
-- by the admin-users Edge Function (auth.admin ban) after this succeeds.
create or replace function public.disable_user(p_profile_id uuid)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  perform public.assert_admin();
  if p_profile_id = public.auth_profile_id() then
    raise exception 'you cannot disable your own account' using errcode = '42501';
  end if;
  update public.profiles
     set account_status = 'disabled', work_status = 'offline'
   where id = p_profile_id
  returning * into v_profile;
  if v_profile.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return v_profile;
end $$;

create or replace function public.reactivate_user(p_profile_id uuid)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  perform public.assert_admin();
  update public.profiles
     set account_status = (case when auth_user_id is null then 'invitation_pending' else 'active' end)::public.account_status
   where id = p_profile_id and account_status = 'disabled'
  returning * into v_profile;
  if v_profile.id is null then raise exception 'profile not found or not disabled' using errcode = 'P0002'; end if;
  return v_profile;
end $$;

-- Teams
create or replace function public.admin_upsert_team(
  p_key text, p_name text, p_description text default null,
  p_supervisor_id uuid default null, p_is_active boolean default true
) returns public.teams
language plpgsql security definer set search_path = public as $$
declare v_team public.teams;
begin
  perform public.assert_admin();
  insert into public.teams (key, name, description, supervisor_id, is_active)
  values (lower(trim(p_key)), trim(p_name), p_description, p_supervisor_id, p_is_active)
  on conflict (key) do update
    set name = excluded.name,
        description = excluded.description,
        supervisor_id = excluded.supervisor_id,
        is_active = excluded.is_active
  returning * into v_team;
  return v_team;
end $$;

create or replace function public.admin_set_team_members(p_team_id uuid, p_profile_ids uuid[])
returns setof public.team_memberships
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id();
begin
  perform public.assert_admin();
  delete from public.team_memberships where team_id = p_team_id and not (profile_id = any(p_profile_ids));
  insert into public.team_memberships (team_id, profile_id, added_by)
  select p_team_id, unnest(p_profile_ids), v_me
  on conflict do nothing;
  return query select * from public.team_memberships where team_id = p_team_id;
end $$;

-- Own profile (non-privileged fields only)
create or replace function public.update_own_profile(
  p_full_name text default null, p_photo_url text default null,
  p_job_title text default null, p_work_status public.work_status default null
) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  if not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  update public.profiles p
     set full_name   = coalesce(nullif(trim(p_full_name), ''), p.full_name),
         photo_url   = coalesce(p_photo_url, p.photo_url),
         job_title   = coalesce(p_job_title, p.job_title),
         work_status = coalesce(p_work_status, p.work_status),
         last_active_at = now()
   where p.auth_user_id = auth.uid()
  returning * into v_profile;
  return v_profile;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.teams            enable row level security;
alter table public.profiles         enable row level security;
alter table public.team_memberships enable row level security;

-- Reference tables: any active user reads; only admins write (via RPC).
create policy roles_select on public.roles for select to authenticated
  using (public.is_active_user());
create policy permissions_select on public.permissions for select to authenticated
  using (public.is_active_user());
create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.is_active_user());
create policy teams_select on public.teams for select to authenticated
  using (public.is_active_user());
create policy team_memberships_select on public.team_memberships for select to authenticated
  using (public.is_active_user());

-- Profiles: active users read all colleagues (Team Board later). Disabled and
-- pending users read nothing here; the app explains their status through the
-- security-definer my_access() function instead.
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user());

-- Direct update: own row only; the trigger blocks privileged columns.
create policy profiles_update_own on public.profiles for update to authenticated
  using (auth_user_id = auth.uid() and public.is_active_user())
  with check (auth_user_id = auth.uid());

-- No direct insert/delete for anyone but the service role (RPCs are definer).

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to anon, authenticated;
grant select on public.roles, public.permissions, public.role_permissions,
                public.teams, public.profiles, public.team_memberships to authenticated;
grant update on public.profiles to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.auth_profile(), public.auth_profile_id(), public.is_active_user(),
  public.is_super_admin(), public.is_final_approver(), public.has_permission(text),
  public.in_team(text), public.my_access(),
  public.admin_create_profile(text, text, text, text, text[]),
  public.admin_update_profile(uuid, text, text, text, text, text, text[]),
  public.admin_set_final_approver(uuid, boolean),
  public.admin_set_super_admin(uuid, boolean),
  public.admin_set_can_verify_nepali(uuid, boolean),
  public.disable_user(uuid), public.reactivate_user(uuid),
  public.admin_upsert_team(text, text, text, uuid, boolean),
  public.admin_set_team_members(uuid, uuid[]),
  public.update_own_profile(text, text, text, public.work_status)
to authenticated;

-- ---------------------------------------------------------------------------
-- System seed: roles, permissions, role_permissions, teams. Lives in the
-- migration (not seed.sql) because the app cannot function without it.
-- ---------------------------------------------------------------------------
insert into public.roles (key, name, description) values
  ('super_admin',             'Super Admin',             'Everything Admin can do, plus granting Admin and Super Admin. Does not imply Final Approver.'),
  ('admin',                   'Admin',                   'Manages users, teams and system configuration. Never Final Approver by itself.'),
  ('ceo_final_approver',      'CEO / Final Approver',    'Script approval and final approval. Carries the Final Approver flag.'),
  ('dm_manager',              'DM Manager',              'Owns concept, script, DM/brand review, scheduling.'),
  ('production_manager',      'Production Manager',      'Assigns production work and runs Production Review.'),
  ('senior_production',       'Senior Production',       'Updates assigned production work. Seniority does not drive assignment.'),
  ('junior_production',       'Junior Production',       'Updates assigned production work.'),
  ('mentor_content_reviewer', 'Mentor / Content Reviewer','Content reviewer who is also a mentor.'),
  ('content_reviewer',        'Content Reviewer',        'Rates content at the optional Content Review stage.'),
  ('publisher',               'Publisher',               'Confirms schedule, publishes, ticks AI disclosure (Decision D3).');

insert into public.permissions (key, description) values
  ('content.create',            'Create a Content Record'),
  ('content.edit_concept',      'Edit idea and concept fields'),
  ('content.view_all',          'View all internal content'),
  ('script.edit',               'Edit script / copy versions'),
  ('script.submit',             'Submit a script for approval'),
  ('script.approve',            'Approve or return a script'),
  ('production.assign',         'Assign production work and create tasks'),
  ('production.review',         'Pass or return production output'),
  ('production.update_own',     'Update own assigned production work'),
  ('dm.review',                 'DM / brand review decisions'),
  ('review.rate',               'Submit content reviewer ratings'),
  ('review.override_threshold', 'Override a below-threshold review with reason'),
  ('final.approve',             'Final approval actions (also requires the Final Approver flag)'),
  ('publish.schedule',          'Schedule approved content'),
  ('publish.publish',           'Mark content published and confirm AI disclosure'),
  ('admin.users',               'Manage users, roles, flags and teams'),
  ('admin.reference_data',      'Manage system reference data');

with rp(role_key, perm_key) as (
  values
  ('super_admin', 'admin.users'), ('super_admin', 'admin.reference_data'), ('super_admin', 'content.view_all'),
  ('admin', 'admin.users'), ('admin', 'admin.reference_data'), ('admin', 'content.view_all'),
  ('ceo_final_approver', 'script.approve'), ('ceo_final_approver', 'final.approve'),
  ('ceo_final_approver', 'review.override_threshold'), ('ceo_final_approver', 'content.view_all'),
  ('dm_manager', 'content.create'), ('dm_manager', 'content.edit_concept'), ('dm_manager', 'script.edit'),
  ('dm_manager', 'script.submit'), ('dm_manager', 'dm.review'), ('dm_manager', 'review.override_threshold'),
  ('dm_manager', 'publish.schedule'), ('dm_manager', 'publish.publish'), ('dm_manager', 'content.view_all'),
  ('production_manager', 'production.assign'), ('production_manager', 'production.review'),
  ('production_manager', 'content.edit_concept'), ('production_manager', 'script.edit'),
  ('production_manager', 'content.view_all'),
  ('senior_production', 'production.update_own'), ('senior_production', 'content.view_all'),
  ('junior_production', 'production.update_own'), ('junior_production', 'content.view_all'),
  ('mentor_content_reviewer', 'review.rate'), ('mentor_content_reviewer', 'content.view_all'),
  ('content_reviewer', 'review.rate'), ('content_reviewer', 'content.view_all'),
  ('publisher', 'publish.publish'), ('publisher', 'content.view_all')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from rp join public.roles r on r.key = rp.role_key join public.permissions p on p.key = rp.perm_key;

insert into public.teams (key, name, description) values
  ('admin',            'Admin Team',            'System administration.'),
  ('dm',               'DM Team',               'Digital marketing: strategy, concept, messaging, scripts, publishing.'),
  ('production',       'Production Team',       'Creative production, design, video and delivery. All human work.'),
  ('content_reviewer', 'Content Reviewer Team', 'Optional independent content quality review.'),
  ('ceo',              'CEO Team',              'Management oversight and final approval.');
