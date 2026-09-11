# WhatsApp receiving side — drop-in webhook for the Flask backend

Sending already works. This adds the other half: Meta pushes inbound messages to
your server, your server writes them to Supabase, and Supabase Realtime pushes
them into the UI. **No frontend changes are needed** — `src/hooks/useRealtime.js`
already subscribes to `whatsapp_messages` and `whatsapp_contacts`.

```
WhatsApp user ──▶ Meta Cloud API ──▶ POST /webhooks/whatsapp   (this code)
                                          │
                                          ├─▶ upsert whatsapp_contacts
                                          ├─▶ insert whatsapp_messages ──┐
                                          └─▶ upload media to Storage    │
                                                                         ▼
                              ChatWindow.jsx ◀── Supabase Realtime (INSERT)
```

## Files

| File | What it is |
|---|---|
| `webhooks_whatsapp.py` | Flask blueprint — `GET` verify + `POST` events (messages, receipts, calls) |
| `supabase_repo.py` | PostgREST/Storage writes (uses `requests`, no new deps) |
| `conversations_route.py` | `GET /whatsapp/conversations` — the sidebar's data source (skip if you already have it) |
| `calls_route.py` | Flask blueprint — every `/whatsapp/call*` route the dashboard calls |
| `whatsapp_graph.py` | The only code that talks to graph.facebook.com: call actions, call button, permission requests |
| `auth_workspace.py` | `@require_workspace` — verifies the Supabase JWT and derives the workspace |
| `migration_whatsapp_receive.sql` | Tables, indexes, RLS, Realtime, media bucket |
| `migration_whatsapp_calling.sql` | SDP columns, `handled_at`, direction backfill, call-permission table |
| `.env.example` | Every env var, with where to find each value |

---

## What I need from you

These are the only blockers. Everything else is written and ready.

**1. The `Automations` Flask repo.** It isn't on this machine — only the
frontend is. `WHATSAPP_FRONTEND_FIX_PROMPT.md` says it lives at
`C:\Users\hp\Desktop\Automations` (a different user profile). Either clone it
here and tell me the path, or copy the three files above into it yourself.
With the repo I can wire the blueprint in directly and check it against the
sending code instead of you doing the integration by hand.

**2. Your Supabase project.** My Supabase tools are connected to a different
account (I can only see *PREPSMART LANGUAGE CERT*, *Prepsmart PTE*,
*SCORE SMART LMS*). So I can't run the migration for you. Either run
`migration_whatsapp_receive.sql` in the SQL editor yourself and paste any
error, or connect the Yrull project to the Supabase integration.

**3. Two values I can't derive:**
- `WA_DEFAULT_WORKSPACE_ID` — run `select id, name from workspaces;`
- Whether your integrations table is really called `workspace_integrations`,
  and what its phone-number-id and token columns are named. Run:
  `select * from workspace_integrations limit 1;`
  If it's named something else, set `WA_INTEGRATIONS_TABLE` etc. in `.env`.

**4. Confirm the current shape of `whatsapp_messages`.** The sending side
already writes to it, so it exists. Run this and send me the output — it tells
me whether my migration's `alter ... add column if not exists` lines are enough
or whether a column collides:

```sql
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'whatsapp_messages'
 order by ordinal_position;
```

> **Note:** I could not syntax-check the Python — there's no Python interpreter
> installed on this machine. The code is written against Flask + `requests`
> only, but run this once before deploying:
>
> ```bash
> python -m py_compile webhooks_whatsapp.py supabase_repo.py \
>   conversations_route.py calls_route.py whatsapp_graph.py auth_workspace.py
> ```

---

## Setup, in order

### Step 1 — Run the migration

Supabase SQL editor → paste `migration_whatsapp_receive.sql` → Run.
It's additive and safe to re-run.

If it fails on `idx_wa_messages_workspace_msgid`, you have pre-existing
duplicate `wa_message_id` rows from the sending side. Find them:

```sql
select workspace_id, wa_message_id, count(*)
  from public.whatsapp_messages
 where wa_message_id is not null
 group by 1,2 having count(*) > 1;
```

