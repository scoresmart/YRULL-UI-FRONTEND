-- Run in Supabase → SQL Editor (safe to run more than once)
-- Fixes: "No profile row for this user" when auth.users exists but public.profiles does not.

-- 1) Function: create a profile row on every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Trigger on new signups (PG14+ uses EXECUTE FUNCTION)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3) Backfill: anyone in auth.users without a profiles row gets one now
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1), 'User'),
  coalesce(u.raw_user_meta_data->>'role', 'user')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
