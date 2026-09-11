-- Run in Supabase → SQL Editor (replace entire function if you already created it).
-- SECURITY DEFINER bypasses RLS for workspace bootstrap.
--
-- Requires: public.workspaces (name, slug, owner_id) — align with your table.

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
  updated_count int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select workspace_id into existing from public.profiles where id = uid;
  if not found then
    raise exception 'No profile row for this user. Auth trigger handle_new_user may be missing.';
  end if;
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

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'Failed to set workspace_id on profile (updated % rows)', updated_count;
  end if;

  return new_id;
end;
$$;

revoke all on function public.ensure_workspace_for_current_user() from public;
grant execute on function public.ensure_workspace_for_current_user() to authenticated;