…then delete the older copies and re-run.

### Step 2 — Register the blueprint

In the Flask app factory / `app.py`:

```python
from webhooks_whatsapp import whatsapp_webhook_bp
app.register_blueprint(whatsapp_webhook_bp)
```

If you don't already have `GET /whatsapp/conversations`, register that too —
without it the sidebar stays empty even though messages are landing in the DB:

```python
from conversations_route import conversations_bp
app.register_blueprint(conversations_bp)
```

Both `conversations_route.py` and `calls_route.py` import `require_workspace`
from `auth_workspace.py`. That decorator works as written — it verifies the
Supabase JWT against `/auth/v1/user` and derives the workspace from
`profiles.workspace_id`, treating `X-Workspace-Id` as a claim to check rather
than trust. If your send route already has its own equivalent, import that
instead and delete `auth_workspace.py`, so there's only one auth path in the app.

Two things to check in the surrounding app:

- **No CSRF on this route.** If you use `Flask-WTF`, exempt it:
  `csrf.exempt(whatsapp_webhook_bp)`. Meta does not send a CSRF token.
- **No `before_request` that requires auth/JWT.** Meta is unauthenticated;
  the signature check is the auth. If your app has a global auth hook, add
  `/webhooks/whatsapp` to its allowlist.

### Step 3 — Set env vars on Railway

Copy from `.env.example`. The four required ones are
`META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`.

`META_APP_SECRET` is the **App secret** (App settings → Basic), not the access
token. Getting these two confused is the single most common cause of "Meta says
verified but no messages ever arrive".

Deploy.

### Step 4 — Point Meta at it

Meta App Dashboard → **WhatsApp → Configuration → Webhook → Edit**:

| Field | Value |
|---|---|
| Callback URL | `https://scoresmart-automations-production.up.railway.app/webhooks/whatsapp` |
| Verify token | the exact `META_WEBHOOK_VERIFY_TOKEN` you set in step 3 |

Click **Verify and save**. Meta sends one `GET` immediately; if it fails, the
token doesn't match or the app isn't deployed yet.

Then **Manage** the webhook fields and subscribe to:

- `messages` — **required**; this is inbound messages *and* delivery receipts
- `message_template_status_update` — template approvals
- `calls` — only if you're using the calling feature

### Step 5 — Subscribe the app to your WABA

This is the step people miss. Verifying the URL is not enough — the app must
also be subscribed to the specific WhatsApp Business Account:

```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Confirm it took:

```bash
curl "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Step 6 — Test end to end

From your personal phone, message the business number. Within ~2 seconds the
message should appear in the app at `/whatsapp`.

---

## Testing without waiting on Meta

**Verification handshake** (should print `test123`):

```bash
curl "https://<your-backend>/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<YOUR_TOKEN>&hub.challenge=test123"
```

**A fake inbound message.** Signature verification will reject an unsigned
body, so sign it — replace `<APP_SECRET>` and run from bash:

```bash
BODY='{"object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"<YOUR_PNID>","display_phone_number":"+61..."},"contacts":[{"wa_id":"61426228261","profile":{"name":"Test User"}}],"messages":[{"from":"61426228261","id":"wamid.TEST123","timestamp":"1735000000","type":"text","text":{"body":"hello from curl"}}]},"field":"messages"}]}]}'

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "<APP_SECRET>" | sed 's/^.* //')

curl -X POST "https://<your-backend>/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  --data "$BODY"
```

