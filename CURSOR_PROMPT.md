# ScoreSmart WhatsApp Chat — Backend Integration Prompt

## IMPORTANT: Read This First

This frontend was scaffolded with a **generic schema** (tables: `contacts`, `conversations`, `messages`). The **actual backend** uses a **different schema** (tables: `whatsapp_contacts`, `whatsapp_messages`, NO conversations table). This prompt tells you exactly how to adapt the frontend code to work with the real backend.

**Do NOT create new Supabase tables. Do NOT change the backend. Adapt the frontend to match what already exists.**

**Do NOT add email sequences, call logs, CRM, or any features beyond WhatsApp chat.**

---

## Architecture

```
Frontend (React + Vite)
    │
    ├── READ from Supabase ──► whatsapp_contacts table (contact list)
    │                      ──► whatsapp_messages table (chat history)
    │   (+ real-time subscriptions for live updates)
    │
    └── WRITE via Railway ──► POST /whatsapp/send { to, message }
                              │
                              └──► Meta WhatsApp Cloud API → saves to Supabase
```

**Inbound message flow:**
1. Someone messages +61 485 838 059
2. Railway backend receives Meta webhook
3. Backend saves to `whatsapp_messages` + updates `whatsapp_contacts` in Supabase
4. Frontend picks up via Supabase real-time subscription

**Outbound message flow (from frontend):**
1. Staff types message, frontend calls `POST /whatsapp/send`
2. Backend sends via Meta API + saves to `whatsapp_messages` in Supabase
3. Frontend picks up via Supabase real-time subscription

---

## Schema Mapping — CRITICAL CHANGES NEEDED

### OLD (Generic scaffold — what the code currently uses):

| Table | Key Columns |
|---|---|
| `contacts` | id, phone, first_name, last_name, email, status, notes |
| `conversations` | id, contact_id, status, unread_count, last_message_at |
| `messages` | id, conversation_id, direction, content, message_type, is_read, sent_at |

### NEW (Actual backend — what the code MUST use):

| Table | Key Columns |
|---|---|
| `whatsapp_contacts` | id (uuid), **wa_id** (text, UNIQUE — this is the phone like `61426228261`), phone, **name** (single field, not first+last), source, campaign_name, first_seen, **last_seen** |
| `whatsapp_messages` | id (uuid), **wa_id** (text — links to contact), direction, **body** (not `content`), message_type, wa_message_id, ai_intent, ai_confidence, **created_at** (not `sent_at`) |

### There is NO `conversations` table. Remove it entirely.

Instead of `conversation_id`, messages are grouped by `wa_id`. Each unique `wa_id` in `whatsapp_contacts` IS a conversation.

---

## Column Mapping Reference

### whatsapp_contacts (replaces `contacts`)
| Old Column | New Column | Notes |
|---|---|---|
| `id` | `id` | Same (uuid) |
| `phone` | `wa_id` or `phone` | Both exist and contain `61XXXXXXXXX` |
| `first_name` + `last_name` | `name` | Single field. Display as-is. |
| `status` | *(does not exist)* | Remove status filtering |
| `email` | *(does not exist)* | Remove |
| `last_active_at` | `last_seen` | Timestamptz |
| `created_at` | `first_seen` | Timestamptz |

### whatsapp_messages (replaces `messages`)
| Old Column | New Column | Notes |
|---|---|---|
| `id` | `id` | Same (uuid) |
| `conversation_id` | `wa_id` | Group messages by wa_id instead |
| `content` | `body` | **Message text field is called `body`** |
| `direction` | `direction` | Same: `inbound` or `outbound` |
| `message_type` | `message_type` | Same: `text`, `image`, `button`, etc. |
| `is_read` | *(does not exist)* | Handle client-side with localStorage |
| `sent_at` | `created_at` | **Timestamp field is called `created_at`** |
| *(new)* | `ai_intent` | Claude AI classification |
| *(new)* | `ai_confidence` | AI classification confidence 0.0–1.0 |
| *(new)* | `wa_message_id` | Meta's message ID |

---

## Exact Code Changes Required

### 1. `src/lib/dataHooks.js` — Replace hooks

**Remove:** `useConversations()` hook entirely.

