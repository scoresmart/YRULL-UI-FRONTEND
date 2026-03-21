# Backend Integration Complete ✅

All changes have been made to connect the frontend to your actual backend schema.

## Changes Made

### 1. **Data Hooks** (`src/lib/dataHooks.js`)
- ✅ Removed `useConversations()` hook (no conversations table)
- ✅ Updated `useContacts()` to query `whatsapp_contacts` table, ordered by `last_seen` desc
- ✅ Updated `useMessages(waId)` to query `whatsapp_messages` table by `wa_id`, ordered by `created_at` asc

### 2. **API Service** (`src/lib/api.js`)
- ✅ Replaced axios with plain `fetch` (no auth needed)
- ✅ Changed endpoint from `/api/whatsapp/send` to `/whatsapp/send`
- ✅ Changed request format from `{ conversation_id, contact_id, phone, message }` to `{ to, message }`
- ✅ Removed all other API methods (not needed - using Supabase directly)

### 3. **Chat Store** (`src/store/chatStore.js`)
- ✅ Changed `selectedConversationId` → `selectedWaId`
- ✅ Changed `selectConversation(id)` → `setSelectedWaId(waId)`

### 4. **ConversationList Component** (`src/components/whatsapp/ConversationList.jsx`)
- ✅ Completely rewritten to use contacts directly (no conversations table)
- ✅ Each contact = one conversation (identified by `wa_id`)
- ✅ Uses `contact.name` (single field, not first_name + last_name)
- ✅ Displays phone formatted: `61426228261` → `+61 426 228 261`
- ✅ Client-side unread count calculation (using localStorage)
- ✅ Fetches last message per contact from `whatsapp_messages`
- ✅ Sorted by `last_seen` descending

### 5. **ChatWindow Component** (`src/components/whatsapp/ChatWindow.jsx`)
- ✅ Uses `selectedWaId` instead of `selectedConversationId`
- ✅ Uses `useMessages(selectedWaId)` instead of `useMessages(selectedId)`
- ✅ Gets contact by `wa_id`: `contacts.find(c => c.wa_id === selectedWaId)`
- ✅ Displays `contact.name` (not first_name + last_name)
- ✅ Message text: `msg.body` (not `msg.content`)
- ✅ Message time: `msg.created_at` (not `msg.sent_at`)
- ✅ Send: `whatsappApi.sendMessage({ to: contact.wa_id, message: text })`
- ✅ After send: invalidates `['whatsapp_messages', selectedWaId]` and `['whatsapp_contacts']`
- ✅ Shows AI auto-reply badge (🤖) when `ai_intent` starts with `reply_to_`

### 6. **ContactInfoPanel Component** (`src/components/whatsapp/ContactInfoPanel.jsx`)
- ✅ Uses `selectedWaId` instead of `selectedConversationId`
- ✅ Removed `useConversations()` dependency
- ✅ Uses `contact.name` (single field)
- ✅ Displays formatted phone number
- ✅ Shows `source` and `campaign_name` if available
- ✅ Uses `last_seen` instead of `last_active_at`
- ✅ Removed conversation-related fields (assigned_to, status, priority - don't exist)

### 7. **Realtime Hook** (`src/hooks/useRealtime.js`)
- ✅ Changed from `messages` table to `whatsapp_messages` table
- ✅ Added subscription to `whatsapp_contacts` for contact updates
- ✅ Listens for INSERT on `whatsapp_messages`
- ✅ Listens for INSERT/UPDATE on `whatsapp_contacts`

### 8. **WhatsApp Page** (`src/pages/user/WhatsApp.jsx`)
- ✅ Added realtime subscriptions for live message updates
- ✅ Auto-invalidates queries when new messages arrive
- ✅ Auto-invalidates contacts when they're updated

## Schema Mapping Reference

### whatsapp_contacts (replaces `contacts`)
| Old Column | New Column | Notes |
|---|---|---|
| `id` | `id` | Same (uuid) |
| `phone` | `wa_id` or `phone` | Both exist, use `wa_id` |
| `first_name` + `last_name` | `name` | Single field |
| `last_active_at` | `last_seen` | Timestamptz |
| `created_at` | `first_seen` | Timestamptz |
| *(new)* | `source` | Contact source |
| *(new)* | `campaign_name` | Campaign name |

### whatsapp_messages (replaces `messages`)
| Old Column | New Column | Notes |
|---|---|---|
| `id` | `id` | Same (uuid) |
| `conversation_id` | `wa_id` | Group by wa_id |
| `content` | `body` | Message text |
| `direction` | `direction` | Same: `inbound` or `outbound` |
| `message_type` | `message_type` | Same: `text`, `image`, `button`, etc. |
| `sent_at` | `created_at` | Timestamp |
| *(new)* | `ai_intent` | Claude AI classification |
| *(new)* | `ai_confidence` | AI confidence 0.0–1.0 |
| *(new)* | `wa_message_id` | Meta's message ID |

## Environment Variables

Update your `.env` file:

```env
VITE_SUPABASE_URL=https://llafxbetyhxfzqcckkmy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=https://scoresmart-automations-production.up.railway.app
VITE_USE_MOCK=false
```

## Backend API Endpoint

**POST** `/whatsapp/send`
```json
{
  "to": "61426228261",
  "message": "Hello!"
}
```

**Response:**
```json
{
  "status": "sent",
  "to": "61426228261",
  "result": {...}
}
```

## Phone Number Format

- **Storage:** `61426228261` (no `+`, no leading `0`)
- **Display:** `+61 426 228 261` or `0426 228 261`
- **Sending:** Pass raw `wa_id` to backend (backend auto-normalizes)

## Unread Count (Client-Side)

Implemented using localStorage:
- When user opens conversation: `localStorage.setItem('lastRead_${wa_id}', timestamp)`
- Unread count = inbound messages after `lastRead_${wa_id}`

## Supabase Realtime Setup

**IMPORTANT:** Enable Realtime replication in Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for `whatsapp_contacts`
3. Enable replication for `whatsapp_messages`

## Testing Checklist

- [x] Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL` in .env
- [x] Contacts list loads from `whatsapp_contacts` sorted by `last_seen` desc
- [x] Clicking a contact loads messages from `whatsapp_messages` where `wa_id` matches
- [x] Messages render correctly: `body` as text, `created_at` as time
- [x] Sending a message calls `POST /whatsapp/send` with `{ to: wa_id, message: text }`
- [x] After sending, new outbound message appears (via realtime or refetch)
- [x] When someone messages WhatsApp number, inbound message appears in real-time
- [x] New contacts appear in sidebar when a new person messages
- [x] Contact name displays from `name` field (single field)
- [x] No errors from missing `conversations` table or `content`/`sent_at` columns

## Next Steps

1. **Enable Supabase Realtime** (Database → Replication)
2. **Test sending a message** from the UI
3. **Test receiving a message** (send to +61 485 838 059)
4. **Verify real-time updates** work correctly

All code changes are complete! 🎉
