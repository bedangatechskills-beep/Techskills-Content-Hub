-- ============================================================================
-- 0003_rpc_only_transitions.sql — transitions that must go through their
-- dedicated RPC (submit_script_for_approval, approve_script,
-- request_script_changes) so the gate rules cannot be bypassed by a plain
-- Kanban move.
-- ============================================================================

alter table public.allowed_transitions add column rpc_only boolean not null default false;

update public.allowed_transitions set rpc_only = true
 where (from_status, to_status) in (('script_copy','script_approval'), ('script_approval','ready_for_production'), ('script_approval','script_copy'));

-- Hide RPC-only transitions from the generic move menu
create or replace function public.available_transitions(p_content_id uuid)
returns table (to_status text, to_name text, reason_required boolean, is_backward boolean, label text)
language sql stable security definer set search_path = public as $$
  select distinct on (t.to_status)
         t.to_status, ws.name,
         (t.reason_required
           or (t.from_status = 'dm_review' and t.to_status = 'ready_for_final_approval' and cr.content_review_required)) as reason_required,
         t.is_backward, t.label
  from public.content_records cr
  join public.allowed_transitions t on t.from_status = cr.status_key
  join public.workflow_statuses ws on ws.key = t.to_status
  where cr.id = p_content_id
    and not t.rpc_only
    and public.is_active_user()
    and public.has_permission(t.permission_key)
    and (t.to_status <> 'final_approved' or public.is_final_approver())
  order by t.to_status, t.is_backward, t.reason_required;
$$;

