-- pgTAP: gate transitions cannot be taken with a plain stage move.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;
create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_team_key text) returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status)
  select initcap(p_label), v_email, r.id, 'active' from public.roles r where r.key = p_role_key returning id into v_pid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into public.team_memberships (team_id, profile_id) select id, v_pid from public.teams where key = p_team_key;
  insert into fx values (p_label, v_uid, v_pid);
end $$;
create or replace function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v_uid uuid;
begin
  select uid into v_uid from fx where label = p_label;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

select pg_temp.mk_user('siris', 'dm_manager', 'dm');
select pg_temp.login('siris');
create temp table rec as
  select * from public.create_content_record(jsonb_build_object('title', 'rpc only', 'region_code', 'NP',
    'content_type_id', (select id from public.content_types where key = 'reel')));
grant select on rec to authenticated;
select public.move_stage((select id from rec), 'idea_concept');
select public.move_stage((select id from rec), 'script_copy');

select throws_ok($$ select public.move_stage((select id from rec), 'script_approval') $$, '22023', null,
  'plain move into Script Approval is rejected');
select is((select count(*) from public.available_transitions((select id from rec)) where to_status = 'script_approval'), 0::bigint,
  'generic menu does not offer Submit');
select is((select count(*) from public.available_transitions((select id from rec)) where to_status = 'idea_concept'), 1::bigint,
  'ordinary backward move still offered');
select throws_ok($$ select public.internal_move_stage((select id from rec), 'script_approval') $$, '42501', null,
  'internal helper is not callable by users');

select * from finish();
rollback;
