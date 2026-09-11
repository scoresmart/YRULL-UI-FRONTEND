-- migration_whatsapp_receive.sql
-- WhatsApp Cloud API - inbound (receiving) side.
-- SAFE TO RE-RUN. Purely additive: never drops or rewrites existing columns.
--
-- Run this in the Supabase SQL editor of the Yrull project BEFORE deploying
-- the webhook blueprint. Column names here are dictated by the frontend --
-- see src/lib/dataHooks.js and src/components/whatsapp/*.jsx.

-- ---------------------------------------------------------------------------
-- 1. whatsapp_contacts -- one row per WhatsApp user that has messaged us.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_contacts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  wa_id         text not null,
  created_at    timestamptz not null default now()
);

alter table public.whatsapp_contacts add column if not exists workspace_id  uuid;
alter table public.whatsapp_contacts add column if not exists wa_id         text;

alter table public.whatsapp_contacts add column if not exists name          text;
alter table public.whatsapp_contacts add column if not exists phone         text;
alter table public.whatsapp_contacts add column if not exists source        text;
alter table public.whatsapp_contacts add column if not exists campaign_name text;
alter table public.whatsapp_contacts add column if not exists ad_id         text;
alter table public.whatsapp_contacts add column if not exists ai_intent     text;
alter table public.whatsapp_contacts add column if not exists ai_confidence numeric;
alter table public.whatsapp_contacts add column if not exists first_seen    timestamptz default now();
alter table public.whatsapp_contacts add column if not exists last_seen     timestamptz default now();

-- Routing key for the webhook's contact upsert. Without this unique index the
-- PostgREST on_conflict=workspace_id,wa_id upsert cannot work.
create unique index if not exists idx_wa_contacts_workspace_waid
  on public.whatsapp_contacts (workspace_id, wa_id);

create index if not exists idx_wa_contacts_last_seen
  on public.whatsapp_contacts (workspace_id, last_seen desc);

-- ---------------------------------------------------------------------------
-- 2. whatsapp_messages -- inbound + outbound message log.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  wa_id         text not null,
  direction     text not null,
  created_at    timestamptz not null default now()
);

-- If the sending side already created these tables with a different shape,
-- `create table if not exists` above was a no-op -- so re-assert the routing
-- columns too. Added nullable so the statement cannot fail on existing rows.
alter table public.whatsapp_messages add column if not exists workspace_id    uuid;
alter table public.whatsapp_messages add column if not exists wa_id           text;
alter table public.whatsapp_messages add column if not exists direction       text;

alter table public.whatsapp_messages add column if not exists wa_message_id   text;
alter table public.whatsapp_messages add column if not exists message_type    text default 'text';
alter table public.whatsapp_messages add column if not exists body            text;
alter table public.whatsapp_messages add column if not exists media_url       text;
alter table public.whatsapp_messages add column if not exists media_mime_type text;
alter table public.whatsapp_messages add column if not exists status          text;
alter table public.whatsapp_messages add column if not exists error_detail    text;
alter table public.whatsapp_messages add column if not exists ai_intent       text;
alter table public.whatsapp_messages add column if not exists metadata        jsonb default '{}'::jsonb;

-- Idempotency. Meta re-delivers a webhook until it gets a 200, so the same
-- message id can arrive several times. This index is what makes the insert
-- on_conflict=workspace_id,wa_message_id safe to replay.
--
-- Deliberately NOT a partial index (`where wa_message_id is not null`):
-- PostgREST emits a bare ON CONFLICT (workspace_id, wa_message_id) with no
-- WHERE clause, which Postgres cannot match against a partial index -- the
-- upsert would fail with "no unique or exclusion constraint matching the
-- ON CONFLICT specification". A plain unique index is still safe for rows
-- with a null wa_message_id, because Postgres treats NULLs as distinct and
-- so allows any number of them.
create unique index if not exists idx_wa_messages_workspace_msgid
  on public.whatsapp_messages (workspace_id, wa_message_id);

-- Backs the frontend query: select * where wa_id = $1 order by created_at asc.
create index if not exists idx_wa_messages_thread
  on public.whatsapp_messages (workspace_id, wa_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. whatsapp_calls -- call events arrive on the SAME webhook endpoint.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_calls (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  call_id      text not null,
  wa_id        text,
  created_at   timestamptz not null default now()
);

alter table public.whatsapp_calls add column if not exists phone       text;
alter table public.whatsapp_calls add column if not exists direction   text;
alter table public.whatsapp_calls add column if not exists event       text;
alter table public.whatsapp_calls add column if not exists status      text;
alter table public.whatsapp_calls add column if not exists duration    integer;
alter table public.whatsapp_calls add column if not exists from_number text;
alter table public.whatsapp_calls add column if not exists to_number   text;
alter table public.whatsapp_calls add column if not exists "timestamp" timestamptz;

create unique index if not exists idx_wa_calls_workspace_callid
  on public.whatsapp_calls (workspace_id, call_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security -- the frontend reads these tables with the ANON key,
--    so every table needs a workspace-scoped SELECT policy. The webhook writes
--    with the SERVICE ROLE key, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_calls    enable row level security;

-- get_user_workspace_id() is defined in supabase/schema.sql. If your project
-- resolves the workspace differently, adjust these three policies only.
do $$ begin
  create policy "workspace members read wa contacts"
    on public.whatsapp_contacts for select
    using (workspace_id = public.get_user_workspace_id(auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace members read wa messages"
    on public.whatsapp_messages for select
    using (workspace_id = public.get_user_workspace_id(auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace members read wa calls"
    on public.whatsapp_calls for select
    using (workspace_id = public.get_user_workspace_id(auth.uid()));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 5. Realtime -- this is what actually makes a reply appear in the UI without
--    a refresh. src/hooks/useRealtime.js subscribes to INSERT on
--    whatsapp_messages + whatsapp_contacts, and IncomingCallNotification.jsx
--    subscribes to whatsapp_calls. Without this the UI only updates on the
--    30s polling fallback in dataHooks.js.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.whatsapp_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.whatsapp_contacts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.whatsapp_calls;
exception when duplicate_object then null; end $$;

-- Realtime filters on workspace_id, and RLS is enforced for realtime too --
-- REPLICA IDENTITY FULL makes the old record available on UPDATE/DELETE so
-- the filter can be evaluated. Cheap on these low-volume tables.
alter table public.whatsapp_messages replica identity full;
alter table public.whatsapp_contacts replica identity full;
alter table public.whatsapp_calls    replica identity full;

-- ---------------------------------------------------------------------------
-- 6. Media bucket. Meta's media URLs expire in ~5 minutes and require a
--    bearer token, so the webhook downloads each file and re-hosts it here.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true)
on conflict (id) do nothing;
