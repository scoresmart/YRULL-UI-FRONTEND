# Prompt for Backend Claude — Multi-Tenant WhatsApp Backend

Copy everything below the line into a fresh Claude session in the backend repo.


## Task

Build a **multi-tenant** Node.js/Express backend for the Yrull (Chat-UIUX) app so that every workspace can connect **its own** WhatsApp Business number via Meta's Embedded Signup / OAuth flow. Today the app either has no backend or a backend hardcoded to one phone number; the goal is that any user who signs up can click "Connect WhatsApp," authorize with their own Facebook Business, and manage messages for *their* number, fully isolated from other workspaces.

Frontend repo: `C:\Users\hp\Desktop\Chat-UIUX` (React + Vite + Supabase). You do **not** modify it. You build a backend that matches the contract it already calls.

## Stack


## Environment variables

```env
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://app.yrull.com            # used for CORS + OAuth redirect fallback

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=                           # used to verify incoming JWTs

# Meta / WhatsApp Cloud API
META_APP_ID=
META_APP_SECRET=
META_CONFIG_ID=                                # Embedded Signup config
META_REDIRECT_URI=https://api.yrull.com/oauth/whatsapp/callback
META_GRAPH_VERSION=v21.0
META_WEBHOOK_VERIFY_TOKEN=                     # random string you set in Meta dashboard
META_APP_SUBSCRIBE_SYSTEM_USER_TOKEN=          # optional — if using System User to subscribe apps

# Crypto
TOKEN_ENCRYPTION_KEY=                          # 32-byte hex (openssl rand -hex 32)
```

## Frontend contract (DO NOT deviate — the frontend code is already deployed)

All protected requests send:
```
Authorization: Bearer <supabase_jwt>
X-Workspace-Id: <uuid>
```

Every handler must:
1. Verify the JWT with Supabase, get `user.id`.
2. Read `X-Workspace-Id` header.
3. Verify the user belongs to that workspace (`profiles.workspace_id === header`). If not, 403.
4. Scope all DB reads/writes to that `workspace_id`.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/oauth/whatsapp/authorize?workspace_id=X&return_origin=Y` | Redirect to Meta OAuth. Store `workspace_id` + `return_origin` in `state` JWT (short TTL). |
| GET  | `/oauth/whatsapp/callback?code=...&state=...` | Exchange code → long-lived token → WABA ID → phone_number_id. Save. Redirect to `${return_origin}/whatsapp#status=whatsapp_connected` (or `#status=error&error=...`). |
| POST | `/oauth/whatsapp/disconnect` | Delete/soft-delete the row in `workspace_whatsapp_integrations`. Revoke permissions via Graph (`DELETE /{user-id}/permissions`) best-effort. |
| GET  | `/whatsapp/status` | Return `{ connected: boolean, display_phone_number, verified_name, phone_number_id, connected_at }`. `connected: false` with 200 if no row. |
| POST | `/whatsapp/send` | Body: `{ to, message }`. Send via Cloud API using **this workspace's** token + phone_number_id. Insert into `messages` with `direction='outbound'`. |
| POST | `/whatsapp/call-button` | Body: `{ to, message?, display_text? }`. Use Cloud API interactive message type `call_permission_request` (or your flow). |
| GET  | `/whatsapp/calls?limit=50&direction=inbound|outbound` | List rows from `whatsapp_calls` table scoped to workspace. |
| GET  | `/whatsapp/calls/pending` | List pending inbound calls. |
| POST | `/whatsapp/call/accept` | `{ call_id, sdp, sdp_type }` — forward to Cloud API. |
| POST | `/whatsapp/call/reject` | `{ call_id }` — forward to Cloud API. |
| POST | `/whatsapp/call/hangup` | `{ call_id }` — forward to Cloud API. |
| GET  | `/webhooks/whatsapp` | Meta verification: if `hub.mode=subscribe` and `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN`, return `hub.challenge` as text. |
| POST | `/webhooks/whatsapp` | Verify `X-Hub-Signature-256`. Fan out events to the correct workspace (see below). |

Also stub (return `[]` or `200`) so frontend doesn't 500:

These can be real later. For now they just need to not break the UI.

## Database — Supabase migrations to add

Run these **in addition** to the existing `supabase/schema.sql` in the frontend repo. Do not drop existing tables.

