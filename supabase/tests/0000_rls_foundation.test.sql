-- pgTAP tests for Phase 0 RLS and admin RPCs. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

-- ---------------------------------------------------------------------------
-- Fixtures: one auth user + profile per role we need. Created as postgres.
-- ---------------------------------------------------------------------------
create temp table fx (label text primary key, uid uuid, pid uuid, email text);
grant select on fx to authenticated;

create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_active boolean default true,
                                           p_final boolean default false, p_super boolean default false)
returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_final_approver, is_super_admin)
  select p_label, v_email, r.id, case when p_active then 'active' else 'disabled' end::public.account_status, p_final, p_super
  from public.roles r where r.key = p_role_key returning id into v_pid;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  insert into fx values (p_label, v_uid, v_pid, v_email);
end $$;

create or replace function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v_uid uuid;
begin
  select uid into v_uid from fx where label = p_label;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

select pg_temp.mk_user('admin1',    'admin');
select pg_temp.mk_user('super1',    'super_admin', true, false, true);
select pg_temp.mk_user('ceo1',      'ceo_final_approver', true, true, false);
select pg_temp.mk_user('dm1',       'dm_manager');
select pg_temp.mk_user('reviewer1', 'content_reviewer');
select pg_temp.mk_user('prod1',     'senior_production');
select pg_temp.mk_user('disabled1', 'dm_manager', false);

-- Trigger linked auth users to profiles by e-mail
select is((select count(*) from public.profiles p join fx on fx.pid = p.id where p.auth_user_id = fx.uid), 7::bigint,
          'auth users are linked to their invited profiles by e-mail');

-- ---------------------------------------------------------------------------
-- 1. Disabled user reads nothing
-- ---------------------------------------------------------------------------
select pg_temp.login('disabled1');
select is((select count(*) from public.profiles), 0::bigint, 'disabled user cannot read profiles');
select is((select count(*) from public.roles), 0::bigint, 'disabled user cannot read roles');
select is((select count(*) from public.teams), 0::bigint, 'disabled user cannot read teams');
select is(public.is_active_user(), false, 'disabled user is not active');
select is((public.my_access() -> 'profile' ->> 'account_status'), 'disabled', 'my_access still explains the disabled status');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 2. Active user reads colleagues; permissions resolve from role
-- ---------------------------------------------------------------------------
select pg_temp.login('dm1');
select ok((select count(*) from public.profiles) >= 7, 'active user reads all profiles');
select is(public.has_permission('dm.review'), true, 'DM manager has dm.review');
select is(public.has_permission('final.approve'), false, 'DM manager lacks final.approve');
select is(public.has_permission('admin.users'), false, 'DM manager lacks admin.users');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 3. DM cannot grant self admin / super admin
-- ---------------------------------------------------------------------------
select pg_temp.login('dm1');
select throws_ok(
  $$ update public.profiles set role_id = (select id from public.roles where key = 'admin')
     where auth_user_id = auth.uid() $$,
  '42501', null, 'DM cannot change own role by direct update');
select throws_ok(
  $$ update public.profiles set is_super_admin = true where auth_user_id = auth.uid() $$,
  '42501', null, 'DM cannot set own super admin flag');
select throws_ok(
  $$ select public.admin_update_profile((select pid from fx where label = 'dm1'), p_role_key := 'admin') $$,
  '42501', null, 'DM cannot use the admin RPC');
select throws_ok(
  $$ select public.admin_set_super_admin((select pid from fx where label = 'dm1'), true) $$,
  '42501', null, 'DM cannot use the super admin RPC');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 4. Reviewer cannot change another user's role
-- ---------------------------------------------------------------------------
select pg_temp.login('reviewer1');
-- RLS filters the row out: the statement succeeds but touches nothing.
update public.profiles set role_id = (select id from public.roles where key = 'admin')
 where id = (select pid from fx where label = 'dm1');
select pg_temp.logout();
select is((select r.key from public.profiles p join public.roles r on r.id = p.role_id where p.id = (select pid from fx where label = 'dm1')),
          'dm_manager', 'reviewer update of another profile is a no-op under RLS');

select pg_temp.login('reviewer1');
select lives_ok($$ select public.update_own_profile(p_full_name := 'Reviewer One') $$, 'reviewer can update own name');
select pg_temp.logout();
select is((select full_name from public.profiles where id = (select pid from fx where label = 'reviewer1')), 'Reviewer One',
          'own profile update persisted');

-- ---------------------------------------------------------------------------
-- 5. Final Approver flag independent of admin
-- ---------------------------------------------------------------------------
select pg_temp.login('admin1');
select is(public.is_final_approver(), false, 'admin is not a final approver by default');
select throws_ok(
  $$ select public.admin_set_final_approver((select pid from fx where label = 'admin1'), true) $$,
  '42501', null, 'admin cannot grant self the Final Approver flag');
select lives_ok(
  $$ select public.admin_set_final_approver((select pid from fx where label = 'dm1'), true) $$,
  'admin can toggle Final Approver for another user');
select lives_ok(
  $$ select public.admin_set_final_approver((select pid from fx where label = 'dm1'), false) $$,
  'admin can revoke Final Approver for another user');
select pg_temp.logout();

select pg_temp.login('ceo1');
select is(public.is_final_approver(), true, 'CEO profile carries the Final Approver flag');
select is(public.has_permission('admin.users'), false, 'Final Approver does not imply admin');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 6. Super admin implies admin.* but never final approval
-- ---------------------------------------------------------------------------
select pg_temp.login('super1');
select is(public.has_permission('admin.reference_data'), true, 'super admin has admin.* permissions');
select is(public.is_final_approver(), false, 'super admin is not a final approver');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 7. Production user cannot touch privileged columns of self
-- ---------------------------------------------------------------------------
select pg_temp.login('prod1');
select throws_ok(
  $$ update public.profiles set is_final_approver = true where auth_user_id = auth.uid() $$,
  '42501', null, 'production user cannot grant self Final Approver');
select pg_temp.logout();

select * from finish();
rollback;
