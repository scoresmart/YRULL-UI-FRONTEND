# Chat-UIUX WhatsApp Frontend Fix — Hand-off Prompt

Paste this into Claude Code when you open a terminal in `C:\Users\hp\Desktop\Chat-UIUX\`.

---

## Context (read before editing)

You are working on **Chat-UIUX**, the React + Vite frontend deployed to **yrull.com** via Vercel. It talks to a Flask backend at `https://scoresmart-automations-production.up.railway.app` (repo: `C:\Users\hp\Desktop\Automations`).

The backend was just fixed in a separate session — workspace-scoping for WhatsApp calls, dropping the env-token fallback in the webhook, RLS enabled on `workspace_integrations` / `oauth_states` / `whatsapp_calls`. Commit: `fix: workspace-isolate whatsapp_calls + pending-call dict + drop env-token fallback in webhook` on the Automations repo.

The user is shifting WhatsApp usage from Meta Business Suite into yrull.com so they can run it themselves. Phase 1 = single workspace (theirs). Phase 2 = multi-tenant. The must-have features right now: **receive messages, send messages, send call button, accept inbound calls**.

`.env` (local) is already correct:
```
VITE_API_BASE_URL=https://scoresmart-automations-production.up.railway.app
VITE_META_APP_ID=1264588558984531
VITE_WA_CONFIG_ID=1011042742100317
VITE_FACEBOOK_APP_ID=1264588558984531
VITE_FACEBOOK_CONFIG_ID=1011042742100317
```

**Vercel production env vars must be updated to match.** Don't assume they're set — confirm with the user before testing production.

---

## Confirmed frontend bugs to fix

Numbered in priority order. Each one is concrete — file + line + what to change. Do them in order; don't reorder or skip.

### 1. `src/lib/env.js:13` — API_BASE_URL silent empty-string fallback

`API_BASE_URL: import.meta.env.VITE_API_BASE_URL || ''` silently lets the app run with no backend pointing. If the env var is missing in prod, every request goes to relative URLs on yrull.com → 404. Add a hard console warning when DEV mode and the var is missing, and ideally a render-time banner. At minimum:

```js
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
if (!apiBase && import.meta.env.PROD) {
  console.error('🚨 VITE_API_BASE_URL is not set — WhatsApp/call APIs will fail. Set it in Vercel.');
}
```

### 2. Silent error swallowing in `src/lib/api.js`

Multiple places use `.catch(() => ({}))` or `await response.json().catch(() => ({}))`, then throw a generic `Error(data.error || 'Request failed')`. This hides Meta API errors, missing-workspace 400s, and 5xx server messages from the user.

Fix pattern: when a request fails, log the HTTP status + the raw response body to console.error, and throw an Error whose message includes the backend's actual `error` field if present. Example:

```js
async function authFetch(path, opts = {}) {
  const res = await fetch(`${ENV.API_BASE_URL}${path}`, { ...opts, headers: buildHeaders(opts.headers) });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    console.error(`API ${opts.method || 'GET'} ${path} → ${res.status}`, body);
    const msg = (body && (body.error || body.message)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}
```

Apply the same pattern to every place that calls `fetch` directly inside `api.js`, `whatsappManagerApi.ts`, and `whatsappConnect.js`.

### 3. `src/components/whatsapp/ChatWindow.jsx` — message send error UX

Around line 304-309, the catch block restores the draft text but doesn't tell the user the send failed. Add a `toast.error(err.message)` (the codebase already imports a toast lib — match what `WhatsAppTemplates.jsx` uses).

Around line 267, the optimistic message is added to local state but never rolled back on send failure. On catch, remove the optimistic message from state so the user doesn't see a phantom message.

### 4. `src/components/whatsapp/ChatWindow.jsx:334-378` — overly aggressive dedup

The current dedup compares by message ID OR by content+timestamp+direction+wa_id. The fallback masks real distinct messages. Drop the content-based fallback — dedup only by `wa_message_id` (or message ID). If a message has no ID (rare for inbound; impossible for our outbound saves), let it through.

### 5. Incoming-call detection: switch from polling to Supabase realtime

`src/components/whatsapp/IncomingCallNotification.jsx` polls `/whatsapp/calls/pending` every 2s. Add a Supabase realtime subscription on `whatsapp_calls` (INSERTs where `workspace_id = current`) and treat any new row with `event === 'connect'` and `direction === 'USER_INITIATED'` as a ring. Keep the poll as a fallback at 10s instead of 2s.

The realtime channel pattern in `src/lib/realtime.js` already includes workspace scoping — reuse it (`channel('whatsapp_calls-workspace-' + workspaceId)`).

