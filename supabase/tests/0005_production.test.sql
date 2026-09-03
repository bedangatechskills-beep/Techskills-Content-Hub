-- pgTAP: Phase 3 — assignment cascade, tasks, creative versions, production
-- review, workload and Team Board ordering, person backlog.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;
create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_team_key text, p_final boolean default false) returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_final_approver)
  select initcap(p_label), v_email, r.id, 'active', p_final from public.roles r where r.key = p_role_key returning id into v_pid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into public.team_memberships (team_id, profile_id) select id, v_pid from public.teams where key = p_team_key;
  insert into fx values (p_label, v_uid, v_pid);
end $$;
create or replace function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v_uid uuid; begin select uid into v_uid from fx where label = p_label;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true); perform set_config('role', 'authenticated', true); end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claims', '', true); end $$;

select pg_temp.mk_user('siris',   'dm_manager', 'dm');
select pg_temp.mk_user('nil',     'production_manager', 'production');
select pg_temp.mk_user('sumeej',  'senior_production', 'production');
select pg_temp.mk_user('prasant', 'junior_production', 'production');
select pg_temp.mk_user('biraj',   'ceo_final_approver', 'ceo', true);

-- Record moved to Ready for Production directly (script gate covered elsewhere)
select pg_temp.login('siris');
create temp table rec as
  select * from public.create_content_record(jsonb_build_object('title', 'Prod test', 'region_code', 'NP',
    'content_type_id', (select id from public.content_types where key = 'reel'), 'production_due', (current_date - 1)::text));
grant select on rec to authenticated;
select pg_temp.logout();
update public.content_records set status_key = 'ready_for_production' where id = (select id from rec);
update public.stage_history set exited_at = now() where content_id = (select id from rec) and exited_at is null;
insert into public.stage_history (content_id, status_key) values ((select id from rec), 'ready_for_production');

