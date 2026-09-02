-- pgTAP: Phase 2 — script versions, AI evaluation storage, submission gate,
-- approval, material change and re-approval, flag resolution, Nepali.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;

create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_team_key text default null, p_final boolean default false, p_nepali boolean default false)
returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_final_approver, can_verify_nepali)
  select initcap(p_label), v_email, r.id, 'active', p_final, p_nepali from public.roles r where r.key = p_role_key returning id into v_pid;
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
-- Simulates the Edge Function storing an evaluation with the service role.
create or replace function pg_temp.store_eval(p_version uuid, p_requester uuid, p_flags jsonb, p_score numeric) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform set_config('role', 'service_role', true);
  select id into v from public.record_ai_evaluation(jsonb_build_object(
    'script_version_id', p_version, 'provider', 'mock', 'model', 'mock-rules-v1', 'prompt_version', 'script.v1',
    'input_hash', md5(p_version::text || p_score::text), 'overall_score', p_score,
    'category_scores', '{"hook_attention": 8}'::jsonb, 'recommendations', '[]'::jsonb, 'hard_flags', p_flags,
    'verdict', case when jsonb_array_length(p_flags) = 0 then 'ready' else 'significant_issues' end,
    'summary', 'test', 'requested_by', p_requester, 'duration_ms', 12));
  perform set_config('role', 'postgres', true);
  return v;
end $$;

select pg_temp.mk_user('siris',  'dm_manager', 'dm');
select pg_temp.mk_user('sumeej', 'senior_production', 'production');
select pg_temp.mk_user('biraj',  'ceo_final_approver', 'ceo', true);
select pg_temp.mk_user('nepali', 'content_reviewer', 'content_reviewer', false, true);

-- Record in Script / Copy
select pg_temp.login('siris');
create temp table rec as
  select * from public.create_content_record(jsonb_build_object('title', 'Gate test', 'region_code', 'NP',
    'content_type_id', (select id from public.content_types where key = 'reel'), 'cta', 'Book a free career consultation'));
grant select on rec to authenticated;
select public.move_stage((select id from rec), 'idea_concept');
select public.move_stage((select id from rec), 'script_copy');

-- ---------------------------------------------------------------------------
-- 1. Versions
-- ---------------------------------------------------------------------------
create temp table v1 as select * from public.create_script_version((select id from rec), 'Draft one with a guarenteed job.', 'Initial draft');
grant select on v1 to authenticated;
select is((select version_no from v1), 1, 'first version is V1');
select is((select approval_status::text from v1), 'draft', 'new version is a draft');
select is((select is_material_change from v1), false, 'no approval yet: not a change after approval');
select is((select current_script_version_id from public.content_records where id = (select id from rec)), (select id from v1), 'current pointer set');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'script_version_created'), 1::bigint, 'version creation logged');

create temp table v2 as select * from public.create_script_version((select id from rec), 'Draft two. Book a free career consultation.', 'Removed the claim');
grant select on v2 to authenticated;
select is((select version_no from v2), 2, 'second version is V2');
select is((select count(*) from public.script_versions where content_id = (select id from rec)), 2::bigint, 'V1 preserved, never overwritten');

-- Submission requires an AI evaluation on the current version
select throws_ok($$ select public.submit_script_for_approval((select id from v2)) $$, '23514', null, 'submit blocked until the AI check has run');
select throws_ok($$ select public.submit_script_for_approval((select id from v1)) $$, '22023', null, 'only the current version can be submitted');
select pg_temp.logout();

-- Production user cannot create versions
select pg_temp.login('sumeej');
select throws_ok($$ select public.create_script_version((select id from rec), 'x') $$, '42501', null, 'production user cannot write scripts');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- 2. AI evaluation stored by the service role; never moves a stage
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select throws_ok($$ select public.record_ai_evaluation('{}'::jsonb) $$, '42501', null, 'authenticated users cannot store evaluations directly');
select pg_temp.logout();

select pg_temp.store_eval((select id from v2), (select pid from fx where label = 'siris'), '[]'::jsonb, 8.2) as eval_clean \gset
select is((select count(*) from public.ai_evaluations where script_version_id = (select id from v2)), 1::bigint, 'evaluation stored against V2');
select is((select status_key from public.content_records where id = (select id from rec)), 'script_copy', 'AI evaluation did not move the stage');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'ai_evaluation_completed'), 1::bigint, 'evaluation logged');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'siris') and type = 'ai_evaluation_completed'), 1::bigint, 'requester notified');