The `useRealtime.js` hook (`src/hooks/useRealtime.js`) is a model — it already subscribes to `whatsapp_messages` the right way.

### 6. Direct Supabase reads bypassing the backend

These pull rows directly via the anon key, which is a holdover that now relies on RLS being correct (RLS is now enabled, but the queries still don't filter `workspace_id` themselves). Move them to backend routes:

- `src/components/whatsapp/ConversationList.jsx:15-38` — `getUnreadCount`, `getLastMessage`: backend already has `GET /whatsapp/conversations` which returns this data. Use that instead of two-per-row Supabase reads.
- `src/lib/dataHooks.js:48-61` — `useContacts`: switch to `GET /whatsapp/conversations`.

If `GET /whatsapp/conversations` doesn't return `unread_count` and `last_message`, ask the user to add it server-side — don't fall back to direct Supabase reads.

### 7. `src/hooks/useWhatsAppIntegration.js:70` — silent OAuth parse error

The Base64 parse fails into `catch {}` with only a generic "Failed to parse" toast. Add `console.error('OAuth hash parse failed:', err, { hash: window.location.hash })` and include `err.message` in the toast.

### 8. Workspace-id race on first render

`useWhatsAppIntegration.js:14` reads `useAuthStore.getState().profile?.workspace_id`. If the auth store hydrates after the hook fires, the fetch goes out without `X-Workspace-Id` and the backend 400s. Add an effect that re-fetches once `workspace_id` becomes defined.

### 9. Missing `/api/whatsapp/calls/pending` alias usage

After the backend fix, both `/whatsapp/calls/pending` and `/api/whatsapp/calls/pending` work. Frontend in `src/lib/api.js:130` calls `/whatsapp/calls/pending` — fine, leave it. But ensure the request includes the `X-Workspace-Id` header (the backend now requires `@require_workspace` on this route). Grep `api.js` and any callers of `pendingCalls()` to confirm header is sent.

### 10. Template send — pass `language` correctly

In `src/pages/user/WhatsAppTemplateComposer.jsx`, when calling `POST /api/whatsapp/send-template`, ensure the payload includes `template_name`, `language`, and `components`. The backend now looks up the actual language from WABA, but accepts a hint — make sure you're sending the language from the selected template, not a hardcoded `en_US`.

---

## After the code changes

1. `npm install` (in case lockfile drifted).
2. `npm run dev` — open in browser, sign in with the user's account, navigate to the WhatsApp inbox.
3. Test end-to-end with the user:
   - **Receive**: have them send a WhatsApp message from their phone to the connected business number → should appear in inbox within 2s (realtime).
   - **Send**: type and send a reply from yrull → should arrive on their phone within 2s.
   - **Call button**: from a chat, click the call button → their phone should receive a WhatsApp call notification.
   - **Accept incoming**: have them initiate a WhatsApp call FROM their phone TO the business number → an incoming-call banner should appear in yrull → Accept → audio connects.
4. If any test fails: read the network tab for the failing request, read the backend Railway logs (the user has access), report the exact error and the most likely fix. Don't guess.
5. When all four work end-to-end, commit + push. Suggested commit message:
   ```
   fix: surface API errors + realtime calls + drop content-based message dedup

   - Hard-fail when VITE_API_BASE_URL is unset in prod
   - Bubble backend error messages to the user via toasts; log raw responses to console
   - Roll back optimistic chat messages on send failure
   - Dedup chat messages by wa_message_id only (drop content+timestamp fallback that hid real messages)
   - Subscribe to whatsapp_calls realtime for incoming-call ring instead of polling
   - Move ConversationList unread/last-message reads through GET /whatsapp/conversations
   - Re-fetch integration status when workspace_id finishes hydrating
   ```
6. Confirm with the user that Vercel env vars are updated to match the local `.env` (especially `VITE_API_BASE_URL`) — ask them to redeploy from Vercel.

---

## What NOT to do

- Don't refactor file structure or rename anything.
- Don't add new features. No "while we're here, let's also build…"
- Don't touch `src/pages/marketing/`, `src/pages/legal/`, or anything unrelated to WhatsApp.
- Don't change Supabase client config or auth flow.
- Don't deploy to Vercel yourself — that's a user action.
- Don't disable RLS on any table. Backend was just updated to enable it correctly.

---

## If you get stuck

Report back to the user with:
- What you tried (file:line + diff).
- The exact error (network 4xx body, console.error output, or Railway log line).
- One specific question.

Don't spin on the same bug for more than 15 minutes — surface it.
