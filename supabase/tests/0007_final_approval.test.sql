-- pgTAP: Phase 5 — reviewer ratings, quorum/threshold, DM override, checklist,
-- submit gate, final approval with pinned versions and CEO override, request
-- changes / reject, material creative change → re-approval.
begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

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
create or replace function pg_temp.scores(p numeric) returns jsonb language sql as $$
  select jsonb_object_agg(c, p) from jsonb_array_elements_text((select value from public.app_settings where key = 'reviewer_categories')) c; $$;
create or replace function pg_temp.store_clean_eval(p_version uuid, p_requester uuid) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform set_config('role', 'service_role', true);
  select id into v from public.record_creative_evaluation(jsonb_build_object('creative_version_id', p_version, 'provider', 'mock', 'model', 'mock',
    'prompt_version', 'creative.v1', 'input_hash', md5(p_version::text), 'overall_score', 8.0, 'category_scores', '{}'::jsonb, 'recommendations', '[]'::jsonb,
    'hard_flags', '[]'::jsonb, 'verdict', 'ready_for_dm_review', 'summary', 'clean', 'requested_by', p_requester, 'duration_ms', 1));
  perform set_config('role', 'postgres', true);
  return v;
end $$;
create or replace function pg_temp.set_stage(p_content uuid, p_status text) returns void language plpgsql as $$
begin
  update public.content_records set status_key = p_status where id = p_content;
  update public.stage_history set exited_at = now() where content_id = p_content and exited_at is null;
  insert into public.stage_history (content_id, status_key) values (p_content, p_status);
end $$;

select pg_temp.mk_user('siris',   'dm_manager', 'dm');
select pg_temp.mk_user('nil',     'production_manager', 'production');
select pg_temp.mk_user('sumeej',  'senior_production', 'production');
select pg_temp.mk_user('bedanga', 'mentor_content_reviewer', 'content_reviewer');
select pg_temp.mk_user('rev2',    'content_reviewer', 'content_reviewer');
select pg_temp.mk_user('biraj',   'ceo_final_approver', 'ceo', true);
select pg_temp.mk_user('admin1',  'admin', 'admin');

-- A record that has passed every earlier gate: approved script, creative, production pass, DM approval.
select pg_temp.login('siris');
create temp table rec as select * from public.create_content_record(jsonb_build_object('title', 'Final gate', 'region_code', 'NP',
  'content_type_id', (select id from public.content_types where key = 'admission_poster'), 'content_review_required', true));
grant select on rec to authenticated;
select pg_temp.logout();
update public.content_records set production_assignee_id = (select pid from fx where label = 'sumeej'), production_manager_id = (select pid from fx where label = 'nil'),
  production_folder_url = 'https://techskills.sharepoint.com/x' where id = (select id from rec);
insert into public.script_versions (content_id, version_no, body, approval_status, is_material_change) values ((select id from rec), 1, 'Approved copy. Book a free career consultation.', 'approved', false);
update public.content_records set approved_script_version_id = (select id from public.script_versions where content_id = (select id from rec)), current_script_version_id = (select id from public.script_versions where content_id = (select id from rec)) where id = (select id from rec);
insert into storage.objects (bucket_id, name, owner, metadata) values ('creatives', (select id from rec)::text || '/1/poster.png', (select uid from fx where label = 'sumeej'), '{}');
select pg_temp.login('sumeej');
create temp table cv1 as select * from public.register_creative_version((select id from rec), (select id from rec)::text || '/1/poster.png', 'poster.png', 'image/png', 100, 'image', 1080, 1350);
grant select on cv1 to authenticated;
select pg_temp.logout();
insert into public.production_reviews (content_id, creative_version_id, reviewer_id, decision) values ((select id from rec), (select id from cv1), (select pid from fx where label = 'nil'), 'pass');
insert into public.dm_reviews (content_id, creative_version_id, reviewer_id, decision) values ((select id from rec), (select id from cv1), (select pid from fx where label = 'siris'), 'approved');
select pg_temp.set_stage((select id from rec), 'content_review');

