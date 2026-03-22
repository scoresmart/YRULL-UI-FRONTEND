-- Run in Supabase → SQL Editor if "Connect Instagram" shows "No workspace on your profile yet"
-- and the browser console logs ensureDefaultWorkspaceForUser failures (RLS / permission denied).
--
-- Requires `workspaces` to have `owner_id uuid` and `slug text` (matches sign-up in src/store/authStore.js).
-- If your table differs, adjust policies to match your columns.

-- 1) Users must be able to update their own profile to set workspace_id
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) Users with no workspace must be able to INSERT a new workspace row they own.
--    (The generic "id = get_user_workspace_id()" policy blocks first insert when workspace_id is null.)
drop policy if exists "Users can insert own workspace" on public.workspaces;
create policy "Users can insert own workspace" on public.workspaces
  for insert
  to authenticated
  with check (owner_id = auth.uid());
