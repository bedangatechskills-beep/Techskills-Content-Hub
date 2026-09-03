-- finish_ai_request: cast the status expression to the enum type.
create or replace function public.finish_ai_request(p_request_id uuid, p_evaluation_id uuid default null, p_error text default null)
returns public.ai_evaluation_requests language plpgsql security definer set search_path = public as $$
declare v public.ai_evaluation_requests;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'service-only' using errcode = '42501'; end if;
  update public.ai_evaluation_requests
     set status = (case when p_error is null then 'done' else 'failed' end)::public.ai_request_status,
         evaluation_id = p_evaluation_id, error = p_error
   where id = p_request_id returning * into v;
  return v;
end $$;
