-- ============================================================
-- Social Manager — new tables
-- Run this in Supabase SQL editor (project llafxbetyhxfzqcckkmy)
-- Only adds new tables; does NOT touch any existing tables.
-- ============================================================

-- ── 1. Content ideas ────────────────────────────────────────
create table if not exists public.social_content_ideas (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces (id) on delete cascade,
  platform     text        not null check (platform in (
                             'tiktok','instagram','youtube','linkedin',
                             'reddit','quora','facebook','threads','whatsapp')),
  category     text        not null,
  hook         text        not null,
  script       text        not null,
  why_it_works text        not null,
  utm_link     text        not null,
  status       text        not null default 'pending'
                           check (status in ('pending','approved','declined')),
  regenerate_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists social_content_ideas_workspace_idx
  on public.social_content_ideas (workspace_id, status, platform);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_content_ideas_updated_at on public.social_content_ideas;
create trigger social_content_ideas_updated_at
  before update on public.social_content_ideas
  for each row execute function public.set_updated_at();

-- ── 2. Chat history ──────────────────────────────────────────
create table if not exists public.social_chat_messages (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces (id) on delete cascade,
  role         text        not null check (role in ('user','assistant')),
  content      text        not null,
  created_at   timestamptz not null default now()
);

create index if not exists social_chat_messages_workspace_idx
  on public.social_chat_messages (workspace_id, created_at desc);

-- ── 3. Row Level Security ───────────────────────────────────
alter table public.social_content_ideas  enable row level security;
alter table public.social_chat_messages  enable row level security;

drop policy if exists "Workspace members can access social ideas"  on public.social_content_ideas;
create policy "Workspace members can access social ideas"
  on public.social_content_ideas for all
  using (workspace_id = public.get_user_workspace_id(auth.uid()));

drop policy if exists "Workspace members can access social chat"   on public.social_chat_messages;
create policy "Workspace members can access social chat"
  on public.social_chat_messages for all
  using (workspace_id = public.get_user_workspace_id(auth.uid()));
