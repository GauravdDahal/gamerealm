-- Staff can pin messages in a chat (shown as a bar at the top of the admin thread).
alter table public.messages add column if not exists pinned_at timestamptz;

create or replace function public.staff_pin_message(p_message uuid, p_pin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('chat-view') then
    raise exception 'not allowed';
  end if;
  update public.messages
     set pinned_at = case when p_pin then now() else null end
   where id = p_message;
end;
$$;

revoke all on function public.staff_pin_message(uuid, boolean) from public, anon;
grant execute on function public.staff_pin_message(uuid, boolean) to authenticated;
