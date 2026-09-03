-- pgTAP: Phase 4 — creative evaluation storage, DM review, change requests
-- with routing, revision loop, gate status.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

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
create or replace function pg_temp.store_creative_eval(p_version uuid, p_requester uuid, p_flags jsonb) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform set_config('role', 'service_role', true);
  select id into v from public.record_creative_evaluation(jsonb_build_object(
    'creative_version_id', p_version, 'provider', 'mock', 'model', 'mock', 'prompt_version', 'creative.v1',
    'input_hash', md5(p_version::text || p_flags::text), 'overall_score', 7.5, 'category_scores', '{}'::jsonb,
    'recommendations', '[]'::jsonb, 'hard_flags', p_flags,
    'verdict', case when jsonb_array_length(p_flags) = 0 then 'ready_for_dm_review' else 'significant_issues' end,
    'summary', 'test', 'requested_by', p_requester, 'duration_ms', 5));
  perform set_config('role', 'postgres', true);
  return v;
end $$;

select pg_temp.mk_user('siris',  'dm_manager', 'dm');
select pg_temp.mk_user('nil',    'production_manager', 'production');
select pg_temp.mk_user('sumeej', 'senior_production', 'production');

-- Record in DM review with a creative version
select pg_temp.login('siris');
create temp table rec as select * from public.create_content_record(jsonb_build_object('title', 'Creative gate', 'region_code', 'NP',
  'content_type_id', (select id from public.content_types where key = 'admission_poster')));
grant select on rec to authenticated;
select pg_temp.logout();
update public.content_records set status_key = 'dm_review', production_assignee_id = (select pid from fx where label = 'sumeej'),
  production_manager_id = (select pid from fx where label = 'nil') where id = (select id from rec);
update public.stage_history set exited_at = now() where content_id = (select id from rec) and exited_at is null;
insert into public.stage_history (content_id, status_key) values ((select id from rec), 'dm_review');
insert into storage.objects (bucket_id, name, owner, metadata) values ('creatives', (select id from rec)::text || '/1/poster.png', (select uid from fx where label = 'sumeej'), '{}');
select pg_temp.login('sumeej');
create temp table cv1 as select * from public.register_creative_version((select id from rec), (select id from rec)::text || '/1/poster.png', 'poster.png', 'image/png', 100, 'image', 1080, 1350);
grant select on cv1 to authenticated;
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 1. DM decision blocked until an evaluation exists; AI never moves the stage
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select throws_ok($$ select public.dm_review((select id from rec), 'approved') $$, '23514', null, 'DM decision blocked without a creative evaluation');
select throws_ok($$ select public.record_creative_evaluation('{}'::jsonb) $$, '42501', null, 'users cannot store creative evaluations directly');
select pg_temp.logout();

select pg_temp.store_creative_eval((select id from cv1), (select pid from fx where label = 'sumeej'),
  '[{"key":"spelling","severity":"high","excerpt":"Kathamndu","fix":"Spell it Kathmandu.","needs_human":false},
    {"key":"contact_wrong","severity":"high","excerpt":"@techskillsitcareer","fix":"Use @techskills.nepal.","needs_human":false},
    {"key":"ai_disclosure_required","severity":"medium","excerpt":"AI image","fix":"Enable disclosure.","needs_human":false}]'::jsonb) as eval1 \gset
select is((select status_key from public.content_records where id = (select id from rec)), 'dm_review', 'evaluation did not move the stage');
select is((select requires_ai_disclosure from public.content_records where id = (select id from rec)), true, 'disclosure flag set the record flag');
select is((select count(*) from public.notifications where type = 'ai_flags_found' and content_id = (select id from rec)), 3::bigint, 'assignee, manager and DM owner notified of flags');
select is(((public.gate_status((select id from rec))) ->> 'open_hard_flag_count')::int, 3, 'gate status counts three open flags');

