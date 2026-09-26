-- Atomically reserve one PIN attempt before bcrypt runs, so parallel requests can't
-- exceed the limit: every call counts, the p_max-th call locks the student for p_lock,
-- and a correct PIN clears both via pin_attempt_success().
create function public.pin_attempt_begin(p_student_id bigint, p_max integer, p_lock interval)
returns table (allowed boolean, attempts_left integer, locked_until timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_locked timestamptz;
begin
  update public.students s
  set
    pin_failed_count = case when s.pin_failed_count + 1 >= p_max then 0 else s.pin_failed_count + 1 end,
    pin_locked_until = case when s.pin_failed_count + 1 >= p_max then now() + p_lock else null end
  where s.id = p_student_id
    and s.pin_hash is not null
    and (s.pin_locked_until is null or s.pin_locked_until <= now())
  returning s.pin_failed_count, s.pin_locked_until into v_count, v_locked;

  if found then
    return query select true, case when v_locked is null then p_max - v_count else 0 end, v_locked;
  else
    return query
      select false, 0, s.pin_locked_until from public.students s where s.id = p_student_id;
  end if;
end;
$$;

create function public.pin_attempt_success(p_student_id bigint)
returns void
language sql
set search_path = ''
as $$
  update public.students
  set pin_failed_count = 0, pin_locked_until = null
  where id = p_student_id;
$$;

revoke execute on function public.pin_attempt_begin(bigint, integer, interval) from public, anon, authenticated;
revoke execute on function public.pin_attempt_success(bigint) from public, anon, authenticated;
grant execute on function public.pin_attempt_begin(bigint, integer, interval) to service_role;
grant execute on function public.pin_attempt_success(bigint) to service_role;