**Replace `useContacts()`:**
```javascript
export function useContacts() {
  return useQuery({
    queryKey: ['whatsapp_contacts'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockDb.contacts;
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .order('last_seen', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

**Replace `useMessages(conversationId)` → `useMessages(waId)`:**
```javascript
export function useMessages(waId) {
  return useQuery({
    queryKey: ['whatsapp_messages', waId],
    enabled: Boolean(waId),
    queryFn: async () => {
      if (!waId) return [];
      if (ENV.USE_MOCK) return mockDb.messages.filter((m) => m.wa_id === waId);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('wa_id', waId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
```

### 2. `src/lib/api.js` — Fix send endpoint

The backend API is at `/whatsapp/send` (NOT `/api/whatsapp/send`).
It accepts `{ to, message }` (NOT conversation_id/contact_id/phone).

```javascript
export const whatsappApi = {
  async sendMessage({ to, message }) {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send');
      return data;
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      throw error;
    }
  },
};
```

**Do NOT use axios or JWT Authorization headers.** The backend has no auth — just a simple POST with `Content-Type: application/json`. Use plain `fetch`.

### 3. `src/store/chatStore.js` — Change selected state

Instead of `selectedConversationId`, use `selectedWaId`:
```javascript
selectedWaId: null,
setSelectedWaId: (waId) => set({ selectedWaId: waId }),
```

### 4. `src/components/whatsapp/ConversationList.jsx` — Adapt to new schema

- Fetch from `useContacts()` (which now queries `whatsapp_contacts`)
- **Remove** `useConversations()` — there is no conversations table
- Each contact row = one conversation (identified by `wa_id`)
- Contact name: use `contact.name` (single field, not first_name + last_name)
- On click: `setSelectedWaId(contact.wa_id)`
- For last message preview: fetch latest message per contact from `whatsapp_messages`
- Sort by `last_seen` descending (most recent conversation first)

### 5. `src/components/whatsapp/ChatWindow.jsx` — Adapt to new schema

- Use `selectedWaId` from chatStore instead of `selectedConversationId`
- Call `useMessages(selectedWaId)` instead of `useMessages(selectedId)`
- Get contact: `contacts.find(c => c.wa_id === selectedWaId)`
- Display name: `contact.name` (not first_name + last_name)
- Message text: `msg.body` (not `msg.content`)
- Message time: `msg.created_at` (not `msg.sent_at`)
- Send: `whatsappApi.sendMessage({ to: contact.wa_id, message: text })`
- After send: invalidate `['whatsapp_messages', selectedWaId]` and `['whatsapp_contacts']`

### 6. `src/hooks/useRealtime.js` — Fix table name

Change from `messages` table to `whatsapp_messages`:
```javascript
const channel = supabase
  .channel('whatsapp-messages')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
    (payload) => onMessage?.(payload),
  )
  .subscribe();
```

Also add a subscription to `whatsapp_contacts` for contact list updates (new contacts, last_seen changes).

### 7. `src/lib/env.js` — No changes needed

Already reads `VITE_API_BASE_URL` which will be set to the Railway URL.

---

## Backend API Details

**Base URL:** `https://scoresmart-automations-production.up.railway.app`

CORS is enabled (all origins, GET/POST/OPTIONS).

### Send Message
```
POST /whatsapp/send
Content-Type: application/json

Body: { "to": "61426228261", "message": "Hello!" }

Success 200: { "status": "sent", "to": "61426228261", "result": {...} }
Error 400:   { "error": "Missing 'to' and/or 'message'" }
```

**The backend auto-normalizes AU phone numbers:**
- `0426228261` → `61426228261`
- `+61426228261` → `61426228261`
- `61426228261` → no change

### Get Conversations (optional, prefer Supabase direct)
```
GET /whatsapp/conversations?limit=20
Returns: Array of whatsapp_contacts rows
```

### Get Messages (optional, prefer Supabase direct)
```
GET /whatsapp/messages/{wa_id}?limit=50
Returns: Array of whatsapp_messages rows ordered by created_at ASC
```

---

## Phone Number Format

All `wa_id` values are in `61XXXXXXXXX` format (Australian, no `+`, no leading `0`).

**Display formatting:**
- `61426228261` → display as `+61 426 228 261` or `0426 228 261`
- For sending: pass the raw `wa_id` to `/whatsapp/send` as the `to` field

---

## Unread Count (Client-Side)

The backend has no `is_read` or `unread_count`. Implement client-side:

```javascript
// When user opens a conversation
localStorage.setItem(`lastRead_${wa_id}`, new Date().toISOString());

// To count unread for a contact
const lastRead = localStorage.getItem(`lastRead_${wa_id}`) || '1970-01-01';
const { count } = await supabase
  .from('whatsapp_messages')
  .select('*', { count: 'exact', head: true })
  .eq('wa_id', wa_id)
  .eq('direction', 'inbound')
  .gt('created_at', lastRead);
```

---

## AI Auto-Reply Badge

When `ai_intent` exists on a message and starts with `reply_to_`, it was an AI auto-reply. Optionally show a small "AI" or "🤖" badge on those outbound messages.

---

## Environment Variables (.env)

```
VITE_SUPABASE_URL=https://llafxbetyhxfzqcckkmy.supabase.co
VITE_SUPABASE_ANON_KEY=<already in your project>
VITE_API_BASE_URL=https://scoresmart-automations-production.up.railway.app
VITE_USE_MOCK=false
```

**Set `VITE_USE_MOCK=false` to use real Supabase data instead of mock data.**

---

## Supabase Realtime Setup

For real-time subscriptions to work, you MUST enable Realtime replication for both tables in Supabase Dashboard:
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for `whatsapp_contacts` 
3. Enable replication for `whatsapp_messages`

---

## Testing Checklist

1. [ ] Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL` in .env
2. [ ] Contacts list loads from `whatsapp_contacts` sorted by `last_seen` desc
3. [ ] Clicking a contact loads messages from `whatsapp_messages` where `wa_id` matches
4. [ ] Messages render correctly: `body` as text, `created_at` as time, inbound=left/outbound=right
5. [ ] Sending a message calls `POST /whatsapp/send` with `{ to: wa_id, message: text }`
6. [ ] After sending, the new outbound message appears (via realtime subscription or refetch)
7. [ ] When someone messages the WhatsApp number, inbound message appears in real-time
8. [ ] New contacts appear in sidebar when a new person messages
9. [ ] Contact name displays from `name` field (single field, not first+last)
10. [ ] No errors from missing `conversations` table or `content`/`sent_at` columns
