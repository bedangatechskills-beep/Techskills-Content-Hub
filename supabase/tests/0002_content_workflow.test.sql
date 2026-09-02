-- pgTAP: Phase 1 — Content ID generation, move_stage permissions and reasons,
-- stage_history integrity, activity log entries, comments.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;

create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_team_key text default null, p_final boolean default false)
returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_final_approver)
  select initcap(p_label), v_email, r.id, 'active', p_final from public.roles r where r.key = p_role_key returning id into v_pid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  if p_team_key is not null then
    insert into public.team_memberships (team_id, profile_id) select id, v_pid from public.teams where key = p_team_key;
  end if;
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

select pg_temp.mk_user('siris',  'dm_manager', 'dm');
select pg_temp.mk_user('nil',    'production_manager', 'production');
select pg_temp.mk_user('sumeej', 'senior_production', 'production');
select pg_temp.mk_user('biraj',  'ceo_final_approver', 'ceo', true);
select pg_temp.mk_user('bedanga','mentor_content_reviewer', 'content_reviewer');

create temp table ids (k text primary key, v uuid);
grant select on ids to authenticated;
insert into ids select 'reel', id from public.content_types where key = 'reel';
insert into ids select 'ig', id from public.platforms where key = 'instagram';
insert into ids select 'diff1', id from public.differentiators where key = 'real_projects';

-- ---------------------------------------------------------------------------
-- 1. Create + Content ID
-- ---------------------------------------------------------------------------
-- Expected sequence numbers are relative to whatever already exists this month,
-- so the test also passes on a database that has been used.
create temp table seq_before as
  select r.code as region_code, coalesce(s.last_seq, 0) as last_seq
  from public.regions r
  left join public.content_id_sequences s on s.region_code = r.code and s.yymm = to_char(now() at time zone r.timezone, 'YYMM');
grant select on seq_before to authenticated;
create or replace function pg_temp.expected_id(p_region text, p_offset int) returns text language sql as $$
  select format('TS-%s-%s-%s', p_region, to_char(now() at time zone (select timezone from public.regions where code = p_region), 'YYMM'),
                lpad(((select last_seq from seq_before where region_code = p_region) + p_offset)::text, 3, '0'));
$$;
select pg_temp.login('siris');
create temp table rec1 as
  select * from public.create_content_record(jsonb_build_object(
    'title', 'Kathmandu intake reel', 'region_code', 'NP',
    'content_type_id', (select v from ids where k = 'reel'),
    'platform_ids', jsonb_build_array((select v from ids where k = 'ig')),
    'differentiator_ids', jsonb_build_array((select v from ids where k = 'diff1')),
    'hook', 'What if your first job started before graduation?',
    'priority', 'high'));
grant select on rec1 to authenticated;

select is((select content_id from rec1), pg_temp.expected_id('NP', 1), 'NP id uses region, month and the next sequence number');
select is((select status_key from rec1), 'requested', 'new record starts in Requested');
select is((select priority::text from rec1), 'high', 'priority saved');
select is((select dm_owner_id from rec1), (select pid from fx where label = 'siris'), 'DM team creator becomes DM owner');
select is((select count(*) from public.content_platforms where content_id = (select id from rec1)), 1::bigint, 'platform saved');
select is((select count(*) from public.content_differentiators where content_id = (select id from rec1)), 1::bigint, 'differentiator saved');
select is((select count(*) from public.stage_history where content_id = (select id from rec1) and exited_at is null), 1::bigint, 'one open stage_history row');
select is((select count(*) from public.activity_log where content_id = (select id from rec1) and event_type = 'created'), 1::bigint, 'created event logged');

create temp table rec2 as
  select * from public.create_content_record(jsonb_build_object('title', 'Second NP', 'region_code', 'NP', 'content_type_id', (select v from ids where k = 'reel')));
create temp table rec3 as
  select * from public.create_content_record(jsonb_build_object('title', 'First AU', 'region_code', 'AU', 'content_type_id', (select v from ids where k = 'reel')));
grant select on rec2, rec3 to authenticated;
select is((select content_id from rec2), pg_temp.expected_id('NP', 2), 'sequence increments within region and month');
select is((select content_id from rec3), pg_temp.expected_id('AU', 1), 'AU sequence is independent of NP');

select throws_ok(
  $$ select public.create_content_record(jsonb_build_object('title', 'No type', 'region_code', 'NP')) $$,
  '22023', null, 'content type is required');
select pg_temp.logout();

-- Month rollover: simulate a previous month's counter and check it is separate
insert into public.content_id_sequences (region_code, yymm, last_seq) values ('NP', '2501', 7);
select is((select last_seq from public.content_id_sequences where region_code = 'NP' and yymm = '2501'), 7, 'old month counter untouched');

