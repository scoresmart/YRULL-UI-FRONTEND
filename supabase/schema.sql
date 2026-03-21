-- FlowDesk Supabase Schema
-- Enable required extensions
create extension if not exists "pgcrypto";

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user', -- 'user' or 'admin'
  avatar_url text,
  workspace_id uuid references public.workspaces (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  phone text not null,
  first_name text,
  last_name text,
  email text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Contact Tags (join)
create table if not exists public.contact_tags (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

-- Audiences
create table if not exists public.audiences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  type text not null, -- 'dynamic' or 'static'
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  status text not null default 'open', -- open/pending/resolved
  priority text not null default 'medium',
  unread_count integer not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction text not null, -- 'inbound' or 'outbound'
  content text,
  message_type text not null default 'text', -- text/image/file/audio
  media_url text,
  is_read boolean not null default false,
  sent_at timestamptz not null default now()
);

-- Automations
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  trigger_type text not null,
  is_active boolean not null default true,
  messages_sent integer not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

-- Rules
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  condition jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  triggered_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Activity Logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security on all tables
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.tags enable row level security;
alter table public.contact_tags enable row level security;
alter table public.audiences enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.automations enable row level security;
alter table public.rules enable row level security;
alter table public.activity_logs enable row level security;

-- RLS Policies: Users can only access data from their own workspace
-- Drop existing policies if they exist, then recreate them

-- Helper function to get user's workspace_id (bypasses RLS to avoid recursion)
create or replace function public.get_user_workspace_id(user_uuid uuid)
returns uuid as $$
  select workspace_id from public.profiles where id = user_uuid;
$$ language sql security definer stable;

-- Grant execute permission on the function to authenticated users
grant execute on function public.get_user_workspace_id(uuid) to authenticated;

-- Profiles: Users can read their own profile
-- Keep it simple - just allow users to read their own profile to avoid recursion
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view workspace profiles" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Workspaces: Users can access their own workspace
drop policy if exists "Users can access own workspace" on public.workspaces;
create policy "Users can access own workspace" on public.workspaces
  for all using (
    id = public.get_user_workspace_id(auth.uid())
  );

-- Contacts: Users can access contacts in their workspace
drop policy if exists "Users can access workspace contacts" on public.contacts;
create policy "Users can access workspace contacts" on public.contacts
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Tags: Users can access tags in their workspace
drop policy if exists "Users can access workspace tags" on public.tags;
create policy "Users can access workspace tags" on public.tags
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Contact Tags: Users can access contact tags in their workspace
drop policy if exists "Users can access workspace contact tags" on public.contact_tags;
create policy "Users can access workspace contact tags" on public.contact_tags
  for all using (
    contact_id in (
      select id from public.contacts
      where workspace_id = public.get_user_workspace_id(auth.uid())
    )
  );

-- Audiences: Users can access audiences in their workspace
drop policy if exists "Users can access workspace audiences" on public.audiences;
create policy "Users can access workspace audiences" on public.audiences
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Conversations: Users can access conversations in their workspace
drop policy if exists "Users can access workspace conversations" on public.conversations;
create policy "Users can access workspace conversations" on public.conversations
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Messages: Users can access messages in their workspace conversations
drop policy if exists "Users can access workspace messages" on public.messages;
create policy "Users can access workspace messages" on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations
      where workspace_id = public.get_user_workspace_id(auth.uid())
    )
  );

-- Automations: Users can access automations in their workspace
drop policy if exists "Users can access workspace automations" on public.automations;
create policy "Users can access workspace automations" on public.automations
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Rules: Users can access rules in their workspace
drop policy if exists "Users can access workspace rules" on public.rules;
create policy "Users can access workspace rules" on public.rules
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Activity Logs: Users can access activity logs in their workspace
drop policy if exists "Users can access workspace activity logs" on public.activity_logs;
create policy "Users can access workspace activity logs" on public.activity_logs
  for all using (
    workspace_id = public.get_user_workspace_id(auth.uid())
  );

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