-- ---------------------------------------------------------------------------
-- 1. Reviewer ratings, quorum, threshold
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_ok($$ select public.submit_reviewer_rating((select id from rec), pg_temp.scores(4), 'recommend_approval') $$, '42501', null, 'editor cannot rate');
select pg_temp.logout();
select pg_temp.login('bedanga');
select throws_ok($$ select public.submit_reviewer_rating((select id from rec), pg_temp.scores(3.6), 'recommend_with_changes', '') $$, '23514', null, 'Recommend With Changes needs a comment');
select lives_ok($$ select public.submit_reviewer_rating((select id from rec), pg_temp.scores(3.6), 'recommend_with_changes', 'Hook is weak') $$, 'reviewer rates 3.6');
select pg_temp.logout();
select is((select average from public.reviewer_ratings where content_id = (select id from rec)), 3.60, 'average stored');
select is(((public.reviewer_summary((select id from rec))) ->> 'meets_quorum')::boolean, false, 'quorum of 2 not met with one response');
select is(((public.reviewer_summary((select id from rec))) ->> 'meets_threshold')::boolean, false, '3.6 is below the 4.0 threshold');

-- Completing without quorum needs a skip reason; DM override records a permanent row
select pg_temp.login('siris');
select throws_ok($$ select public.complete_content_review((select id from rec)) $$, '23514', null, 'completing below quorum without a reason is refused');
select throws_ok($$ select public.record_dm_override((select id from rec), '') $$, '23514', null, 'override needs a reason');
select lives_ok($$ select public.record_dm_override((select id from rec), 'One senior reviewer is enough for a routine poster') $$, 'DM overrides the quorum');
select lives_ok($$ select public.complete_content_review((select id from rec)) $$, 'DM completes Content Review after the override');
select pg_temp.logout();
select is((select kind::text from public.overrides where content_id = (select id from rec)), 'reviewer_quorum', 'override kind recorded as quorum');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'biraj') and type = 'override_recorded'), 1::bigint, 'CEO notified of the override');
select is((select status_key from public.content_records where id = (select id from rec)), 'ready_for_final_approval', 'record in Ready for Final Approval');

-- ---------------------------------------------------------------------------
-- 2. Checklist and the Submit gate
-- ---------------------------------------------------------------------------
select is(((public.final_approval_checklist((select id from rec))) ->> 'all_ok')::boolean, false, 'checklist fails: no AI creative check yet');
select is((select i ->> 'ok' from jsonb_array_elements((public.final_approval_checklist((select id from rec))) -> 'items') i where i ->> 'key' = 'hard_flags'), 'false', 'hard_flags item fails without an evaluation');
select pg_temp.login('siris');
select throws_ok($$ select public.submit_for_final_approval((select id from rec)) $$, '23514', null, 'submit impossible while any item fails');
select pg_temp.logout();
select pg_temp.store_clean_eval((select id from cv1), (select pid from fx where label = 'nil')) as eval1 \gset
select is(((public.final_approval_checklist((select id from rec))) ->> 'all_ok')::boolean, true, 'checklist passes after a clean check (override covers quorum and threshold)');
select is((select i ->> 'ok' from jsonb_array_elements((public.final_approval_checklist((select id from rec))) -> 'items') i where i ->> 'key' = 'reviewer_threshold'), 'true', 'threshold item satisfied by the override');
select pg_temp.login('siris');
select lives_ok($$ select public.submit_for_final_approval((select id from rec)) $$, 'DM submits for final approval');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'final_approval', 'record in Final Approval');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'biraj') and type = 'final_approval_required'), 1::bigint, 'approver notified');
select is((select jsonb_typeof(new_value -> 'items') from public.activity_log where content_id = (select id from rec) and event_type = 'submitted_for_final_approval'), 'array', 'checklist snapshot stored on submit');

-- ---------------------------------------------------------------------------
-- 3. Only a Final Approver approves; versions pinned; override reason when needed
-- ---------------------------------------------------------------------------
select pg_temp.login('admin1');
select throws_ok($$ select public.final_approve((select id from rec)) $$, '42501', null, 'admin without the flag cannot final approve');
select pg_temp.logout();
select pg_temp.login('siris');
select throws_ok($$ select public.final_approve((select id from rec)) $$, '42501', null, 'DM manager cannot final approve');
select pg_temp.logout();
select pg_temp.login('biraj');
select throws_ok($$ select public.final_reject((select id from rec), '') $$, '23514', null, 'reject needs a reason');
select throws_ok($$ select public.final_request_changes((select id from rec), '') $$, '23514', null, 'request changes needs a reason');
-- reviewer recommended against approval and the DM override already exists → no CEO override needed
select lives_ok($$ select public.final_approve((select id from rec)) $$, 'Final Approver approves');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'final_approved', 'record is Final Approved');
select is((select creative_version_id from public.final_approvals where content_id = (select id from rec) and decision = 'approved'), (select id from cv1), 'creative version pinned on approval');
select is((select script_version_id from public.final_approvals where content_id = (select id from rec) and decision = 'approved'), (select approved_script_version_id from public.content_records where id = (select id from rec)), 'script version pinned on approval');
select is((select approved_creative_version_id from public.content_records where id = (select id from rec)), (select id from cv1), 'record pins the approved creative');