-- Resolve one flag, dismiss another with a reason
select pg_temp.login('sumeej');
select lives_ok(format($$ select public.resolve_ai_flag(%L, 0, 'resolved', null) $$, :'eval1'), 'assignee resolves the typo flag');
select throws_ok(format($$ select public.resolve_ai_flag(%L, 2, 'dismissed', '') $$, :'eval1'), '23514', null, 'dismiss needs a reason');
select lives_ok(format($$ select public.resolve_ai_flag(%L, 2, 'dismissed', 'Stock background, disclosure handled at publish') $$, :'eval1'), 'dismiss with reason works');
select pg_temp.logout();
select is(((public.gate_status((select id from rec))) ->> 'open_hard_flag_count')::int, 1, 'one flag still open');

-- ---------------------------------------------------------------------------
-- 2. DM requests changes → change requests routed; record to Changes Required
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_ok($$ select public.dm_review((select id from rec), 'approved') $$, '42501', null, 'editor cannot DM review');
select pg_temp.logout();
select pg_temp.login('siris');
select throws_ok($$ select public.dm_review((select id from rec), 'changes_requested', '', '[]'::jsonb) $$, '23514', null, 'changes need a reason or items');
select lives_ok($$ select public.dm_review((select id from rec), 'changes_requested', 'Fix the handle and the headline',
  '[{"description":"Replace the retired handle","category":"production"},{"description":"Headline claim needs softening","category":"script_message"}]'::jsonb) $$,
  'DM requests two changes');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'changes_required', 'record in Changes Required');
select is((select count(*) from public.change_requests where content_id = (select id from rec) and not is_resolved), 2::bigint, 'two open change requests');
select is((select t.key from public.change_requests c join public.teams t on t.id = c.assigned_team_id where c.content_id = (select id from rec) and c.category = 'script_message'), 'dm', 'script issue routed to the DM team');
select is((select assigned_user_id from public.change_requests where content_id = (select id from rec) and category = 'production'), (select pid from fx where label = 'sumeej'), 'production issue assigned to the assignee');
select is((select count(*) from public.dm_reviews where content_id = (select id from rec)), 1::bigint, 'review row stored');
select is((select reason from public.activity_log where content_id = (select id from rec) and event_type = 'status_change' and new_value ->> 'status' = 'changes_required'), 'Fix the handle and the headline', 'reason stored on the move');

-- Route: script item open → goes to Script / Copy (DM has script.edit)
select pg_temp.login('siris');
select lives_ok($$ select public.route_changes_required((select id from rec)) $$, 'DM routes the loop');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'script_copy', 'open script item routes to Script / Copy');

-- Resolve requests; a plain move into Changes Required is not allowed
select pg_temp.login('sumeej');
select lives_ok($$ select public.resolve_change_request((select id from public.change_requests where content_id = (select id from rec) and category = 'production'), 'Handle replaced') $$, 'assignee resolves their item');
select throws_ok($$ select public.resolve_change_request((select id from public.change_requests where content_id = (select id from rec) and category = 'script_message'), 'x') $$, '42501', null, 'assignee cannot resolve the DM item');
select pg_temp.logout();
select pg_temp.login('siris');
select lives_ok($$ select public.resolve_change_request((select id from public.change_requests where content_id = (select id from rec) and category = 'script_message'), 'Softened') $$, 'DM resolves the script item');
select pg_temp.logout();
select is((select count(*) from public.change_requests where content_id = (select id from rec) and not is_resolved), 0::bigint, 'all requests resolved');

-- ---------------------------------------------------------------------------
-- 3. Approval path: content review off → Ready for Final Approval
-- ---------------------------------------------------------------------------
select pg_temp.logout();
update public.content_records set status_key = 'dm_review' where id = (select id from rec);
select pg_temp.login('siris');
select lives_ok($$ select public.dm_review((select id from rec), 'approved', 'Looks good', '[]'::jsonb, '{"Hook lands": true}'::jsonb) $$, 'DM approves');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'ready_for_final_approval', 'approved → Ready for Final Approval when content review is off');

select * from finish();
rollback;