-- ---------------------------------------------------------------------------
-- 1. Unassigned work and assignment cascade (§80)
-- ---------------------------------------------------------------------------
select pg_temp.login('nil');
select is((select count(*) from public.v_unassigned_work where id = (select id from rec)), 1::bigint, 'record appears in Unassigned Work');
select is((select active_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')), 0, 'Sumeej starts with zero active work');
select lives_ok($$ select public.assign_production((select id from rec), (select pid from fx where label = 'sumeej')) $$, 'manager assigns');
select is((select count(*) from public.v_unassigned_work where id = (select id from rec)), 0::bigint, 'record leaves Unassigned Work');
select is((select status_key from public.content_records where id = (select id from rec)), 'production', 'assignment from Ready for Production starts Production');
select is((select active_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')), 1, 'Sumeej workload increments');
select is((select overdue_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')), 1, 'overdue counted (production due yesterday)');
select is((select count(*) from public.assignments where content_id = (select id from rec) and unassigned_at is null), 1::bigint, 'one open assignment row');
select is((select event_type from public.activity_log where content_id = (select id from rec) and event_type in ('assignment','reassignment') order by created_at desc limit 1), 'assignment', 'assignment logged');
select throws_ok($$ select public.assign_production((select id from rec), (select pid from fx where label = 'prasant')) $$, '23514', null, 'reassignment needs a reason');
select pg_temp.logout();
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'sumeej') and type = 'content_assigned'), 1::bigint, 'assignee notified');

-- Production users cannot assign
select pg_temp.login('sumeej');
select throws_ok($$ select public.assign_production((select id from rec), (select pid from fx where label = 'prasant'), 'x') $$, '42501', null, 'editor cannot assign');
select pg_temp.logout();

-- Team Board ordering: Sumeej (1 active) above Prasant (0)
select is((select array_agg(full_name order by active_count desc, overdue_count desc, stalled_count desc, full_name) from public.v_workload where in_production and profile_id in (select pid from fx)),
          array['Sumeej','Nil','Prasant'], 'production section sorts by active workload, then name');

-- ---------------------------------------------------------------------------
-- 2. Tasks
-- ---------------------------------------------------------------------------
select pg_temp.login('nil');
create temp table t1 as select * from public.create_task((select id from rec), 'Edit video', null, 'edit', null, 'normal', null, current_date);
grant select on t1 to authenticated;
select is((select assignee_id from t1), (select pid from fx where label = 'sumeej'), 'task defaults to the record assignee');
select pg_temp.logout();
select is((select active_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')), 2, 'open task adds to workload');

select pg_temp.login('prasant');
select throws_ok($$ select public.update_task((select id from t1), '{"status":"done"}'::jsonb) $$, '42501', null, 'another editor cannot complete the task');
select pg_temp.logout();
select pg_temp.login('sumeej');
select lives_ok($$ select public.update_task((select id from t1), '{"status":"done"}'::jsonb) $$, 'assignee completes the task');
select pg_temp.logout();
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'task_completed'), 1::bigint, 'task completion logged');
select is((select active_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')), 1, 'done task no longer counts');

-- ---------------------------------------------------------------------------
-- 3. Creative version + submit for review
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_ok($$ select public.submit_for_production_review((select id from rec)) $$, '23514', null, 'submit blocked without a creative version');
select throws_ok($$ select public.register_creative_version((select id from rec), (select id from rec)::text || '/1/poster.png', 'poster.png') $$, 'P0002', null, 'registering a file that is not in storage fails');
select pg_temp.logout();
-- Simulate the upload having landed in Storage (service role writes objects)
insert into storage.objects (bucket_id, name, owner, metadata) values ('creatives', (select id from rec)::text || '/1/poster.png', (select uid from fx where label = 'sumeej'), '{"mimetype":"image/png"}');
select pg_temp.login('sumeej');
select lives_ok($$ select public.register_creative_version((select id from rec), (select id from rec)::text || '/1/poster.png', 'poster.png', 'image/png', 1234, 'image', 1080, 1350) $$, 'assignee registers the creative');
select is((select current_creative_version_id is not null from public.content_records where id = (select id from rec)), true, 'current creative pointer set');
select throws_ok($$ select public.submit_for_production_review((select id from rec)) $$, '23514', null, 'submit blocked without the folder link');
select pg_temp.logout();
update public.content_records set production_folder_url = 'https://techskills.sharepoint.com/sites/marketing/TS-NP' where id = (select id from rec);
select pg_temp.login('sumeej');
select lives_ok($$ select public.submit_for_production_review((select id from rec)) $$, 'assignee submits for review');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'production_review', 'record in Production Review');

-- ---------------------------------------------------------------------------
-- 4. Production review: return with reason, then pass
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_ok($$ select public.production_review((select id from rec), 'pass') $$, '42501', null, 'editor cannot review');
select pg_temp.logout();
select pg_temp.login('nil');
select throws_ok($$ select public.production_review((select id from rec), 'changes', '{}', '') $$, '23514', null, 'returning work needs a reason');
select lives_ok($$ select public.production_review((select id from rec), 'changes', '{"Subtitles present and timed": false}', 'Subtitles missing') $$, 'manager returns work');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'production', 'returned to Production');
select pg_temp.logout();
update public.content_records set status_key = 'production_review' where id = (select id from rec);
select pg_temp.login('nil');
select lives_ok($$ select public.production_review((select id from rec), 'pass', '{"Correct dimensions": true}', null) $$, 'manager passes');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'dm_review', 'pass moves to DM review');
select is((select count(*) from public.production_reviews where content_id = (select id from rec)), 2::bigint, 'two immutable review rows');

-- ---------------------------------------------------------------------------
-- 5. Person backlog agrees with the Team Board
-- ---------------------------------------------------------------------------
select pg_temp.login('biraj');
select is(((public.person_backlog((select pid from fx where label = 'sumeej')) -> 'workload' ->> 'active_count')::int),
          (select active_count from public.v_workload where profile_id = (select pid from fx where label = 'sumeej')),
          'backlog header uses the same workload numbers');
select pg_temp.logout();

select * from finish();
rollback;
