-- ============================================================================
-- 0007_final_approval.sql — Phase 5: Content Review (ratings, quorum,
-- threshold, DM override), the system-computed Final Approval Checklist,
-- Final Approval with pinned versions and CEO override, re-approval on
-- material creative change.
-- Rules: only a Final Approver approves; overrides are permanent rows the CEO
--        sees; Submit is impossible while any checklist item fails (S6: open
--        hard flags block); previous approvals stay in history.
-- ============================================================================

create type public.reviewer_decision as enum ('recommend_approval','recommend_with_changes','not_ready');
create type public.override_kind as enum ('reviewer_quorum','reviewer_threshold','reviewer_recommendation','hard_flags');
create type public.final_decision as enum ('approved','changes_requested','rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.reviewer_ratings (
  id                  uuid primary key default gen_random_uuid(),
  content_id          uuid not null references public.content_records(id),
  creative_version_id uuid references public.creative_versions(id),
  reviewer_id         uuid not null references public.profiles(id),
  scores              jsonb not null,
  average             numeric(3,2) not null,
  decision            public.reviewer_decision not null,
  comment             text,
  created_at          timestamptz not null default now(),
  unique (content_id, creative_version_id, reviewer_id)
);
create index reviewer_ratings_content_idx on public.reviewer_ratings(content_id, created_at desc);

