-- The production assignee who resolved the change requests may send the record
-- back to Production themselves (route_changes_required checks ownership; the
-- transition row must exist for move_stage to accept it).
insert into public.allowed_transitions (from_status, to_status, permission_key, reason_required, is_backward, label, rpc_only)
values ('changes_required', 'production', 'production.update_own', false, false, 'Rework in production', true)
on conflict (from_status, to_status, permission_key) do update set rpc_only = true;
