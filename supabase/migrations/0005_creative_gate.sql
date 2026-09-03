-- ============================================================================
-- 0005_creative_gate.sql — Phase 4: AI Creative & Brand Score storage,
-- DM / Brand Review, change requests with routing, revision loop, gate status.
-- Rules: hard flags first, scores second; AI never moves a stage; change
--        requests need a reason and route by category; every revision stays
--        in the log. D6: feed statics are 4:5 with a ~10% safe zone.
-- ============================================================================

create type public.dm_decision as enum ('approved','changes_requested');
create type public.change_source as enum ('dm_review','final_approval','content_review','production_review');
create type public.change_category as enum ('production','script_message','other');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.dm_reviews (
  id                  uuid primary key default gen_random_uuid(),
  content_id          uuid not null references public.content_records(id),
  creative_version_id uuid references public.creative_versions(id),
  reviewer_id         uuid not null references public.profiles(id),
  decision            public.dm_decision not null,
  scores              jsonb,
  checklist           jsonb not null default '{}'::jsonb,
  feedback            text,
  created_at          timestamptz not null default now()
);
create index dm_reviews_content_idx on public.dm_reviews(content_id, created_at desc);

create table public.change_requests (
  id               uuid primary key default gen_random_uuid(),
  content_id       uuid not null references public.content_records(id),
  requested_by     uuid not null references public.profiles(id),
  source           public.change_source not null,
  category         public.change_category not null default 'production',
  description      text not null check (length(trim(description)) > 0),
  assigned_team_id uuid references public.teams(id),
  assigned_user_id uuid references public.profiles(id),
  revision_no      int not null default 1,
  is_resolved      boolean not null default false,
  resolved_by      uuid references public.profiles(id),
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now()
);
create index change_requests_content_idx on public.change_requests(content_id, is_resolved, created_at desc);
create index change_requests_assignee_idx on public.change_requests(assigned_user_id) where not is_resolved;

insert into public.app_settings (key, value, description) values
  ('rerun_on_new_creative', 'true', 'Re-run the AI creative gate automatically when a new creative version is uploaded (S9)'),
  ('hard_flags_block_submit', 'true', 'Open hard flags block Submit for Final Approval (S6); they never block DM review itself'),
  ('require_ai_before_dm_review', 'true', 'A completed creative evaluation on the current version is required before a DM decision'),
  ('creative_eval_max_per_hour', '3', 'Cost guard: maximum automatic creative evaluations per version per hour'),
  ('dm_review_checklist', '["Hook lands", "Core message clear", "Right for the target audience", "TechSkills differentiation visible", "Premium positioning", "Copy quality", "CTA present and visible", "Visual hierarchy", "Mobile readability", "Production followed the concept"]', 'DM / Brand Review checklist (§39)');

-- D6: platform format expectations, editable under Reference data → brand facts
insert into public.brand_facts (key, value) values
  ('platform_formats', '{"feed_static": {"ratio": "4:5", "width": 1080, "height": 1350, "safe_margin_pct": 10, "note": "Mobile-first feed static; one message per creative; detail goes to carousel slides"}, "carousel": {"ratio": "4:5", "width": 1080, "height": 1350, "safe_margin_pct": 10}, "story": {"ratio": "9:16", "width": 1080, "height": 1920, "safe_margin_pct": 12}, "reel": {"ratio": "9:16", "width": 1080, "height": 1920, "safe_margin_pct": 12}, "thumbnail": {"ratio": "16:9", "width": 1280, "height": 720, "safe_margin_pct": 8}}')
on conflict (key) do update set value = excluded.value;

-- Gate transitions through their RPCs
update public.allowed_transitions set rpc_only = true
 where (from_status, to_status) in (('dm_review','changes_required'), ('dm_review','content_review'), ('dm_review','ready_for_final_approval'),
                                    ('changes_required','production'), ('changes_required','script_copy'));