create table public.overrides (
  id         uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_records(id),
  kind       public.override_kind not null,
  creative_version_id uuid references public.creative_versions(id),
  actor_id   uuid not null references public.profiles(id),
  reason     text not null check (length(trim(reason)) > 0),
  snapshot   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index overrides_content_idx on public.overrides(content_id, created_at desc);

create table public.final_approvals (
  id                  uuid primary key default gen_random_uuid(),
  content_id          uuid not null references public.content_records(id),
  approver_id         uuid not null references public.profiles(id),
  decision            public.final_decision not null,
  script_version_id   uuid references public.script_versions(id),
  creative_version_id uuid references public.creative_versions(id),
  reason              text,
  override_reason     text,
  checklist_snapshot  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);
create index final_approvals_content_idx on public.final_approvals(content_id, created_at desc);

alter table public.content_records
  add column approved_creative_version_id uuid references public.creative_versions(id);
alter table public.creative_versions
  add column is_material_change boolean,
  add column material_reason text;

insert into public.app_settings (key, value, description) values
  ('reviewer_threshold', '4.0', 'Minimum average reviewer rating (1–5) before Final Approval without an override (§47)'),
  ('default_min_reviewer_responses', '2', 'Default quorum of reviewer responses when Content Review is on (§46)'),
  ('dm_can_override_threshold', 'true', 'The DM Manager may override a below-threshold or missing-quorum review with a stored reason (§47)'),
  ('reviewer_categories', '["Hook / Attention", "Message Clarity", "Brand Differentiation", "Audience Relevance", "Brand / Premium Positioning", "Communication / Wording", "Creative / Presentation", "CTA", "Overall Rating"]', 'Content Reviewer Rating categories (§44), scale 1–5');

-- Gate transitions through their RPCs
update public.allowed_transitions set rpc_only = true
 where (from_status, to_status) in (('content_review','ready_for_final_approval'), ('content_review','changes_required'),
                                    ('ready_for_final_approval','final_approval'), ('ready_for_final_approval','changes_required'),
                                    ('final_approval','final_approved'), ('final_approval','changes_required'), ('final_approval','archived'),
                                    ('final_approved','changes_required'));
-- Material creative change after final approval: back to Final Approval (author or manager, reason required)
insert into public.allowed_transitions (from_status, to_status, permission_key, reason_required, is_backward, label, rpc_only)
select s, 'final_approval', p, true, true, 'Material creative change', true
from unnest(array['final_approved','scheduled']) s, unnest(array['production.update_own','production.assign','dm.review']) p
on conflict (from_status, to_status, permission_key) do update set rpc_only = true, reason_required = true;

create or replace function public.setting_numeric(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text::numeric from public.app_settings where key = p_key and jsonb_typeof(value) = 'number'), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Content Review: on/off, ratings, summary, DM override, completion, skip
-- ---------------------------------------------------------------------------
create or replace function public.set_content_review_required(p_content_id uuid, p_required boolean, p_min_responses int default null, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records;
begin
  if not public.has_permission('dm.review') then raise exception 'dm.review permission required' using errcode = '42501'; end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.content_review_required and not p_required and v_rec.status_key in ('content_review', 'ready_for_final_approval') and coalesce(trim(p_reason), '') = '' then
    raise exception 'turning Content Review off at this stage is a stage skip and needs a reason' using errcode = '23514';
  end if;
  update public.content_records
     set content_review_required = p_required,
         min_reviewer_responses = coalesce(p_min_responses, min_reviewer_responses),
         updated_by = v_me
   where id = p_content_id returning * into v_rec;
  perform public.log_activity(p_content_id, case when p_required then 'content_review_enabled' else 'content_review_disabled' end,
    format('%s turned Content Review %s on %s (quorum %s)', public.actor_name(), case when p_required then 'on' else 'off' end, v_rec.content_id, v_rec.min_reviewer_responses),
    null, jsonb_build_object('required', p_required, 'min_reviewer_responses', v_rec.min_reviewer_responses), p_reason);
  return v_rec;
end $$;

create or replace function public.submit_reviewer_rating(p_content_id uuid, p_scores jsonb, p_decision public.reviewer_decision, p_comment text default null)
returns public.reviewer_ratings
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_avg numeric; v_n int; v_rating public.reviewer_ratings; v_quorum int; v_count int;
  v_cats jsonb; v_cat text;
begin
  if not public.has_permission('review.rate') then raise exception 'review.rate permission required' using errcode = '42501'; end if;
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'content_review' then
    raise exception 'the record is not in Content Review' using errcode = '22023';
  end if;
  if p_decision <> 'recommend_approval' and coalesce(trim(p_comment), '') = '' then
    raise exception 'a comment is required for Recommend With Changes and Not Ready' using errcode = '23514';
  end if;
  select value into v_cats from public.app_settings where key = 'reviewer_categories';
  v_n := 0; v_avg := 0;
  for v_cat in select jsonb_array_elements_text(v_cats) loop
    if not (p_scores ? v_cat) or jsonb_typeof(p_scores -> v_cat) <> 'number' then
      raise exception 'score missing for %', v_cat using errcode = '22023';
    end if;
    if (p_scores ->> v_cat)::numeric < 1 or (p_scores ->> v_cat)::numeric > 5 then
      raise exception 'scores must be between 1 and 5' using errcode = '22023';
    end if;
    v_avg := v_avg + (p_scores ->> v_cat)::numeric; v_n := v_n + 1;
  end loop;
  v_avg := round(v_avg / greatest(v_n, 1), 2);

  insert into public.reviewer_ratings (content_id, creative_version_id, reviewer_id, scores, average, decision, comment)
  values (p_content_id, v_rec.current_creative_version_id, v_me, p_scores, v_avg, p_decision, nullif(trim(p_comment), ''))
  on conflict (content_id, creative_version_id, reviewer_id) do update
    set scores = excluded.scores, average = excluded.average, decision = excluded.decision, comment = excluded.comment, created_at = now()
  returning * into v_rating;

  perform public.log_activity(p_content_id, 'reviewer_rating',
    format('%s rated %s %s/5 — %s', public.actor_name(), v_rec.content_id, v_avg, replace(p_decision::text, '_', ' ')),
    null, jsonb_build_object('rating_id', v_rating.id, 'average', v_avg, 'decision', p_decision, 'creative_version_id', v_rec.current_creative_version_id),
    case when p_decision <> 'recommend_approval' then p_comment else null end);

  select count(*) into v_count from public.reviewer_ratings where content_id = p_content_id and creative_version_id is not distinct from v_rec.current_creative_version_id;
  v_quorum := v_rec.min_reviewer_responses;
  if v_count >= v_quorum then
    perform public.notify(coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('dm.review'), p_content_id, 'reviewer_quorum_met',
      format('%s has %s reviewer responses', v_rec.content_id, v_count), format('Average %s/5', (select round(avg(average), 2) from public.reviewer_ratings where content_id = p_content_id and creative_version_id is not distinct from v_rec.current_creative_version_id)));
  end if;
  return v_rating;
end $$;

create or replace function public.reviewer_summary(p_content_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_rec public.content_records; v_threshold numeric; v_count int; v_avg numeric; v_against int;
  v_override public.overrides;
begin
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then return null; end if;
  v_threshold := public.setting_numeric('reviewer_threshold', 4.0);
  select count(*), round(avg(average), 2), count(*) filter (where decision <> 'recommend_approval')
    into v_count, v_avg, v_against
  from public.reviewer_ratings where content_id = p_content_id and creative_version_id is not distinct from v_rec.current_creative_version_id;
  select * into v_override from public.overrides
   where content_id = p_content_id and kind in ('reviewer_quorum','reviewer_threshold','reviewer_recommendation')
     and creative_version_id is not distinct from v_rec.current_creative_version_id
   order by created_at desc limit 1;
  return jsonb_build_object(
    'required', v_rec.content_review_required,
    'quorum', v_rec.min_reviewer_responses,
    'threshold', v_threshold,
    'count', v_count,
    'average', v_avg,
    'against', v_against,
    'meets_quorum', v_count >= v_rec.min_reviewer_responses,
    'meets_threshold', v_avg is not null and v_avg >= v_threshold,
    'override', case when v_override.id is null then null else jsonb_build_object('id', v_override.id, 'kind', v_override.kind, 'reason', v_override.reason, 'actor_id', v_override.actor_id, 'created_at', v_override.created_at) end,
    'ratings', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'reviewer_id', r.reviewer_id, 'reviewer_name', p.full_name, 'average', r.average, 'decision', r.decision, 'comment', r.comment, 'scores', r.scores, 'created_at', r.created_at) order by r.created_at)
      from public.reviewer_ratings r join public.profiles p on p.id = r.reviewer_id
      where r.content_id = p_content_id and r.creative_version_id is not distinct from v_rec.current_creative_version_id), '[]'::jsonb)
  );