Expect `{"status":"ok"}`, then a new row in `whatsapp_messages`. Run it twice —
the second one must **not** create a second row. That's the idempotency check.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "The URL couldn't be validated" | Backend not deployed, or verify token mismatch, or the route is behind an auth `before_request` |
| Verified, but no messages arrive | Step 5 skipped — app not subscribed to the WABA |
| `403 invalid signature` in logs | `META_APP_SECRET` is wrong (likely the access token pasted by mistake), or a proxy is mutating the body |
| Rows land in Supabase but UI doesn't update | Realtime not enabled — re-run section 5 of the migration; check the browser console for the channel subscription |
| UI updates only after ~30s | Same as above; you're seeing the polling fallback in `dataHooks.js:171` |
| Messages appear under the wrong/no workspace | `phone_number_id` isn't in `workspace_integrations` and `WA_DEFAULT_WORKSPACE_ID` is unset |
| Rows in `whatsapp_contacts` but sidebar empty | `GET /whatsapp/conversations` missing or not returning webhook-created contacts |
| Text arrives, images don't | `WHATSAPP_ACCESS_TOKEN` missing or expired — media download needs it, text doesn't |

---

## Design notes

**Always returns 200.** Meta retries non-200 responses with backoff for up to
~7 days and disables the subscription after sustained failures, so one
malformed message must never surface as a 500. The only non-200 is `403` on a
bad signature — that request isn't from Meta.

**Idempotent inserts.** Because Meta retries until it gets a 200, the same
message id arrives more than once. The insert uses
`Prefer: resolution=ignore-duplicates` on `(workspace_id, wa_message_id)`.
`ignore`, not `merge`, is deliberate: the frontend subscribes to `INSERT` only,
so an update would be an invisible no-op that also clobbers any AI enrichment
written since.

**Media is downloaded synchronously.** Meta's media URLs expire in ~5 minutes
and require a bearer token, so they can't be used as an `<img src>` — each file
is re-hosted in Supabase Storage. It's done before the insert rather than
patched in afterwards for the same INSERT-only reason: a later `UPDATE` would
not reach the UI until the 30s poll. A media failure never loses the message —
the row is still written, just without a preview.

**Contact names are only written when present.** A webhook that arrives without
a profile name won't blank out a name the user has edited in the app.

**Not included** (say the word and I'll add them): auto-reply / AI intent
tagging on inbound messages, `read` receipts sent back to Meta so the sender
sees blue ticks, and Embedded Signup writing `workspace_integrations` for true
multi-tenant routing. Right now routing falls back to a single
`WA_DEFAULT_WORKSPACE_ID`.

---

# Calling

The dashboard's calling UI is already written (`ChatWindow.jsx` header,
`IncomingCallNotification.jsx`, `CallLogs.jsx`, `src/lib/api.js`). `calls_route.py`
is the server half it has been calling all along.

## The shape of it

The browser owns the microphone and the `RTCPeerConnection`, so it owns the SDP.
The access token stays on the server. Every signalling step therefore relays
through these routes, and — this is the part that bites — **Meta never returns
the far end's SDP in an API response. It arrives on the webhook**, in a
different request, possibly in a different gunicorn worker.

```
INBOUND (they call us)
  webhook: calls[].event=connect, direction=USER_INITIATED, session.sdp=<offer>
        └─▶ parked on the whatsapp_calls row
              └─▶ GET /whatsapp/calls/pending  ──▶ browser builds an answer
                    └─▶ POST /whatsapp/call/accept {call_id, sdp}
                          └─▶ Meta: action=accept ──▶ audio flows

OUTBOUND (we call them)
  GET /whatsapp/call/permission-status  ──▶ refuse early if they never agreed
  browser builds an offer
    └─▶ POST /whatsapp/call/action {action:connect, to, sdp}
          └─▶ Meta returns calls[0].id  (the only place the call id exists)
                └─▶ they pick up: webhook connect, direction=BUSINESS_INITIATED,
                    session.sdp=<answer>
                      └─▶ parked on the same row
                            └─▶ GET /whatsapp/calls/answered?call_id=… (polled)
```

That is why the SDP lives on the `whatsapp_calls` row and not in a module-level
dict: with two workers, the webhook writes to worker A's dict and the browser's
poll is served by worker B, and the call silently never connects.

## Routes

