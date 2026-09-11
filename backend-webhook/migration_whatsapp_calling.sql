-- migration_whatsapp_calling.sql
-- WhatsApp Calling API - signalling storage and call permissions.
-- SAFE TO RE-RUN. Purely additive: never drops or rewrites existing columns.
--
-- Run AFTER migration_whatsapp_receive.sql, in the Supabase SQL editor, before
-- deploying calls_route.py. Column names are dictated by the frontend -- see
-- src/lib/api.js, src/pages/user/CallLogs.jsx and
-- src/components/whatsapp/IncomingCallNotification.jsx.

-- ---------------------------------------------------------------------------
-- 1. whatsapp_calls -- park the SDP so signalling survives a second worker.
--
-- The browser owns the RTCPeerConnection but Meta hands the far end's session
-- description to the *webhook*, in a different request and possibly a
-- different gunicorn process. An in-process dict therefore loses calls
-- whenever the poll for /whatsapp/calls/pending is served by the other worker.
-- These three columns are the hand-off point instead.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_calls add column if not exists sdp        text;
alter table public.whatsapp_calls add column if not exists sdp_type   text;

-- Set the moment a ring is accepted, rejected, hung up or terminated. This is
-- what takes a call out of /whatsapp/calls/pending -- `status` cannot, because
-- it carries Meta's vocabulary and keeps changing as the call progresses.
alter table public.whatsapp_calls add column if not exists handled_at timestamptz;

-- Serves the pending-calls poll: unhandled inbound rings in the last minute.
create index if not exists idx_wa_calls_pending
  on public.whatsapp_calls (workspace_id, handled_at, "timestamp" desc);

-- Serves /whatsapp/calls/answered, which looks a call up by its Meta id.
create index if not exists idx_wa_calls_callid
  on public.whatsapp_calls (workspace_id, call_id);

-- ---------------------------------------------------------------------------
-- 2. Direction backfill.
--
-- The frontend filters on Meta's literal USER_INITIATED / BUSINESS_INITIATED
-- everywhere (CallLogs.jsx:39, IncomingCallNotification.jsx:154). Rows written
-- by the earlier webhook were normalised to inbound/outbound and are invisible
-- to those filters, so bring them into line. New rows already store Meta's
-- value verbatim.
-- ---------------------------------------------------------------------------
update public.whatsapp_calls set direction = 'USER_INITIATED'     where direction = 'inbound';
update public.whatsapp_calls set direction = 'BUSINESS_INITIATED' where direction = 'outbound';

-- Old calls must not resurface as "ringing" the first time the poll runs.
update public.whatsapp_calls
   set handled_at = coalesce("timestamp", created_at, now())
 where handled_at is null
   and coalesce("timestamp", created_at) < now() - interval '5 minutes';

-- ---------------------------------------------------------------------------
-- 3. whatsapp_call_permissions -- one row per contact, their last answer.
--
-- Meta's GET /call_permissions reports granted and expired, but a decline
-- reads back as plain "no permission", identical to never having been asked.
-- The dialler shows very different text for those two ("they said no, ask
-- again in 24h" vs "ask permission"), so the reply webhook is recorded here
-- and merged with Meta's answer in calls_route._permission_state().
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_call_permissions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  wa_id           text not null,
  response        text,          -- accept | reject
  is_permanent    boolean not null default false,
  expires_at      timestamptz,   -- temporary grants run 7 days
  response_source text,          -- user_action | automatic
  responded_at    timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.whatsapp_call_permissions add column if not exists response        text;
alter table public.whatsapp_call_permissions add column if not exists is_permanent    boolean default false;
alter table public.whatsapp_call_permissions add column if not exists expires_at      timestamptz;
alter table public.whatsapp_call_permissions add column if not exists response_source text;
alter table public.whatsapp_call_permissions add column if not exists responded_at    timestamptz;

-- Routing key for the webhook's upsert. Without it the PostgREST
-- on_conflict=workspace_id,wa_id write cannot work.
create unique index if not exists idx_wa_call_perms_workspace_waid
  on public.whatsapp_call_permissions (workspace_id, wa_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security. The backend writes with the SERVICE ROLE key and
--    bypasses RLS; this policy is only so the dashboard could read the table
--    directly with the ANON key.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_call_permissions enable row level security;

do $$ begin
  create policy "workspace members read wa call permissions"
    on public.whatsapp_call_permissions for select
    using (workspace_id = public.get_user_workspace_id(auth.uid()));
exception when duplicate_object then null; end $$;