end $$;

-- DM override of quorum / threshold / recommendation (§47). CEO sees it on the final screen.
create or replace function public.record_dm_override(p_content_id uuid, p_reason text)
returns public.overrides
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_sum jsonb; v_kind public.override_kind; v_ov public.overrides; v_rec public.content_records;
begin
  if not public.has_permission('review.override_threshold') then raise exception 'review.override_threshold permission required' using errcode = '42501'; end if;
  if not public.setting_bool('dm_can_override_threshold', true) then raise exception 'overrides are disabled by configuration' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'an override reason is required' using errcode = '23514'; end if;
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  v_sum := public.reviewer_summary(p_content_id);
  if not (v_sum ->> 'meets_quorum')::boolean then v_kind := 'reviewer_quorum';
  elsif not (v_sum ->> 'meets_threshold')::boolean then v_kind := 'reviewer_threshold';
  elsif (v_sum ->> 'against')::int > 0 then v_kind := 'reviewer_recommendation';
  else raise exception 'nothing to override: quorum and threshold are met' using errcode = '22023';
  end if;
  insert into public.overrides (content_id, kind, creative_version_id, actor_id, reason, snapshot) values (p_content_id, v_kind, v_rec.current_creative_version_id, v_me, trim(p_reason), v_sum) returning * into v_ov;
  perform public.log_activity(p_content_id, 'override_recorded',
    format('%s overrode the %s on %s', public.actor_name(), replace(v_kind::text, '_', ' '), v_rec.content_id),
    null, jsonb_build_object('override_id', v_ov.id, 'kind', v_kind), p_reason);
  perform public.notify(public.final_approvers(), p_content_id, 'override_recorded',
    format('%s: %s override by %s', v_rec.content_id, replace(v_kind::text, '_', ' '), public.actor_name()), trim(p_reason));
  return v_ov;
end $$;