-- ---------------------------------------------------------------------------
-- 2. Permissions: production user cannot create; reviewer cannot move
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_ok(
  $$ select public.create_content_record(jsonb_build_object('title', 'x', 'region_code', 'NP', 'content_type_id', (select v from ids where k = 'reel'))) $$,
  '42501', null, 'production user cannot create a record');
select throws_ok(
  $$ select public.move_stage((select id from rec1), 'idea_concept') $$,
  '42501', null, 'production user cannot start the concept');
select throws_ok(
  $$ select public.move_stage((select id from rec1), 'final_approved') $$,
  '22023', null, 'jumping straight to Final Approved is not a defined transition');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 3. Forward moves by the DM manager, no reason needed
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select lives_ok($$ select public.move_stage((select id from rec1), 'idea_concept') $$, 'DM moves Requested → Concept');
select lives_ok($$ select public.move_stage((select id from rec1), 'script_copy') $$, 'DM moves Concept → Script');
select is((select count(*) from public.available_transitions((select id from rec1)) where to_status = 'script_approval'), 0::bigint,
          'Submit for approval is not a generic move; it goes through submit_script_for_approval (Phase 2)');
select throws_ok(
  $$ select public.move_stage((select id from rec1), 'idea_concept') $$,
  '23514', null, 'backward move without a reason is rejected');
select lives_ok($$ select public.move_stage((select id from rec1), 'idea_concept', 'Hook needs rework') $$, 'backward move with a reason succeeds');
select is((select reason from public.activity_log where content_id = (select id from rec1) and event_type = 'status_change' and previous_value ->> 'status' = 'script_copy' and new_value ->> 'status' = 'idea_concept'),
          'Hook needs rework', 'reason stored on the activity row');
select lives_ok($$ select public.move_stage((select id from rec1), 'script_copy') $$, 'forward again');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 4. Stage history integrity
-- ---------------------------------------------------------------------------
select is((select count(*) from public.stage_history where content_id = (select id from rec1)), 5::bigint, 'five stage visits recorded');
select is((select count(*) from public.stage_history where content_id = (select id from rec1) and exited_at is null), 1::bigint, 'exactly one open row');
select is((select status_key from public.stage_history where content_id = (select id from rec1) and exited_at is null), 'script_copy', 'open row is the current stage');
select is((select count(*) from public.stage_history where content_id = (select id from rec1) and exited_at is not null and duration_seconds is null), 0::bigint,
          'closed rows have durations');

-- ---------------------------------------------------------------------------
-- 5. Final Approved requires the Final Approver flag even with the permission
-- ---------------------------------------------------------------------------
select pg_temp.logout();
update public.content_records set status_key = 'final_approval' where id = (select id from rec1);
update public.stage_history set exited_at = now(), exited_by = null where content_id = (select id from rec1) and exited_at is null;
insert into public.stage_history (content_id, status_key) values ((select id from rec1), 'final_approval');

select pg_temp.login('sumeej');
select throws_ok($$ select public.move_stage((select id from rec1), 'final_approved') $$, '42501', null, 'production user cannot final approve');
select pg_temp.logout();
select pg_temp.login('biraj');
select throws_ok($$ select public.move_stage((select id from rec1), 'changes_required') $$, '23514', null, 'change request needs a reason');
select lives_ok($$ select public.move_stage((select id from rec1), 'final_approved') $$, 'Final Approver can final approve');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 6. Field updates log the right events
-- ---------------------------------------------------------------------------
select pg_temp.login('nil');
select lives_ok($$ select public.update_content_fields((select id from rec2), jsonb_build_object('priority', 'urgent', 'production_folder_url', 'https://share.example/x', 'production_assignee_id', (select pid from fx where label = 'sumeej'))) $$,
  'production manager sets priority, folder and assignee');
select pg_temp.logout();
select pg_temp.login('sumeej');
select throws_ok($$ select public.update_content_fields((select id from rec2), jsonb_build_object('hook', 'nope')) $$, '42501', null,
  'production user cannot edit concept fields');
select pg_temp.logout();
select is((select array_agg(event_type order by event_type) from public.activity_log where content_id = (select id from rec2) and event_type in ('priority_change','folder_link_change','assignment')),
          array['assignment','folder_link_change','priority_change'], 'priority, folder and assignment events logged');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'sumeej') and type = 'content_assigned'), 1::bigint,
          'assignee notified');

-- ---------------------------------------------------------------------------
-- 7. Comments
-- ---------------------------------------------------------------------------
select pg_temp.login('bedanga');
select lives_ok($$ select public.add_comment((select id from rec2), 'concept', 'Looks good @siris', array[(select pid from fx where label = 'siris')]) $$, 'reviewer can comment');
select pg_temp.logout();
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'siris') and type = 'mentioned'), 1::bigint, 'mention notifies');

select * from finish();
rollback;