-- Nepali flag sets verification pending
create temp table v2b as select * from public.script_versions where id = (select id from v2);
select pg_temp.store_eval((select id from v2), (select pid from fx where label = 'siris'),
  '[{"key":"nepali_verify","severity":"medium","excerpt":"नमस्ते","fix":"Have a Nepali speaker verify this line.","needs_human":true}]'::jsonb, 7.0) as eval_nep \gset
select is((select nepali_verification::text from public.content_records where id = (select id from rec)), 'pending', 'Nepali flag marks verification pending');

-- ---------------------------------------------------------------------------
-- 3. Submit and approve
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select lives_ok($$ select public.submit_script_for_approval((select id from v2)) $$, 'DM submits V2');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'script_approval', 'record moved to Script Approval');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'biraj') and type = 'script_ready_for_review'), 1::bigint, 'approver notified');

select pg_temp.login('sumeej');
select throws_ok($$ select public.approve_script((select id from v2)) $$, '42501', null, 'production user cannot approve');
select pg_temp.logout();

select pg_temp.login('biraj');
select throws_ok($$ select public.request_script_changes((select id from v2), '') $$, '23514', null, 'change request needs a reason');
select lives_ok($$ select public.approve_script((select id from v2)) $$, 'approver approves V2');
select pg_temp.logout();
select is((select approved_script_version_id from public.content_records where id = (select id from rec)), (select id from v2), 'approved pointer pinned to V2');
select is((select status_key from public.content_records where id = (select id from rec)), 'ready_for_production', 'record moved to Ready for Production');
select is((select count(*) from public.script_approvals where content_id = (select id from rec) and decision = 'approved'), 1::bigint, 'approval row written');

-- ---------------------------------------------------------------------------
-- 4. Material change after approval → banner state → re-approval
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
create temp table v3 as select * from public.create_script_version((select id from rec), 'Draft three with a new CTA: DM us now.', 'Changed CTA');
grant select on v3 to authenticated;
select is((select is_material_change from v3), null, 'change after approval awaits the material/non-material answer');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'script_changed_after_approval'), 1::bigint, 'change-after-approval logged');
select throws_ok($$ select public.mark_version_material((select id from v3), true, '') $$, '23514', null, 'classification needs a reason');
select lives_ok($$ select public.mark_version_material((select id from v3), true, 'CTA changed') $$, 'author marks V3 material');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'script_approval', 'material change returned the record to Script Approval');
select is((select approved_script_version_id from public.content_records where id = (select id from rec)), null, 'approved pointer cleared');
select is((select approval_status::text from public.script_versions where id = (select id from v2)), 'superseded', 'old approved version superseded, row kept');
select is((select count(*) from public.script_approvals where content_id = (select id from rec)), 1::bigint, 'old approval row remains in history');

select pg_temp.login('biraj');
select lives_ok($$ select public.approve_script((select id from v3)) $$, 'approver re-approves V3');
select pg_temp.logout();
select is((select count(*) from public.script_approvals where content_id = (select id from rec) and decision = 'approved'), 2::bigint, 'two approval rows: history kept');

-- ---------------------------------------------------------------------------
-- 5. Flag resolution and Nepali verification
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select throws_ok(format($$ select public.resolve_ai_flag(%L, 0, 'dismissed', '') $$, :'eval_nep'), '23514', null, 'dismissing a flag needs a reason');
select lives_ok(format($$ select public.resolve_ai_flag(%L, 0, 'resolved', null) $$, :'eval_nep'), 'resolving a flag needs no reason');
select throws_ok($$ select public.verify_nepali((select id from rec)) $$, '42501', null, 'DM without the flag cannot verify Nepali');
select pg_temp.logout();
select pg_temp.login('nepali');
select lives_ok($$ select public.verify_nepali((select id from rec)) $$, 'named verifier can verify Nepali');
select pg_temp.logout();
select is((select nepali_verification::text from public.content_records where id = (select id from rec)), 'verified', 'Nepali verified');

select * from finish();
rollback;
