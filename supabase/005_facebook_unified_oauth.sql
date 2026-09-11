-- 005_facebook_unified_oauth.sql
-- Unified Facebook OAuth for Yrull login + Meta App Review (all 18 scopes).
-- SAFE TO RE-RUN.

do $$ begin
  alter table public.profiles add column facebook_id text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.profiles add column facebook_connected_at timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.profiles add column facebook_granted_scopes jsonb default '{}'::jsonb;
exception when duplicate_column then null; end $$;

create unique index if not exists idx_profiles_facebook_id_unique
  on public.profiles(facebook_id) where facebook_id is not null;

do $$ begin
  alter table public.oauth_states add column flow text default 'instagram';
exception when duplicate_column then null; end $$;

create index if not exists idx_oauth_states_expires_at on public.oauth_states(expires_at);