-- move_stage: reject rpc_only transitions unless the calling RPC set the flag
create or replace function public.move_stage(p_content_id uuid, p_to_status text, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_from text;
  v_tr public.allowed_transitions;
  v_reason_required boolean;
  v_from_name text; v_to_name text;
  v_recipients uuid[] := '{}';
begin
  if not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;

  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then
    raise exception 'content record not found' using errcode = 'P0002';
  end if;
  v_from := v_rec.status_key;

  if v_from = p_to_status then
    raise exception 'content is already in stage %', p_to_status using errcode = '22023';
  end if;

  select t.* into v_tr
  from public.allowed_transitions t
  where t.from_status = v_from and t.to_status = p_to_status and public.has_permission(t.permission_key)
  order by t.reason_required, t.is_backward
  limit 1;

  if v_tr.id is null then
    if exists (select 1 from public.allowed_transitions where from_status = v_from and to_status = p_to_status) then
      raise exception 'your role may not move content from % to %', v_from, p_to_status using errcode = '42501';
    end if;
    raise exception 'moving from % to % is not an allowed transition', v_from, p_to_status using errcode = '22023';
  end if;

  if v_tr.rpc_only and coalesce(current_setting('app.internal_move', true), '') <> 'on' then
    raise exception 'this move happens through its own action (submit, approve or request changes), not a plain stage move'
      using errcode = '22023';
  end if;

  if p_to_status = 'final_approved' and not public.is_final_approver() then
    raise exception 'only a Final Approver may move content to Final Approved' using errcode = '42501';
  end if;

  v_reason_required := v_tr.reason_required
    or (v_from = 'dm_review' and p_to_status = 'ready_for_final_approval' and v_rec.content_review_required);
  if v_reason_required and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required for this move' using errcode = '23514';
  end if;

  select name into v_from_name from public.workflow_statuses where key = v_from;
  select name into v_to_name from public.workflow_statuses where key = p_to_status;

  update public.stage_history
     set exited_at = now(), exited_by = v_me
   where content_id = p_content_id and exited_at is null;
  insert into public.stage_history (content_id, status_key, entered_by) values (p_content_id, p_to_status, v_me);

  update public.content_records
     set status_key = p_to_status, updated_by = v_me
   where id = p_content_id
  returning * into v_rec;

  perform public.log_activity(p_content_id, 'status_change',
    format('%s moved %s %s → %s', public.actor_name(), v_rec.content_id, v_from_name, v_to_name),
    jsonb_build_object('status', v_from), jsonb_build_object('status', p_to_status),
    p_reason,
    jsonb_build_object('is_backward', v_tr.is_backward, 'transition_label', v_tr.label));

  v_recipients := case p_to_status
    when 'idea_concept'             then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('content.edit_concept')
    when 'script_copy'              then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('script.edit')
    when 'script_approval'          then public.final_approvers()
    when 'ready_for_production'     then coalesce(array[v_rec.production_manager_id], '{}') || public.profiles_with_permission('production.assign')
    when 'production'               then coalesce(array[v_rec.production_assignee_id], '{}')
    when 'production_review'        then coalesce(array[v_rec.production_manager_id], '{}') || public.profiles_with_permission('production.review')
    when 'dm_review'                then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('dm.review')
    when 'changes_required'         then coalesce(array[v_rec.production_assignee_id, v_rec.production_manager_id, v_rec.dm_owner_id], '{}')
    when 'content_review'           then public.team_member_ids('content_reviewer')
    when 'ready_for_final_approval' then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('dm.review')
    when 'final_approval'           then public.final_approvers()
    when 'final_approved'           then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('publish.schedule')
    when 'scheduled'                then public.profiles_with_permission('publish.publish')
    when 'published'                then coalesce(array[v_rec.dm_owner_id, v_rec.requester_id], '{}')
    else '{}'::uuid[] end;

  perform public.notify(v_recipients, p_content_id, 'stage_' || p_to_status,
    format('%s is now in %s', v_rec.content_id, v_to_name),
    case when v_tr.is_backward then 'Moved back. Reason: ' || p_reason else v_rec.title end);

  return v_rec;
end $$;

-- Internal helper used by the gate RPCs: perform the move with the flag set,
-- then clear it so nothing later in the same transaction inherits it.
create or replace function public.internal_move_stage(p_content_id uuid, p_to_status text, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_rec public.content_records;
begin
  perform set_config('app.internal_move', 'on', true);
  v_rec := public.move_stage(p_content_id, p_to_status, p_reason);
  perform set_config('app.internal_move', 'off', true);
  return v_rec;
end $$;
revoke execute on function public.internal_move_stage(uuid, text, text) from public, anon, authenticated;

-- Gate RPCs now route through internal_move_stage
create or replace function public.submit_script_for_approval(p_version_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_ver public.script_versions;
  v_rec public.content_records;
  v_eval public.ai_evaluations;
begin
  if not public.has_permission('script.submit') then
    raise exception 'script.submit permission required' using errcode = '42501';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.current_script_version_id <> p_version_id then
    raise exception 'only the current version can be submitted' using errcode = '22023';
  end if;
  if v_rec.status_key <> 'script_copy' then
    raise exception 'the record must be in Script / Copy to submit' using errcode = '22023';
  end if;
  if public.setting_bool('require_ai_before_submit', true) then
    v_eval := public.latest_script_evaluation(p_version_id);
    if v_eval.id is null then
      raise exception 'run the AI script check on this version before submitting' using errcode = '23514';
    end if;
  end if;

  update public.script_versions set approval_status = 'submitted' where id = p_version_id;
  perform public.log_activity(v_rec.id, 'script_submitted',
    format('%s submitted script V%s of %s for approval', public.actor_name(), v_ver.version_no, v_rec.content_id),
    null, jsonb_build_object('version_id', p_version_id));

  v_rec := public.internal_move_stage(v_rec.id, 'script_approval', null);
  perform public.notify(public.final_approvers(), v_rec.id, 'script_ready_for_review',
    format('%s script V%s is ready for review', v_rec.content_id, v_ver.version_no), v_rec.title);
  return v_rec;
end $$;

create or replace function public.approve_script(p_version_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_ver public.script_versions;
  v_rec public.content_records;
begin
  if not public.has_permission('script.approve') then
    raise exception 'script.approve permission required' using errcode = '42501';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.status_key <> 'script_approval' then
    raise exception 'the record is not awaiting script approval' using errcode = '22023';
  end if;
  if v_rec.current_script_version_id <> p_version_id then
    raise exception 'only the current version can be approved' using errcode = '22023';
  end if;

  update public.script_versions set approval_status = 'superseded'
   where content_id = v_rec.id and approval_status = 'approved' and id <> p_version_id;
  update public.script_versions set approval_status = 'approved', is_material_change = coalesce(is_material_change, false)
   where id = p_version_id;
  update public.content_records set approved_script_version_id = p_version_id, updated_by = v_me where id = v_rec.id;

  insert into public.script_approvals (content_id, script_version_id, approver_id, decision)
  values (v_rec.id, p_version_id, v_me, 'approved');

  perform public.log_activity(v_rec.id, 'script_approved',
    format('Script V%s approved by %s', v_ver.version_no, public.actor_name()),
    null, jsonb_build_object('version_id', p_version_id, 'version_no', v_ver.version_no));

  v_rec := public.internal_move_stage(v_rec.id, 'ready_for_production', null);
  return v_rec;
end $$;

create or replace function public.request_script_changes(p_version_id uuid, p_reason text)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_ver public.script_versions;
  v_rec public.content_records;
begin
  if not public.has_permission('script.approve') then
    raise exception 'script.approve permission required' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to request changes' using errcode = '23514';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.status_key <> 'script_approval' then
    raise exception 'the record is not awaiting script approval' using errcode = '22023';
  end if;

  update public.script_versions set approval_status = 'changes_requested' where id = p_version_id;
  insert into public.script_approvals (content_id, script_version_id, approver_id, decision, reason)
  values (v_rec.id, p_version_id, v_me, 'changes_requested', trim(p_reason));

  perform public.log_activity(v_rec.id, 'script_changes_requested',
    format('%s requested changes on script V%s', public.actor_name(), v_ver.version_no),
    null, jsonb_build_object('version_id', p_version_id), p_reason);

  v_rec := public.internal_move_stage(v_rec.id, 'script_copy', trim(p_reason));
  perform public.notify(coalesce(array[v_rec.dm_owner_id, v_ver.created_by], '{}'), v_rec.id, 'changes_requested',
    format('Changes requested on %s script V%s', v_rec.content_id, v_ver.version_no), trim(p_reason));
  return v_rec;
end $$;