```sql
create table if not exists public.workspace_whatsapp_integrations (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  waba_id text not null,                      -- WhatsApp Business Account ID
  phone_number_id text not null unique,       -- used to route webhooks
  display_phone_number text,
  verified_name text,
  access_token_ciphertext text not null,      -- AES-256-GCM ciphertext
  access_token_iv text not null,              -- IV (hex)
  access_token_tag text not null,             -- auth tag (hex)
  meta_user_id text,                          -- for revoke on disconnect
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wwi_phone_number_id on public.workspace_whatsapp_integrations(phone_number_id);

alter table public.workspace_whatsapp_integrations enable row level security;

create policy "Workspace members can read own WA integration"
  on public.workspace_whatsapp_integrations for select
  using (workspace_id = public.get_user_workspace_id(auth.uid()));

alter table public.contacts
  add column if not exists wa_id text,
  add column if not exists ai_intent text,
  add column if not exists ai_confidence numeric;

create unique index if not exists idx_contacts_workspace_waid
  on public.contacts(workspace_id, wa_id) where wa_id is not null;

create or replace view public.whatsapp_contacts as
  select id, workspace_id, wa_id, phone, first_name, last_name, email,
         status, notes, ai_intent, ai_confidence, created_at, last_active_at
    from public.contacts
   where wa_id is not null;

create or replace view public.whatsapp_messages as
  select m.id, m.conversation_id, c.workspace_id, c.contact_id,
         m.direction, m.content, m.message_type, m.media_url,
         m.is_read, m.sent_at
    from public.messages m
    join public.conversations c on c.id = m.conversation_id;

create table if not exists public.whatsapp_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  call_id text not null unique,               -- Meta's call id
  wa_id text not null,
  direction text not null,                    -- inbound/outbound
  status text not null,                       -- ringing/accepted/rejected/ended
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_calls enable row level security;
create policy "Workspace members can read own calls"
  on public.whatsapp_calls for select
  using (workspace_id = public.get_user_workspace_id(auth.uid()));
```

Enable Realtime on `messages` and `whatsapp_calls` in the Supabase dashboard — the frontend subscribes to them.

## Meta OAuth flow (exact steps)

1. **`/oauth/whatsapp/authorize`**: sign a short-lived state JWT containing `{ workspace_id, return_origin, user_id }`, redirect to:
   ```
   https://www.facebook.com/<META_GRAPH_VERSION>/dialog/oauth
     ?client_id=<META_APP_ID>
     &config_id=<META_CONFIG_ID>
     &redirect_uri=<META_REDIRECT_URI>
     &state=<signed_state>
     &response_type=code
     &override_default_response_type=true
   ```

2. **`/oauth/whatsapp/callback`**: verify state JWT. Exchange code:
   ```
   GET https://graph.facebook.com/<v>/oauth/access_token
     ?client_id=<app_id>&client_secret=<secret>
     &redirect_uri=<redirect_uri>&code=<code>
   ```
   Then exchange short-lived → long-lived token (60 days) via `fb_exchange_token` grant.

3. **Discover WABA + phone number**:
   ```
   GET /<v>/debug_token?input_token=<token>            # get user_id, granted scopes
   GET /<v>/<user_id>/businesses                       # list businesses
   GET /<v>/<business_id>/owned_whatsapp_business_accounts
   GET /<v>/<waba_id>/phone_numbers                    # get phone_number_id, display_phone_number, verified_name
   ```
   If the user has multiple numbers, pick the first for v1 (add selection UI later).

4. **Subscribe app to WABA** (required to receive webhooks):
   ```
   POST /<v>/<waba_id>/subscribed_apps
     Authorization: Bearer <user_token_or_system_user_token>
   ```

5. **Register phone number** (required before first send):
   ```
   POST /<v>/<phone_number_id>/register
     { messaging_product: "whatsapp", pin: "<6-digit>" }
   ```

6. **Encrypt & persist**: AES-256-GCM encrypt the long-lived token with `TOKEN_ENCRYPTION_KEY`. Upsert into `workspace_whatsapp_integrations`.

7. **Redirect** to `${return_origin}/whatsapp#status=whatsapp_connected`. On any failure, redirect to `${return_origin}/whatsapp#status=error&error=<url_encoded_message>`.

## Sending a message (`POST /whatsapp/send`)

