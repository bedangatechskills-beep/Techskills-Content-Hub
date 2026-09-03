-- ============================================================================
-- 0008_ai_queue.sql — "queue" AI provider. With AI_PROVIDER=queue the Edge
-- Functions do everything except call a model: they assemble the prompt input
-- and park it here. An external worker (today: the Claude Code session that
-- builds this app; later: any reviewer or service) evaluates and stores the
-- result through the existing service-only record_* RPCs.
-- ============================================================================

create type public.ai_request_status as enum ('pending','processing','done','failed');

create table public.ai_evaluation_requests (
  id                  uuid primary key default gen_random_uuid(),
  kind                public.ai_evaluation_type not null,
  content_id          uuid not null references public.content_records(id),
  script_version_id   uuid references public.script_versions(id),
  creative_version_id uuid references public.creative_versions(id),
  input               jsonb not null,
  image_path          text,
  requested_by        uuid references public.profiles(id),
  status              public.ai_request_status not null default 'pending',
  error               text,
  evaluation_id       uuid references public.ai_evaluations(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index ai_requests_status_idx on public.ai_evaluation_requests(status, created_at);
create index ai_requests_version_idx on public.ai_evaluation_requests(script_version_id, creative_version_id);
create trigger ai_requests_set_updated_at before update on public.ai_evaluation_requests
  for each row execute function public.set_updated_at();

alter table public.ai_evaluation_requests enable row level security;
create policy ai_requests_select on public.ai_evaluation_requests for select to authenticated using (public.is_active_user());
grant select on public.ai_evaluation_requests to authenticated;

update public.app_settings set value = '"queue"' where key = 'ai_provider_label';

-- Pending request for a version (for the UI "queued" state)
create or replace function public.pending_ai_request(p_script_version_id uuid default null, p_creative_version_id uuid default null)
returns public.ai_evaluation_requests language sql stable security definer set search_path = public as $$
  select * from public.ai_evaluation_requests
  where status in ('pending','processing')
    and (p_script_version_id is not null and script_version_id = p_script_version_id
         or p_creative_version_id is not null and creative_version_id = p_creative_version_id)
  order by created_at desc limit 1;
$$;
grant execute on function public.pending_ai_request(uuid, uuid) to authenticated;

-- Worker helpers (service role only)
create or replace function public.claim_ai_request(p_request_id uuid)
returns public.ai_evaluation_requests language plpgsql security definer set search_path = public as $$
declare v public.ai_evaluation_requests;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'service-only' using errcode = '42501'; end if;
  update public.ai_evaluation_requests set status = 'processing' where id = p_request_id and status = 'pending' returning * into v;
  return v;
end $$;

create or replace function public.finish_ai_request(p_request_id uuid, p_evaluation_id uuid default null, p_error text default null)
returns public.ai_evaluation_requests language plpgsql security definer set search_path = public as $$
declare v public.ai_evaluation_requests;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'service-only' using errcode = '42501'; end if;
  update public.ai_evaluation_requests
     set status = case when p_error is null then 'done' else 'failed' end, evaluation_id = p_evaluation_id, error = p_error
   where id = p_request_id returning * into v;
  return v;
end $$;
revoke execute on function public.claim_ai_request(uuid), public.finish_ai_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid), public.finish_ai_request(uuid, uuid, text) to service_role;