| Route | Purpose |
|---|---|
| `POST /whatsapp/call-button` | Send the tappable "call us" message (`interactive.type = voice_call`) |
| `GET /whatsapp/calls` | Call history — a bare array, which is what `CallLogs.jsx` expects |
| `GET /whatsapp/calls/pending` | Inbound rings with a parked SDP offer, last 60s, not yet handled |
| `POST /whatsapp/call/accept` | Answer, relaying the browser's SDP answer |
| `POST /whatsapp/call/reject` | Decline a ringing call |
| `POST /whatsapp/call/hangup` | Terminate a live call |
| `POST /whatsapp/call/action` | Generic action; the dashboard uses it for `connect` |
| `GET /whatsapp/call/permission-status` | `{can_call, state}` — `never_asked` / `granted` / `granted_permanent` / `expired` / `declined` |
| `POST /whatsapp/call/permission` | Ask the contact to allow business-initiated calls |
| `GET /whatsapp/calls/answered` | The callee's SDP answer for an outbound call, once it lands |

## Setup

**1. Run `migration_whatsapp_calling.sql`** (after the receive migration). It
adds `sdp`, `sdp_type` and `handled_at` to `whatsapp_calls`, creates
`whatsapp_call_permissions`, and backfills `direction`.

That backfill matters. The earlier webhook normalised direction to
`inbound`/`outbound`, but the frontend filters on Meta's literal
`USER_INITIATED` / `BUSINESS_INITIATED` in six places — so every existing call
row is currently invisible in Call Logs. The webhook now stores Meta's value
verbatim and the migration rewrites the old rows.

**2. Register the blueprint:**

```python
from calls_route import calls_bp
app.register_blueprint(calls_bp)
```

**3. Add the env vars** from the `--- Calling ---` block of `.env.example`:
`WHATSAPP_PHONE_NUMBER_ID`, `SUPABASE_ANON_KEY`, and leave
`WA_CALLING_GRAPH_VERSION` at `v23.0`. The `/calls` edge does not exist before
v22.0, which is why it is *not* read from `META_GRAPH_VERSION` (pinned at
v21.0 for the webhook) — sharing that would 404 every call with nothing in the
error to say why.

**4. Enable Calling on the number**: Meta dashboard → WhatsApp → Calling →
turn on for the phone number, signalling mode **SDP**. Then subscribe the
webhook to the **`calls`** field (Configuration → Webhook fields), which is
separate from `messages` and off by default.

## Two Meta constraints worth knowing before you test

**You cannot call a contact who has not agreed to it.** A business-initiated
call needs a granted call permission — a temporary one lasts 7 days, and Meta
allows one permission request per contact per 24 hours (two per week), only
inside an open conversation window. `permission-status` is checked before
dialling so staff get "ask permission" instead of an unexplained refusal from
Meta.

**A decline is invisible in Meta's API.** `GET /call_permissions` reports
granted and expired, but a decline reads back as plain `no_permission` —
identical to never having asked. The reply webhook is therefore recorded in
`whatsapp_call_permissions` and merged with Meta's answer, so the UI can say
"they declined, ask again in 24h" rather than inviting staff to ask again
immediately.

## Testing

A fake inbound ring — same signing dance as the message test above:

```bash
BODY='{"object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"<YOUR_PNID>"},"calls":[{"id":"wacid.TEST123","from":"61426228261","to":"<YOUR_NUMBER>","event":"connect","direction":"USER_INITIATED","timestamp":"'$(date +%s)'","session":{"sdp_type":"offer","sdp":"v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n"}}]},"field":"calls"}]}]}'

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "<APP_SECRET>" | sed 's/^.* //')

curl -X POST "https://<your-backend>/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  --data "$BODY"
```

Then, with a real dashboard JWT:

```bash
curl "https://<your-backend>/whatsapp/calls/pending" \
  -H "Authorization: Bearer <SUPABASE_JWT>"
```

Expect the call in `pending[]` with its SDP. The ringing overlay should be up
in the dashboard too. It disappears after 60 seconds, or as soon as something
sets `handled_at` — so accept/reject it and confirm the next poll comes back
empty. (Accepting a fake call will fail at Meta, since `wacid.TEST123` is not a
real call; the row is still marked handled.)