-- Complete Content Review → Ready for Final Approval (quorum met or override), or skip with a reason
create or replace function public.complete_content_review(p_content_id uuid, p_skip_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_rec public.content_records; v_sum jsonb;
begin
  if not public.has_permission('dm.review') then raise exception 'dm.review permission required' using errcode = '42501'; end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'content_review' then raise exception 'the record is not in Content Review' using errcode = '22023'; end if;
  v_sum := public.reviewer_summary(p_content_id);
  if not (v_sum ->> 'meets_quorum')::boolean and coalesce(jsonb_typeof(v_sum -> 'override'), 'null') = 'null' then
    if coalesce(trim(p_skip_reason), '') = '' then
      raise exception 'reviewer quorum not met (% of %): skipping Content Review needs a reason', v_sum ->> 'count', v_sum ->> 'quorum' using errcode = '23514';
    end if;
    perform public.log_activity(p_content_id, 'stage_skipped',
      format('%s skipped Content Review on %s with %s of %s responses', public.actor_name(), v_rec.content_id, v_sum ->> 'count', v_sum ->> 'quorum'),
      null, v_sum, p_skip_reason);
    v_rec := public.internal_move_stage(p_content_id, 'ready_for_final_approval', trim(p_skip_reason));
  else
    perform public.log_activity(p_content_id, 'content_review_completed',
      format('%s completed Content Review on %s (%s responses, average %s)', public.actor_name(), v_rec.content_id, v_sum ->> 'count', coalesce(v_sum ->> 'average', '—')),
      null, v_sum);
    v_rec := public.internal_move_stage(p_content_id, 'ready_for_final_approval', null);
  end if;
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- Final Approval Checklist (§48 + S6 additions). Every item has a fix link.
-- ---------------------------------------------------------------------------
create or replace function public.final_approval_checklist(p_content_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_rec public.content_records; v_gate jsonb; v_sum jsonb; v_items jsonb := '[]'::jsonb;
  v_prod_ok boolean; v_dm_ok boolean; v_open_tasks int; v_open_changes int; v_skipped boolean; v_script_pending boolean;
  v_reviewer_ok boolean; v_threshold_ok boolean; v_all boolean; v_blocking boolean; v_overridable text[] := '{}';
  v_cur public.script_versions;
begin
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then return null; end if;
  v_gate := public.gate_status(p_content_id);
  v_sum := public.reviewer_summary(p_content_id);
  select exists (select 1 from public.production_reviews where content_id = p_content_id and decision = 'pass' and creative_version_id is not distinct from v_rec.current_creative_version_id) into v_prod_ok;
  select exists (select 1 from public.dm_reviews where content_id = p_content_id and decision = 'approved' and creative_version_id is not distinct from v_rec.current_creative_version_id) into v_dm_ok;
  v_open_tasks := (v_gate ->> 'open_tasks')::int;
  v_open_changes := (v_gate ->> 'open_change_requests')::int;
  select exists (select 1 from public.activity_log where content_id = p_content_id and event_type = 'stage_skipped') into v_skipped;
  select * into v_cur from public.script_versions where id = v_rec.current_script_version_id;
  v_script_pending := v_rec.approved_script_version_id is not null and v_rec.current_script_version_id is distinct from v_rec.approved_script_version_id and v_cur.is_material_change is null;

  v_reviewer_ok := (not v_rec.content_review_required) or (v_sum ->> 'meets_quorum')::boolean or v_skipped or jsonb_typeof(v_sum -> 'override') <> 'null';
  v_threshold_ok := (not v_rec.content_review_required) or (v_sum ->> 'meets_threshold')::boolean or jsonb_typeof(v_sum -> 'override') <> 'null' or (v_sum ->> 'count')::int = 0;

  v_items := v_items
    || jsonb_build_object('key', 'script_approved', 'label', 'Script approved', 'ok', v_rec.approved_script_version_id is not null, 'detail', case when v_rec.approved_script_version_id is null then 'No approved script version' else 'Pinned' end, 'link', 'script')
    || jsonb_build_object('key', 'script_not_changed', 'label', 'No unclassified script change after approval', 'ok', not v_script_pending, 'detail', case when v_script_pending then 'Current script differs from the approved version; mark it material or not' else 'Clear' end, 'link', 'script')
    || jsonb_build_object('key', 'tasks_done', 'label', 'Production complete (all tasks done)', 'ok', v_open_tasks = 0, 'detail', format('%s open task(s)', v_open_tasks), 'link', 'production')
    || jsonb_build_object('key', 'production_review', 'label', 'Production Review passed on the current creative', 'ok', v_prod_ok, 'detail', case when v_prod_ok then 'Passed' else 'No pass on the current version' end, 'link', 'production')
    || jsonb_build_object('key', 'dm_review', 'label', 'DM / Brand Review approved on the current creative', 'ok', v_dm_ok, 'detail', case when v_dm_ok then 'Approved' else 'No approval on the current version' end, 'link', 'reviews')
    || jsonb_build_object('key', 'reviewer_quorum', 'label', 'Required reviewer responses complete', 'ok', v_reviewer_ok, 'detail', case when not v_rec.content_review_required then 'Content Review off' else format('%s of %s responses%s', v_sum ->> 'count', v_sum ->> 'quorum', case when jsonb_typeof(v_sum -> 'override') <> 'null' then ' (override recorded)' when v_skipped then ' (skipped with reason)' else '' end) end, 'link', 'reviews', 'overridable', true)
    || jsonb_build_object('key', 'reviewer_threshold', 'label', 'Review threshold met or override recorded', 'ok', v_threshold_ok, 'detail', case when not v_rec.content_review_required then 'Content Review off' else format('average %s vs %s%s', coalesce(v_sum ->> 'average', '—'), v_sum ->> 'threshold', case when jsonb_typeof(v_sum -> 'override') <> 'null' then ' (override recorded)' else '' end) end, 'link', 'reviews', 'overridable', true)
    || jsonb_build_object('key', 'changes_resolved', 'label', 'All change requests resolved', 'ok', v_open_changes = 0, 'detail', format('%s open', v_open_changes), 'link', 'reviews')
    || jsonb_build_object('key', 'folder', 'label', 'Production folder linked', 'ok', v_rec.production_folder_url is not null, 'detail', coalesce(v_rec.production_folder_url, 'Missing'), 'link', 'production')
    || jsonb_build_object('key', 'creative', 'label', 'Current creative version identified', 'ok', v_rec.current_creative_version_id is not null, 'detail', case when v_rec.current_creative_version_id is null then 'No review version uploaded' else 'Set' end, 'link', 'production')
    || jsonb_build_object('key', 'hard_flags', 'label', 'No open hard flags on the latest creative check', 'ok', (v_gate ->> 'has_creative_evaluation')::boolean and (v_gate ->> 'open_hard_flag_count')::int = 0, 'detail', case when not (v_gate ->> 'has_creative_evaluation')::boolean then 'No AI creative check on the current version' else format('%s open', v_gate ->> 'open_hard_flag_count') end, 'link', 'reviews')
    || jsonb_build_object('key', 'nepali', 'label', 'No pending Nepali verification', 'ok', not (v_gate ->> 'nepali_pending')::boolean, 'detail', case when (v_gate ->> 'nepali_pending')::boolean then 'Pending' else 'Clear' end, 'link', 'script');

  select bool_and((i ->> 'ok')::boolean) into v_all from jsonb_array_elements(v_items) i;
  select bool_and((i ->> 'ok')::boolean) into v_blocking from jsonb_array_elements(v_items) i where coalesce((i ->> 'overridable')::boolean, false) = false;
  select coalesce(array_agg(i ->> 'key'), '{}') into v_overridable from jsonb_array_elements(v_items) i where not (i ->> 'ok')::boolean and coalesce((i ->> 'overridable')::boolean, false);

  return jsonb_build_object('items', v_items, 'all_ok', coalesce(v_all, true), 'blocking_ok', coalesce(v_blocking, true),
                            'overridable_failures', to_jsonb(v_overridable), 'reviewer_summary', v_sum, 'computed_at', now());
end $$;

-- ---------------------------------------------------------------------------
-- Submit for Final Approval: impossible while any item fails (§48, S6)
-- ---------------------------------------------------------------------------
create or replace function public.submit_for_final_approval(p_content_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_rec public.content_records; v_check jsonb; v_fail text;
begin
  if not public.has_permission('dm.review') then raise exception 'dm.review permission required' using errcode = '42501'; end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'ready_for_final_approval' then raise exception 'the record is not in Ready for Final Approval' using errcode = '22023'; end if;
  v_check := public.final_approval_checklist(p_content_id);
  if not (v_check ->> 'all_ok')::boolean then
    select string_agg(i ->> 'label', '; ') into v_fail from jsonb_array_elements(v_check -> 'items') i where not (i ->> 'ok')::boolean;
    raise exception 'checklist not complete: %', v_fail using errcode = '23514';
  end if;
  perform public.log_activity(p_content_id, 'submitted_for_final_approval',
    format('%s submitted %s for final approval — checklist complete', public.actor_name(), v_rec.content_id), null, v_check);
  v_rec := public.internal_move_stage(p_content_id, 'final_approval', null);
  perform public.notify(public.final_approvers(), p_content_id, 'final_approval_required',
    format('%s is ready for your final approval', v_rec.content_id), v_rec.title);
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- Final approval actions (§50–51)
-- ---------------------------------------------------------------------------
create or replace function public.final_approve(p_content_id uuid, p_override_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_check jsonb; v_fa public.final_approvals;
  v_needs_override boolean; v_kind public.override_kind; v_sum jsonb;
begin
  if not (public.is_final_approver() and public.has_permission('final.approve')) then
    raise exception 'only a Final Approver may final approve' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'final_approval' then raise exception 'the record is not in Final Approval' using errcode = '22023'; end if;
  v_check := public.final_approval_checklist(p_content_id);
  v_sum := v_check -> 'reviewer_summary';
  if not (v_check ->> 'blocking_ok')::boolean then
    raise exception 'blocking checklist items are not met; send it back instead' using errcode = '23514';
  end if;
  v_needs_override := jsonb_array_length(v_check -> 'overridable_failures') > 0
                      or (v_rec.content_review_required and (v_sum ->> 'against')::int > 0 and coalesce(jsonb_typeof(v_sum -> 'override'), 'null') = 'null');
  if v_needs_override and coalesce(trim(p_override_reason), '') = '' then
    raise exception 'reviewer quorum, threshold or recommendation is not met: an override reason is required' using errcode = '23514';
  end if;

  insert into public.final_approvals (content_id, approver_id, decision, script_version_id, creative_version_id, override_reason, checklist_snapshot)
  values (p_content_id, v_me, 'approved', v_rec.approved_script_version_id, v_rec.current_creative_version_id,
          case when v_needs_override then trim(p_override_reason) else null end, v_check)
  returning * into v_fa;

  if v_needs_override then
    v_kind := case when not (v_sum ->> 'meets_quorum')::boolean then 'reviewer_quorum'
                   when not (v_sum ->> 'meets_threshold')::boolean then 'reviewer_threshold'
                   else 'reviewer_recommendation' end;
    insert into public.overrides (content_id, kind, creative_version_id, actor_id, reason, snapshot) values (p_content_id, v_kind, v_rec.current_creative_version_id, v_me, trim(p_override_reason), v_sum);
    perform public.log_activity(p_content_id, 'override_recorded',
      format('%s overrode the %s at final approval on %s', public.actor_name(), replace(v_kind::text, '_', ' '), v_rec.content_id),
      null, jsonb_build_object('kind', v_kind), p_override_reason);
  end if;

  update public.content_records set approved_creative_version_id = v_rec.current_creative_version_id, updated_by = v_me where id = p_content_id;
  update public.creative_versions set is_material_change = coalesce(is_material_change, false) where id = v_rec.current_creative_version_id;

  perform public.log_activity(p_content_id, 'final_approved',
    format('%s gave final approval on %s (script V%s, creative V%s)', public.actor_name(), v_rec.content_id,
           coalesce((select version_no from public.script_versions where id = v_rec.approved_script_version_id)::text, '—'),
           coalesce((select version_no from public.creative_versions where id = v_rec.current_creative_version_id)::text, '—')),
    null, jsonb_build_object('final_approval_id', v_fa.id, 'script_version_id', v_rec.approved_script_version_id, 'creative_version_id', v_rec.current_creative_version_id));

  v_rec := public.internal_move_stage(p_content_id, 'final_approved', null);
  perform public.notify(array_remove(array[v_rec.dm_owner_id], null) || public.profiles_with_permission('publish.schedule') || public.profiles_with_permission('publish.publish'),
    p_content_id, 'final_approved', format('%s is final approved', v_rec.content_id), v_rec.title);
  return v_rec;
end $$;

create or replace function public.final_request_changes(p_content_id uuid, p_reason text, p_items jsonb default '[]'::jsonb)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_item jsonb; v_cat public.change_category; v_team uuid; v_rev int; v_n int := 0;
begin
  if not (public.is_final_approver() and public.has_permission('final.approve')) then
    raise exception 'only a Final Approver may request changes here' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required' using errcode = '23514'; end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key not in ('final_approval', 'final_approved') then raise exception 'the record is not awaiting or past final approval' using errcode = '22023'; end if;

  insert into public.final_approvals (content_id, approver_id, decision, script_version_id, creative_version_id, reason)
  values (p_content_id, v_me, 'changes_requested', v_rec.approved_script_version_id, v_rec.current_creative_version_id, trim(p_reason));

  select coalesce(max(revision_no), 0) + 1 into v_rev from public.change_requests where content_id = p_content_id;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    p_items := jsonb_build_array(jsonb_build_object('description', trim(p_reason), 'category', 'production'));
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cat := coalesce((v_item ->> 'category')::public.change_category, 'production');
    select id into v_team from public.teams where key = case v_cat when 'script_message' then 'dm' else 'production' end;
    insert into public.change_requests (content_id, requested_by, source, category, description, assigned_team_id, assigned_user_id, revision_no)
    values (p_content_id, v_me, 'final_approval', v_cat, trim(v_item ->> 'description'), v_team,
            case v_cat when 'script_message' then v_rec.dm_owner_id else v_rec.production_assignee_id end, v_rev);
    v_n := v_n + 1;
  end loop;
  perform public.log_activity(p_content_id, 'changes_requested',
    format('%s requested %s change%s at final approval on %s', public.actor_name(), v_n, case when v_n = 1 then '' else 's' end, v_rec.content_id),
    null, jsonb_build_object('revision_no', v_rev, 'items', v_n, 'source', 'final_approval'), p_reason);
  v_rec := public.internal_move_stage(p_content_id, 'changes_required', trim(p_reason));
  perform public.notify(array_remove(array[v_rec.dm_owner_id, v_rec.production_assignee_id, v_rec.production_manager_id], null), p_content_id, 'changes_requested',
    format('Final approver requested changes on %s', v_rec.content_id), trim(p_reason));
  return v_rec;
end $$;

create or replace function public.final_reject(p_content_id uuid, p_reason text)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records;
begin
  if not (public.is_final_approver() and public.has_permission('final.approve')) then
    raise exception 'only a Final Approver may reject' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required to reject' using errcode = '23514'; end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'final_approval' then raise exception 'the record is not in Final Approval' using errcode = '22023'; end if;
  insert into public.final_approvals (content_id, approver_id, decision, script_version_id, creative_version_id, reason)
  values (p_content_id, v_me, 'rejected', v_rec.approved_script_version_id, v_rec.current_creative_version_id, trim(p_reason));
  perform public.log_activity(p_content_id, 'rejected', format('%s rejected %s', public.actor_name(), v_rec.content_id), null, null, p_reason);
  v_rec := public.internal_move_stage(p_content_id, 'archived', trim(p_reason));
  perform public.notify(array_remove(array[v_rec.dm_owner_id, v_rec.requester_id], null), p_content_id, 'rejected',
    format('%s was rejected at final approval', v_rec.content_id), trim(p_reason));
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- Creative change after final approval (§52): banner state + material prompt
-- ---------------------------------------------------------------------------
create or replace function public.register_creative_version(
  p_content_id uuid, p_storage_path text, p_file_name text, p_mime text default null,
  p_size_bytes bigint default null, p_kind public.creative_kind default 'image',
  p_width int default null, p_height int default null, p_duration_s numeric default null, p_note text default null
) returns public.creative_versions
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_no int; v_cv public.creative_versions; v_after boolean;
begin
  if not public.can_upload_creative(p_content_id) then
    raise exception 'you may not upload creatives for this record' using errcode = '42501';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'creatives' and name = p_storage_path) then
    raise exception 'file not found in storage; upload it first' using errcode = 'P0002';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  v_after := v_rec.approved_creative_version_id is not null;
  select coalesce(max(version_no), 0) + 1 into v_no from public.creative_versions where content_id = p_content_id;
  insert into public.creative_versions (content_id, version_no, kind, storage_path, file_name, mime, size_bytes, width, height, duration_s, uploaded_by, note, is_material_change)
  values (p_content_id, v_no, p_kind, p_storage_path, p_file_name, p_mime, p_size_bytes, p_width, p_height, p_duration_s, v_me, nullif(trim(p_note), ''),
          case when v_after then null else false end)
  returning * into v_cv;
  update public.content_records set current_creative_version_id = v_cv.id, updated_by = v_me where id = p_content_id;
  perform public.log_activity(p_content_id, 'creative_version_uploaded',
    format('%s uploaded creative V%s (%s) on %s', public.actor_name(), v_no, p_file_name, v_rec.content_id),
    null, jsonb_build_object('creative_version_id', v_cv.id, 'version_no', v_no, 'kind', p_kind));
  if v_after then
    perform public.log_activity(p_content_id, 'creative_changed_after_approval',
      format('Creative V%s uploaded after final approval on %s; material or not is pending', v_no, v_rec.content_id),
      jsonb_build_object('approved_creative_version_id', v_rec.approved_creative_version_id), jsonb_build_object('creative_version_id', v_cv.id));
  end if;
  return v_cv;
end $$;

create or replace function public.mark_creative_material(p_creative_version_id uuid, p_is_material boolean, p_reason text)
returns public.creative_versions
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_cv public.creative_versions; v_rec public.content_records;
begin
  select * into v_cv from public.creative_versions where id = p_creative_version_id for update;
  if v_cv.id is null then raise exception 'creative version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_cv.content_id for update;
  if not (public.has_permission('production.assign') or public.has_permission('dm.review')
          or (public.has_permission('production.update_own') and (v_rec.production_assignee_id = v_me or v_cv.uploaded_by = v_me))) then
    raise exception 'permission required to classify this creative change' using errcode = '42501';
  end if;
  if v_rec.approved_creative_version_id is null then raise exception 'no final-approved creative exists; nothing to compare against' using errcode = '22023'; end if;
  if v_rec.current_creative_version_id <> p_creative_version_id then raise exception 'only the current creative can be classified' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required when classifying a change after final approval' using errcode = '23514'; end if;

  update public.creative_versions set is_material_change = p_is_material, material_reason = trim(p_reason) where id = p_creative_version_id returning * into v_cv;
  perform public.log_activity(v_rec.id, 'creative_material_change',
    format('%s marked creative V%s as %s change after final approval', public.actor_name(), v_cv.version_no, case when p_is_material then 'a MATERIAL' else 'a non-material' end),
    null, jsonb_build_object('creative_version_id', p_creative_version_id, 'is_material', p_is_material), p_reason);

  if p_is_material then
    update public.content_records set approved_creative_version_id = null, updated_by = v_me where id = v_rec.id;
    if v_rec.status_key in ('final_approved', 'scheduled') then
      perform public.internal_move_stage(v_rec.id, 'final_approval', 'Material creative change: ' || trim(p_reason));
    end if;
    perform public.notify(public.final_approvers(), v_rec.id, 're_approval_required',
      format('%s needs CEO re-approval', v_rec.content_id), format('Creative V%s is a material change: %s', v_cv.version_no, trim(p_reason)));
  else
    -- Non-material: the approval carries over to the new version.
    update public.content_records set approved_creative_version_id = p_creative_version_id, updated_by = v_me where id = v_rec.id;
  end if;
  return v_cv;
end $$;

-- ---------------------------------------------------------------------------
-- Queues
-- ---------------------------------------------------------------------------
create or replace view public.v_content_review_queue with (security_invoker = true) as
select kc.id as content_id, kc.content_id as content_code, kc.title, kc.region_code, kc.priority, kc.content_type, kc.dm_owner_name,
       kc.stage_entered_at, kc.seconds_in_stage, kc.due_date, kc.is_overdue, cr.min_reviewer_responses,
       cr.current_creative_version_id, cv.version_no as creative_version_no,
       (select count(*) from public.reviewer_ratings r where r.content_id = kc.id and r.creative_version_id is not distinct from cr.current_creative_version_id)::int as responses,
       exists (select 1 from public.reviewer_ratings r where r.content_id = kc.id and r.creative_version_id is not distinct from cr.current_creative_version_id and r.reviewer_id = public.auth_profile_id()) as rated_by_me,
       exists (select 1 from public.reviewer_ratings r where r.content_id = kc.id and r.reviewer_id = public.auth_profile_id() and r.creative_version_id is distinct from cr.current_creative_version_id) as re_review_required
from public.v_kanban_cards kc
join public.content_records cr on cr.id = kc.id
left join public.creative_versions cv on cv.id = cr.current_creative_version_id
where kc.status_key = 'content_review';

create or replace view public.v_final_approval_queue with (security_invoker = true) as
select kc.id as content_id, kc.content_id as content_code, kc.title, kc.region_code, kc.priority, kc.content_type, kc.dm_owner_name, kc.assignee_name,
       kc.stage_entered_at, kc.seconds_in_stage, kc.target_publish_date, kc.is_overdue,
       kc.creative_ai_score, kc.creative_ai_verdict, kc.creative_open_flags, kc.open_change_requests, kc.content_review_required,
       (select count(*) from public.overrides o where o.content_id = kc.id)::int as override_count,
       (select count(*) from public.final_approvals f where f.content_id = kc.id and f.decision = 'approved')::int as prior_approvals,
       cr.approved_creative_version_id is null and exists (select 1 from public.final_approvals f where f.content_id = kc.id and f.decision = 'approved') as is_reapproval
from public.v_kanban_cards kc
join public.content_records cr on cr.id = kc.id
where kc.status_key = 'final_approval';

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.reviewer_ratings enable row level security;
alter table public.overrides enable row level security;
alter table public.final_approvals enable row level security;
create policy reviewer_ratings_select on public.reviewer_ratings for select to authenticated using (public.is_active_user());
create policy overrides_select on public.overrides for select to authenticated using (public.is_active_user());
create policy final_approvals_select on public.final_approvals for select to authenticated using (public.is_active_user());

grant select on public.reviewer_ratings, public.overrides, public.final_approvals, public.v_content_review_queue, public.v_final_approval_queue to authenticated;
grant execute on function
  public.setting_numeric(text, numeric),
  public.set_content_review_required(uuid, boolean, int, text),
  public.submit_reviewer_rating(uuid, jsonb, public.reviewer_decision, text),
  public.reviewer_summary(uuid),
  public.record_dm_override(uuid, text),
  public.complete_content_review(uuid, text),
  public.final_approval_checklist(uuid),
  public.submit_for_final_approval(uuid),
  public.final_approve(uuid, text),
  public.final_request_changes(uuid, text, jsonb),
  public.final_reject(uuid, text),
  public.mark_creative_material(uuid, boolean, text)
to authenticated;