-- ---------------------------------------------------------------------------
-- Creative evaluation storage (service role only, from evaluate-creative)
-- ---------------------------------------------------------------------------
create or replace function public.latest_creative_evaluation(p_version_id uuid)
returns public.ai_evaluations language sql stable security definer set search_path = public as $$
  select * from public.ai_evaluations
  where creative_version_id = p_version_id and evaluation_type = 'creative'
  order by created_at desc limit 1;
$$;

create or replace function public.can_run_creative_evaluation(p_version_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user()
     and (public.has_permission('production.review') or public.has_permission('dm.review')
          or public.has_permission('production.assign') or public.has_permission('final.approve')
          or exists (select 1 from public.creative_versions cv join public.content_records cr on cr.id = cv.content_id
                     where cv.id = p_version_id and cr.production_assignee_id = public.auth_profile_id()))
     and exists (select 1 from public.creative_versions where id = p_version_id);
$$;

create or replace function public.record_creative_evaluation(p jsonb)
returns public.ai_evaluations
language plpgsql security definer set search_path = public as $$
declare
  v_eval public.ai_evaluations;
  v_rec public.content_records;
  v_cv public.creative_versions;
  v_requester uuid := (p ->> 'requested_by')::uuid;
  v_flag_count int;
  v_disclosure boolean; v_nepali boolean;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'record_creative_evaluation is service-only' using errcode = '42501';
  end if;
  select * into v_cv from public.creative_versions where id = (p ->> 'creative_version_id')::uuid;
  if v_cv.id is null then raise exception 'creative version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_cv.content_id;

  insert into public.ai_evaluations (
    content_id, evaluation_type, creative_version_id, provider, model, prompt_version, input_hash,
    overall_score, category_scores, recommendations, hard_flags, verdict, summary, raw_response, requested_by, duration_ms
  ) values (
    v_rec.id, 'creative', v_cv.id, p ->> 'provider', p ->> 'model', p ->> 'prompt_version', p ->> 'input_hash',
    (p ->> 'overall_score')::numeric, coalesce(p -> 'category_scores', '{}'::jsonb),
    coalesce(p -> 'recommendations', '[]'::jsonb), coalesce(p -> 'hard_flags', '[]'::jsonb),
    p ->> 'verdict', p ->> 'summary', p -> 'raw_response', v_requester, (p ->> 'duration_ms')::int
  ) returning * into v_eval;
  v_flag_count := jsonb_array_length(v_eval.hard_flags);

  insert into public.activity_log (content_id, actor_id, event_type, description, new_value, source, metadata)
  values (v_rec.id, v_requester, 'ai_evaluation_completed',
    format('AI creative check on creative V%s: %s/10, %s hard flag%s (%s)', v_cv.version_no,
           coalesce(v_eval.overall_score::text, '—'), v_flag_count, case when v_flag_count = 1 then '' else 's' end, coalesce(v_eval.verdict, 'n/a')),
    jsonb_build_object('evaluation_id', v_eval.id, 'overall_score', v_eval.overall_score, 'verdict', v_eval.verdict, 'flag_count', v_flag_count, 'creative_version_id', v_cv.id),
    'ai', jsonb_build_object('provider', v_eval.provider, 'model', v_eval.model));

  select exists (select 1 from jsonb_array_elements(v_eval.hard_flags) f where f ->> 'key' = 'ai_disclosure_required') into v_disclosure;
  select exists (select 1 from jsonb_array_elements(v_eval.hard_flags) f where f ->> 'key' = 'nepali_verify') into v_nepali;

  if v_disclosure and not v_rec.requires_ai_disclosure then
    update public.content_records set requires_ai_disclosure = true where id = v_rec.id;
    insert into public.activity_log (content_id, actor_id, event_type, description, source)
    values (v_rec.id, v_requester, 'ai_disclosure_flagged', format('Synthetic imagery detected on %s; AI disclosure will be required at publish', v_rec.content_id), 'ai');
  end if;
  if v_nepali and v_rec.nepali_verification = 'not_needed' then
    update public.content_records set nepali_verification = 'pending' where id = v_rec.id;
    insert into public.activity_log (content_id, actor_id, event_type, description, source)
    values (v_rec.id, v_requester, 'nepali_verification_requested', format('Nepali text detected on %s creative; human verification pending', v_rec.content_id), 'ai');
    insert into public.notifications (recipient_id, content_id, type, title, body)
    select p2.id, v_rec.id, 'nepali_verification_requested', format('%s has Nepali text to verify', v_rec.content_id), v_rec.title
    from public.profiles p2 where p2.account_status = 'active' and p2.can_verify_nepali;
  end if;

  if v_flag_count > 0 then
    insert into public.notifications (recipient_id, content_id, type, title, body)
    select distinct r, v_rec.id, 'ai_flags_found', format('%s: %s hard flag%s on creative V%s', v_rec.content_id, v_flag_count, case when v_flag_count = 1 then '' else 's' end, v_cv.version_no), v_eval.summary
    from unnest(array_remove(array[v_rec.production_assignee_id, v_rec.production_manager_id, v_rec.dm_owner_id], null)) r;
  end if;
  return v_eval;
end $$;

revoke execute on function public.record_creative_evaluation(jsonb) from public, anon, authenticated;
grant execute on function public.record_creative_evaluation(jsonb), public.can_run_creative_evaluation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Gate status: what still blocks this record (consumed by the DM screen now,
-- the Final Approval checklist in Phase 5)
-- ---------------------------------------------------------------------------
create or replace function public.gate_status(p_content_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_rec public.content_records;
  v_eval public.ai_evaluations;
  v_open_flags jsonb := '[]'::jsonb;
  v_open_count int := 0;
  v_open_changes int;
  v_open_tasks int;
begin
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then return null; end if;
  if v_rec.current_creative_version_id is not null then
    v_eval := public.latest_creative_evaluation(v_rec.current_creative_version_id);
    if v_eval.id is not null then
      select coalesce(jsonb_agg(f.flag || jsonb_build_object('index', f.idx - 1)), '[]'::jsonb), count(*)
        into v_open_flags, v_open_count
      from jsonb_array_elements(v_eval.hard_flags) with ordinality f(flag, idx)
      where not exists (select 1 from public.ai_flag_resolutions r where r.evaluation_id = v_eval.id and r.flag_index = f.idx - 1);
    end if;
  end if;
  select count(*) into v_open_changes from public.change_requests where content_id = p_content_id and not is_resolved;
  select count(*) into v_open_tasks from public.production_tasks where content_id = p_content_id and status in ('todo','in_progress');
  return jsonb_build_object(
    'has_creative', v_rec.current_creative_version_id is not null,
    'has_creative_evaluation', v_eval.id is not null,
    'evaluation_id', v_eval.id,
    'verdict', v_eval.verdict,
    'open_hard_flags', v_open_flags,
    'open_hard_flag_count', v_open_count,
    'nepali_pending', v_rec.nepali_verification = 'pending',
    'requires_ai_disclosure', v_rec.requires_ai_disclosure,
    'open_change_requests', v_open_changes,
    'open_tasks', v_open_tasks,
    'has_folder', v_rec.production_folder_url is not null,
    'script_approved', v_rec.approved_script_version_id is not null
  );
end $$;

-- ---------------------------------------------------------------------------
-- DM / Brand Review (§40) with change-request routing (§41)
-- ---------------------------------------------------------------------------
create or replace function public.dm_review(
  p_content_id uuid, p_decision public.dm_decision, p_feedback text default null,
  p_items jsonb default '[]'::jsonb, p_checklist jsonb default '{}'::jsonb, p_scores jsonb default null
) returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_review public.dm_reviews;
  v_eval public.ai_evaluations;
  v_item jsonb; v_cat public.change_category; v_team uuid; v_rev int; v_n int := 0;
  v_reason text;
begin
  if not public.has_permission('dm.review') then
    raise exception 'dm.review permission required' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'dm_review' then
    raise exception 'the record is not in DM / Brand Review' using errcode = '22023';
  end if;
  if public.setting_bool('require_ai_before_dm_review', true) then
    v_eval := public.latest_creative_evaluation(v_rec.current_creative_version_id);
    if v_eval.id is null then
      raise exception 'run the AI creative check on the current version before a DM decision' using errcode = '23514';
    end if;
  end if;
  if p_decision = 'changes_requested' and jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 and coalesce(trim(p_feedback), '') = '' then
    raise exception 'a reason or at least one change item is required' using errcode = '23514';
  end if;

  insert into public.dm_reviews (content_id, creative_version_id, reviewer_id, decision, scores, checklist, feedback)
  values (p_content_id, v_rec.current_creative_version_id, v_me, p_decision, p_scores, coalesce(p_checklist, '{}'::jsonb), nullif(trim(p_feedback), ''))
  returning * into v_review;

  perform public.log_activity(p_content_id, 'dm_review',
    format('%s %s DM / Brand Review on %s', public.actor_name(), case p_decision when 'approved' then 'approved' else 'requested changes in' end, v_rec.content_id),
    null, jsonb_build_object('review_id', v_review.id, 'decision', p_decision, 'creative_version_id', v_rec.current_creative_version_id),
    case when p_decision = 'changes_requested' then p_feedback else null end);

  if p_decision = 'approved' then
    if v_rec.content_review_required then
      v_rec := public.internal_move_stage(p_content_id, 'content_review', null);
    else
      v_rec := public.internal_move_stage(p_content_id, 'ready_for_final_approval', null);
    end if;
    return v_rec;
  end if;

  -- Change requests: one row per item, revision number increments per loop
  select coalesce(max(revision_no), 0) + 1 into v_rev from public.change_requests where content_id = p_content_id;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    p_items := jsonb_build_array(jsonb_build_object('description', trim(p_feedback), 'category', 'production'));
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cat := coalesce((v_item ->> 'category')::public.change_category, 'production');
    select id into v_team from public.teams where key = case v_cat when 'script_message' then 'dm' else 'production' end;
    insert into public.change_requests (content_id, requested_by, source, category, description, assigned_team_id, assigned_user_id, revision_no)
    values (p_content_id, v_me, 'dm_review', v_cat, trim(v_item ->> 'description'), v_team,
            coalesce((v_item ->> 'assigned_user_id')::uuid, case v_cat when 'script_message' then v_rec.dm_owner_id else v_rec.production_assignee_id end), v_rev);
    v_n := v_n + 1;
  end loop;

  perform public.log_activity(p_content_id, 'changes_requested',
    format('%s requested %s change%s on %s (revision %s)', public.actor_name(), v_n, case when v_n = 1 then '' else 's' end, v_rec.content_id, v_rev),
    null, jsonb_build_object('review_id', v_review.id, 'revision_no', v_rev, 'items', v_n), p_feedback);

  v_reason := coalesce(nullif(trim(p_feedback), ''), (select string_agg(trim(i ->> 'description'), '; ') from jsonb_array_elements(p_items) i));
  v_rec := public.internal_move_stage(p_content_id, 'changes_required', v_reason);
  perform public.notify(array_remove(array[v_rec.production_assignee_id, v_rec.production_manager_id, v_rec.dm_owner_id], null), p_content_id, 'changes_requested',
    format('Changes requested on %s', v_rec.content_id), v_reason);
  return v_rec;
end $$;

-- Resolve one change request (assignee, requester, or a manager)
create or replace function public.resolve_change_request(p_request_id uuid, p_note text default null)
returns public.change_requests
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_cr public.change_requests; v_rec public.content_records;
begin
  select * into v_cr from public.change_requests where id = p_request_id for update;
  if v_cr.id is null then raise exception 'change request not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_cr.content_id;
  if not (v_cr.assigned_user_id = v_me or v_cr.requested_by = v_me
          or public.has_permission('production.assign') or public.has_permission('dm.review')) then
    raise exception 'you may not resolve this change request' using errcode = '42501';
  end if;
  update public.change_requests set is_resolved = true, resolved_by = v_me, resolved_at = now(), resolution_note = nullif(trim(p_note), '')
   where id = p_request_id returning * into v_cr;
  perform public.log_activity(v_cr.content_id, 'change_request_resolved',
    format('%s resolved change request "%s" on %s', public.actor_name(), left(v_cr.description, 60), v_rec.content_id),
    null, jsonb_build_object('request_id', v_cr.id), p_note);
  return v_cr;
end $$;

create or replace function public.reopen_change_request(p_request_id uuid, p_reason text)
returns public.change_requests
language plpgsql security definer set search_path = public as $$
declare v_cr public.change_requests; v_rec public.content_records;
begin
  if not public.has_permission('dm.review') then raise exception 'dm.review permission required' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required to reopen' using errcode = '23514'; end if;
  update public.change_requests set is_resolved = false, resolved_by = null, resolved_at = null, resolution_note = null
   where id = p_request_id returning * into v_cr;
  if v_cr.id is null then raise exception 'change request not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_cr.content_id;
  perform public.log_activity(v_cr.content_id, 'change_request_reopened',
    format('%s reopened change request "%s" on %s', public.actor_name(), left(v_cr.description, 60), v_rec.content_id),
    null, jsonb_build_object('request_id', v_cr.id), p_reason);
  return v_cr;
end $$;

-- Route Changes Required back into the loop (§41): production or script
create or replace function public.route_changes_required(p_content_id uuid, p_target text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_target text; v_script_open int; v_prod_open int;
begin
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'changes_required' then
    raise exception 'the record is not in Changes Required' using errcode = '22023';
  end if;
  if not (public.has_permission('production.assign') or public.has_permission('dm.review')
          or (public.has_permission('production.update_own') and v_rec.production_assignee_id = v_me)) then
    raise exception 'permission required to route changes' using errcode = '42501';
  end if;
  select count(*) filter (where category = 'script_message'), count(*) filter (where category <> 'script_message')
    into v_script_open, v_prod_open
  from public.change_requests where content_id = p_content_id and not is_resolved;
  v_target := coalesce(p_target, case when v_script_open > 0 then 'script_copy' else 'production' end);
  if v_target not in ('production', 'script_copy') then
    raise exception 'target must be production or script_copy' using errcode = '22023';
  end if;
  if v_target = 'script_copy' and not public.has_permission('script.edit') then
    raise exception 'script.edit permission required to route to the script' using errcode = '42501';
  end if;
  perform public.log_activity(p_content_id, 'changes_routed',
    format('%s sent %s back to %s for rework', public.actor_name(), v_rec.content_id, case v_target when 'production' then 'Production' else 'Script / Copy' end),
    null, jsonb_build_object('target', v_target, 'open_script_items', v_script_open, 'open_production_items', v_prod_open));
  v_rec := public.internal_move_stage(p_content_id, v_target, null);
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create or replace view public.v_creative_ai_latest with (security_invoker = true) as
select distinct on (e.content_id) e.content_id, e.id as evaluation_id, e.creative_version_id, e.overall_score, e.verdict,
       jsonb_array_length(e.hard_flags) as flag_count,
       (select count(*) from jsonb_array_elements(e.hard_flags) with ordinality f(flag, idx)
         where not exists (select 1 from public.ai_flag_resolutions r where r.evaluation_id = e.id and r.flag_index = f.idx - 1))::int as open_flag_count,
       e.created_at
from public.ai_evaluations e
join public.content_records cr on cr.id = e.content_id and cr.current_creative_version_id = e.creative_version_id
where e.evaluation_type = 'creative'
order by e.content_id, e.created_at desc;

create or replace view public.v_dm_review_queue with (security_invoker = true) as
select kc.id as content_id, kc.content_id as content_code, kc.title, kc.region_code, kc.priority, kc.content_type, kc.medium,
       kc.dm_owner_id, kc.dm_owner_name, kc.assignee_name, kc.stage_entered_at, kc.seconds_in_stage, kc.due_date, kc.is_overdue,
       cv.id as creative_version_id, cv.version_no as creative_version_no, cv.kind as creative_kind, cv.file_name,
       ai.evaluation_id, ai.overall_score, ai.verdict, ai.flag_count, ai.open_flag_count,
       (select count(*) from public.change_requests c where c.content_id = kc.id)::int as loop_count,
       kc.content_review_required, kc.nepali_verification, kc.requires_ai_disclosure
from public.v_kanban_cards kc
join public.content_records cr on cr.id = kc.id
left join public.creative_versions cv on cv.id = cr.current_creative_version_id
left join public.v_creative_ai_latest ai on ai.content_id = kc.id
where kc.status_key = 'dm_review';

-- Kanban: append creative gate columns
create or replace view public.v_kanban_cards with (security_invoker = true) as
select base.*, ai.overall_score as ai_score, ai.verdict as ai_verdict, ai.flag_count as ai_flag_count,
       cai.overall_score as creative_ai_score, cai.verdict as creative_ai_verdict, cai.open_flag_count as creative_open_flags,
       (select count(*) from public.change_requests c where c.content_id = base.id and not c.is_resolved)::int as open_change_requests
from (
  with last_act as (
    select distinct on (content_id) content_id, created_at, actor_id
    from public.activity_log where content_id is not null
    order by content_id, created_at desc
  ),
  cc as (select content_id, count(*)::int as comment_count from public.comments group by content_id),
  plat as (
    select cp.content_id, array_agg(p.name order by p.sort_order) as platforms
    from public.content_platforms cp join public.platforms p on p.id = cp.platform_id group by cp.content_id
  ),
  diff as (
    select cd.content_id, array_agg(d.name order by d.sort_order) as differentiators
    from public.content_differentiators cd join public.differentiators d on d.id = cd.differentiator_id group by cd.content_id
  ),
  cur as (select content_id, entered_at from public.stage_history where exited_at is null)
  select cr.id, cr.content_id, cr.title, cr.status_key, ws.name as status_name, ws.sort_order as status_order,
         ws.colour_key, ws.group_key, ws.is_terminal,
         cr.priority, cr.region_code, cr.campus_id, cr.program_id, cr.campaign_id,
         ct.name as content_type, ct.medium,
         ob.name as objective,
         coalesce(plat.platforms, '{}'::text[]) as platforms,
         coalesce(diff.differentiators, '{}'::text[]) as differentiators,
         cr.dm_owner_id, dm.full_name as dm_owner_name,
         cr.production_assignee_id, pa.full_name as assignee_name,
         cr.production_folder_url is not null as has_folder,
         cr.script_due, cr.production_due, cr.review_due, cr.target_publish_date,
         case cr.status_key
           when 'script_copy' then cr.script_due
           when 'production' then cr.production_due
           when 'changes_required' then cr.production_due
           when 'dm_review' then cr.review_due
           when 'content_review' then cr.review_due
           else cr.target_publish_date end as due_date,
         (not ws.is_terminal) and coalesce(
           case cr.status_key
             when 'script_copy' then cr.script_due
             when 'production' then cr.production_due
             when 'changes_required' then cr.production_due
             when 'dm_review' then cr.review_due
             when 'content_review' then cr.review_due
             else cr.target_publish_date end < current_date, false) as is_overdue,
         coalesce(cc.comment_count, 0) as comment_count,
         cur.entered_at as stage_entered_at,
         floor(extract(epoch from (now() - cur.entered_at)))::int as seconds_in_stage,
         la.created_at as last_activity_at, lp.full_name as last_activity_by,
         (not ws.is_terminal) and public.working_days_between(coalesce(la.created_at, cr.created_at), now()) >= 3 as is_stalled,
         cr.current_script_version_id is not null as has_script,
         cr.approved_script_version_id is not null as script_approved,
         cr.requires_ai_disclosure, cr.nepali_verification, cr.content_review_required,
         cr.created_at, cr.updated_at
  from public.content_records cr
  join public.workflow_statuses ws on ws.key = cr.status_key
  join public.content_types ct on ct.id = cr.content_type_id
  left join public.objectives ob on ob.id = cr.objective_id
  left join plat on plat.content_id = cr.id
  left join diff on diff.content_id = cr.id
  left join cc on cc.content_id = cr.id
  left join cur on cur.content_id = cr.id
  left join last_act la on la.content_id = cr.id
  left join public.profiles lp on lp.id = la.actor_id
  left join public.profiles dm on dm.id = cr.dm_owner_id
  left join public.profiles pa on pa.id = cr.production_assignee_id
) base
left join public.v_script_ai_latest ai on ai.content_id = base.id
left join public.v_creative_ai_latest cai on cai.content_id = base.id;

-- Views that depend on v_kanban_cards pick up the new columns automatically
-- (they select explicit columns), so no re-creation is needed.

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.dm_reviews enable row level security;
alter table public.change_requests enable row level security;
create policy dm_reviews_select on public.dm_reviews for select to authenticated using (public.is_active_user());
create policy change_requests_select on public.change_requests for select to authenticated using (public.is_active_user());

grant select on public.dm_reviews, public.change_requests, public.v_creative_ai_latest, public.v_dm_review_queue to authenticated;
grant execute on function
  public.latest_creative_evaluation(uuid),
  public.can_run_creative_evaluation(uuid),
  public.gate_status(uuid),
  public.dm_review(uuid, public.dm_decision, text, jsonb, jsonb, jsonb),
  public.resolve_change_request(uuid, text),
  public.reopen_change_request(uuid, text),
  public.route_changes_required(uuid, text)
to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_ai_flag: the record's production assignee may also resolve flags on
-- their own creative (dismissing still needs a reason; synthetic-human flags
-- can only be dismissed by DM review).
-- ---------------------------------------------------------------------------
create or replace function public.resolve_ai_flag(p_evaluation_id uuid, p_flag_index int, p_action public.flag_action, p_reason text default null)
returns public.ai_flag_resolutions
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_eval public.ai_evaluations;
  v_rec public.content_records;
  v_flag jsonb;
  v_res public.ai_flag_resolutions;
  v_allowed boolean;
begin
  select * into v_eval from public.ai_evaluations where id = p_evaluation_id;
  if v_eval.id is null then raise exception 'evaluation not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_eval.content_id;

  v_allowed := public.has_permission('script.edit') or public.has_permission('dm.review')
               or public.has_permission('production.review') or public.has_permission('production.assign')
               or (v_eval.evaluation_type = 'creative' and public.has_permission('production.update_own') and v_rec.production_assignee_id = v_me);
  if not v_allowed then
    raise exception 'permission required to resolve flags' using errcode = '42501';
  end if;

  v_flag := v_eval.hard_flags -> p_flag_index;
  if v_flag is null then raise exception 'flag not found' using errcode = 'P0002'; end if;
  if p_action = 'dismissed' and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to dismiss a flag' using errcode = '23514';
  end if;
  if p_action = 'dismissed' and v_flag ->> 'key' = 'synthetic_human_on_proof' and not public.has_permission('dm.review') then
    raise exception 'only DM review may dismiss a synthetic-human flag' using errcode = '42501';
  end if;

  insert into public.ai_flag_resolutions (evaluation_id, flag_key, flag_index, action, reason, actor_id)
  values (p_evaluation_id, v_flag ->> 'key', p_flag_index, p_action, nullif(trim(p_reason), ''), v_me)
  on conflict (evaluation_id, flag_index) do update set action = excluded.action, reason = excluded.reason, actor_id = excluded.actor_id, created_at = now()
  returning * into v_res;

  perform public.log_activity(v_eval.content_id, 'ai_flag_' || p_action::text,
    format('%s %s AI flag "%s"', public.actor_name(), p_action, v_flag ->> 'key'),
    null, jsonb_build_object('evaluation_id', p_evaluation_id, 'flag_key', v_flag ->> 'key', 'evaluation_type', v_eval.evaluation_type), p_reason);
  return v_res;
end $$;
