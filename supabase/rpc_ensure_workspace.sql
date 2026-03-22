-- Run in Supabase → SQL Editor (once). Creates a SECURITY DEFINER RPC so workspace bootstrap works
-- even when client-side RLS blocks INSERT into workspaces / UPDATE on profiles.
--
-- Requires: public.workspaces has columns: name (text), slug (text), owner_id (uuid → auth.users)
-- If your table differs, adjust the INSERT below to match your schema.

create or replace function public.ensure_workspace_for_current_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  new_id uuid;
  wname text;
  slug_part text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select workspace_id into existing from public.profiles where id = uid;
  if existing is not null then
    return existing;
  end if;

  select
    coalesce(
      nullif(trim(full_name), ''),
      split_part(coalesce(email, ''), '@', 1),
      'account'
    )
  into wname from public.profiles where id = uid;

  wname := coalesce(wname, 'account') || '''s workspace';
  slug_part := lower(regexp_replace(wname, '[^a-z0-9]+', '-', 'g'));
  slug_part := trim(both '-' from slug_part);
  if slug_part = '' then slug_part := 'workspace'; end if;
  slug_part := slug_part || '-' || floor(extract(epoch from now()) * 1000)::text;

  insert into public.workspaces (name, slug, owner_id)
  values (wname, slug_part, uid)
  returning id into new_id;

  update public.profiles
  set workspace_id = new_id
  where id = uid;

  return new_id;
end;
$$;

revoke all on function public.ensure_workspace_for_current_user() from public;
grant execute on function public.ensure_workspace_for_current_user() to authenticated;