```js
// 1. Auth middleware already set req.workspaceId
const row = await getIntegration(req.workspaceId);  // decrypt token
if (!row) return res.status(409).json({ error: 'WhatsApp not connected for this workspace' });

const resp = await axios.post(
  `https://graph.facebook.com/${META_GRAPH_VERSION}/${row.phone_number_id}/messages`,
  { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } },
  { headers: { Authorization: `Bearer ${decryptedToken}` } }
);

// 2. Upsert contact + conversation by (workspace_id, wa_id=to), then insert outbound message.
// Frontend receives the INSERT via Supabase Realtime on messages.
```

## Webhook routing (the multi-tenant critical path)

`POST /webhooks/whatsapp` payload looks like:
```json
{ "object": "whatsapp_business_account",
  "entry": [{ "id": "<WABA_ID>", "changes": [{ "value": {
    "messaging_product": "whatsapp",
    "metadata": { "phone_number_id": "<PNID>", "display_phone_number": "..." },
    "messages": [{ "from": "<wa_id>", "text": { "body": "..." }, "id": "...", "timestamp": "..." }]
  }}]}]}
```

**Routing rule**: use `metadata.phone_number_id` to look up the workspace:
```sql
select workspace_id from workspace_whatsapp_integrations where phone_number_id = $1
```
If no row → log + 200 (Meta retries forever on non-200). Never 500 from this endpoint; log the error and return 200.

For each message:
1. Upsert contact by `(workspace_id, wa_id=from)`.
2. Upsert conversation by `(workspace_id, contact_id)`.
3. Insert into `messages` with `direction='inbound'`, `content=text.body`, `sent_at=to_timestamp(timestamp)`.
4. Supabase Realtime pushes it to the frontend automatically.

Handle `statuses[]` (delivery/read receipts) by updating the matching outbound message's `is_read` / status fields.

**Signature verification**: compute `HMAC-SHA256(body, META_APP_SECRET)`, compare to `X-Hub-Signature-256` header in constant time. 401 if mismatch.

## Security requirements (non-negotiable)


## Project layout

```
src/
  server.js                 # express app + CORS + body parsers (raw body for /webhooks/whatsapp)
  middleware/
    auth.js                 # verifyJWT + loadWorkspace
    errors.js
  lib/
    supabase.js             # service-role client
    meta.js                 # Graph API helpers: exchangeCode, discoverWaba, subscribeApp, registerNumber, sendText
    crypto.js               # encrypt/decrypt
  routes/
    oauth.whatsapp.js       # authorize, callback, disconnect
    whatsapp.js             # status, send, call-button, calls, call/*
    webhooks.whatsapp.js    # GET verify + POST events
    stubs.js                # the stub endpoints listed above
  db/
    integrations.js         # get/upsert/delete workspace_whatsapp_integrations
    conversations.js        # upsert contact/conversation, insert message
migrations/
  001_whatsapp_multitenant.sql
.env.example
README.md
```

## Acceptance criteria

A brand-new user must be able to:
1. Sign up on the frontend, land on `/onboarding`, finish, land on `/dashboard`.
2. Navigate to `/whatsapp`, see the "Connect WhatsApp" card.
3. Click it → redirect to Facebook → authorize *their own* business → return to `/whatsapp` with a green "Connected" banner showing *their* display phone number and verified name.
4. Send a message to a real phone number — it arrives on the real WhatsApp.
5. Reply from that phone — the message appears in the UI within 2 seconds (via Supabase Realtime).
6. A second, unrelated user signing up in a different workspace repeats the flow and sees only *their* messages. Workspace A can never see Workspace B's data.
7. Clicking Disconnect removes the integration; the status endpoint returns `{ connected: false }`; incoming webhooks for that `phone_number_id` are ignored (or re-route if the number is reconnected to another workspace).

## Out of scope (explicitly skip)


## Deliverables

1. The Express project with all files above.
2. The SQL migration file.
3. A `README.md` with: env var setup, how to run locally, how to expose webhooks with ngrok for dev, how to register the webhook URL in the Meta dashboard.
4. `curl` examples for every endpoint.

Start by scaffolding the project and the migration, then build in this order: auth middleware → `/whatsapp/status` → OAuth authorize/callback → webhook receiver → `/whatsapp/send` → calls → stubs. Test each step before moving on.