-- ---------------------------------------------------------------------------
-- 4. Material creative change after final approval → banner → re-approval
-- ---------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, owner, metadata) values ('creatives', (select id from rec)::text || '/2/thumb.png', (select uid from fx where label = 'sumeej'), '{}');
select pg_temp.login('sumeej');
create temp table cv2 as select * from public.register_creative_version((select id from rec), (select id from rec)::text || '/2/thumb.png', 'thumb.png', 'image/png', 100, 'thumbnail', 1280, 720);
grant select on cv2 to authenticated;
select is((select is_material_change from cv2), null, 'upload after final approval awaits the material answer');
select throws_ok($$ select public.mark_creative_material((select id from cv2), true, '') $$, '23514', null, 'classification needs a reason');
select lives_ok($$ select public.mark_creative_material((select id from cv2), true, 'New thumbnail with a different headline') $$, 'uploader marks the change material');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'final_approval', 'material change returned the record to Final Approval');
select is((select approved_creative_version_id from public.content_records where id = (select id from rec)), null, 'approved creative pointer cleared');
select is((select count(*) from public.final_approvals where content_id = (select id from rec) and decision = 'approved'), 1::bigint, 'previous approval remains in history');
select is((select count(*) from public.notifications where recipient_id = (select pid from fx where label = 'biraj') and type = 're_approval_required'), 1::bigint, 'CEO notified of re-approval');

-- Re-approval needs a fresh clean check on V2 (hard_flags item) — store it, then approve again
select pg_temp.store_clean_eval((select id from cv2), (select pid from fx where label = 'nil')) as eval2 \gset
insert into public.production_reviews (content_id, creative_version_id, reviewer_id, decision) values ((select id from rec), (select id from cv2), (select pid from fx where label = 'nil'), 'pass');
insert into public.dm_reviews (content_id, creative_version_id, reviewer_id, decision) values ((select id from rec), (select id from cv2), (select pid from fx where label = 'siris'), 'approved');
select pg_temp.login('biraj');
select throws_ok($$ select public.final_approve((select id from rec)) $$, '23514', null, 'V2 has no reviewer responses and no override for that version: CEO override reason required');
select lives_ok($$ select public.final_approve((select id from rec), 'Thumbnail only; reviewed content unchanged') $$, 'CEO approves V2 with an override reason');
select pg_temp.logout();
select is((select count(*) from public.final_approvals where content_id = (select id from rec) and decision = 'approved'), 2::bigint, 'two approval rows: history kept');
select is((select override_reason from public.final_approvals where content_id = (select id from rec) and creative_version_id = (select id from cv2)), 'Thumbnail only; reviewed content unchanged', 'CEO override reason stored permanently');

-- ---------------------------------------------------------------------------
-- 5. Request changes and reject from the final screen
-- ---------------------------------------------------------------------------
select pg_temp.set_stage((select id from rec), 'final_approval');
select pg_temp.login('biraj');
select lives_ok($$ select public.final_request_changes((select id from rec), 'Headline too small on mobile') $$, 'CEO requests changes');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'changes_required', 'changes → Changes Required');
select is((select source::text from public.change_requests where content_id = (select id from rec) order by created_at desc limit 1), 'final_approval', 'change request sourced from final approval');
select pg_temp.set_stage((select id from rec), 'final_approval');
select pg_temp.login('biraj');
select lives_ok($$ select public.final_reject((select id from rec), 'Campaign cancelled') $$, 'CEO rejects with a reason');
select pg_temp.logout();
select is((select status_key from public.content_records where id = (select id from rec)), 'archived', 'reject → Archived');

select * from finish();
rollback;
