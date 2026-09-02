-- pgTAP: admin can create/invite, assign role and teams, disable, reactivate;
-- disabling keeps the row and every reference (§9, §117).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;

create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_super boolean default false)
returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_super_admin)
  select p_label, v_email, r.id, 'active', p_super from public.roles r where r.key = p_role_key returning id into v_pid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into fx values (p_label, v_uid, v_pid);
end $$;

create or replace function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v_uid uuid;
begin
  select uid into v_uid from fx where label = p_label;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claims', '', true); end $$;

select pg_temp.mk_user('admin1', 'admin');
select pg_temp.mk_user('super1', 'super_admin', true);

-- ---------------------------------------------------------------------------
-- Create (invite) a profile with role and two teams
-- ---------------------------------------------------------------------------
select pg_temp.login('admin1');
create temp table created as
  select * from public.admin_create_profile('New Person', 'New.Person@Test.Local', 'content_reviewer', 'Reviewer', array['dm', 'content_reviewer']);
grant select on created to authenticated;

select is((select account_status::text from created), 'invitation_pending', 'new profile starts invitation pending');
select is((select email from created), 'new.person@test.local', 'e-mail is normalised to lower case');
select is((select r.key from created c join public.roles r on r.id = c.role_id), 'content_reviewer', 'role assigned on create');
select is((select count(*) from public.team_memberships tm where tm.profile_id = (select id from created)), 2::bigint, 'two team memberships created');
select is((select t.key from created c join public.teams t on t.id = c.primary_team_id), 'dm', 'first team becomes primary');
select is((select auth_user_id from created), null, 'no auth user until the invitation is accepted');
select throws_ok($$ select public.admin_create_profile('Dup', 'new.person@test.local', 'admin') $$, '23505', null, 'duplicate e-mail rejected');
select throws_ok($$ select public.admin_create_profile('Bad', 'bad@test.local', 'not_a_role') $$, '22023', null, 'unknown role rejected');

-- Change role and teams
select lives_ok(
  $$ select public.admin_update_profile((select id from created), p_role_key := 'dm_manager', p_team_keys := array['dm']) $$,
  'admin can change role and team set');
select is((select r.key from public.profiles p join public.roles r on r.id = p.role_id where p.id = (select id from created)),
          'dm_manager', 'role changed');
select is((select count(*) from public.team_memberships where profile_id = (select id from created)), 1::bigint, 'team set replaced');

-- Invitation accepted: auth user appears with the same e-mail and gets linked
select pg_temp.logout();
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'new.person@test.local',
        crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
select isnt((select auth_user_id from public.profiles where id = (select id from created)), null, 'auth user linked on signup');

-- First sign-in completes the invitation
update auth.users set last_sign_in_at = now() where email = 'new.person@test.local';
select is((select account_status::text from public.profiles where id = (select id from created)), 'active', 'first sign-in activates the profile');

-- ---------------------------------------------------------------------------
-- Disable keeps the row and memberships; reactivate restores
-- ---------------------------------------------------------------------------
select pg_temp.login('admin1');
select lives_ok($$ select public.disable_user((select id from created)) $$, 'admin can disable');
select is((select account_status::text from public.profiles where id = (select id from created)), 'disabled', 'status is disabled');
select is((select count(*) from public.team_memberships where profile_id = (select id from created)), 1::bigint, 'memberships survive disabling');
select lives_ok($$ select public.reactivate_user((select id from created)) $$, 'admin can reactivate');
select pg_temp.logout();

select * from finish();
rollback;
