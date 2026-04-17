## Yrull — Multi-Channel Conversation Automation Platform

Yrull is a multi-channel conversation automation platform for businesses. Manage Instagram DMs, WhatsApp messages, Facebook Messenger, comments, and automations from one unified inbox.

### Tech
- **React 18 + Vite**
- **Tailwind CSS**
- **shadcn/ui-style components (Radix primitives)**
- **React Router v6**
- **Zustand**
- **Supabase**
- **TanStack Query**
- **React Hook Form + Zod**
- **Lucide icons**
- **react-hot-toast**

### Setup
- Install deps:

```bash
npm install
```

- Create `.env` (copy from `.env.example`):

```bash
copy .env.example .env
```

### Environment variables
Required:
- **VITE_SUPABASE_URL**
- **VITE_SUPABASE_ANON_KEY**
- **VITE_API_BASE_URL**
- **VITE_USE_MOCK**: set to `true` to use mock data everywhere (recommended until backend is wired)

### Run

```bash
npm run dev
```

### Supabase schema
See `supabase/schema.sql`.

### Security considerations

- **Auth tokens**: Supabase stores session tokens in `localStorage` (standard for SPAs). For sensitive environments, consider configuring `httpOnly` cookie-based auth at the Supabase project level.
- **Realtime channels**: All Supabase Realtime subscriptions are workspace-scoped using `filter: workspace_id=eq.${id}` to prevent cross-tenant data leakage. The centralized helper at `src/lib/realtime.js` enforces this pattern.
- **Environment variables**: All `VITE_*` variables are bundled into the client. Never store server-side secrets with the `VITE_` prefix. See `.env.example` for the complete list.
- **Security headers**: `vercel.json` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` to block camera/mic/geolocation access.
- **XSS**: No use of `dangerouslySetInnerHTML` in the codebase. All user-generated content is rendered via React text nodes (auto-escaped).
- **Error monitoring**: If `VITE_SENTRY_DSN` is set, uncaught errors are reported to Sentry. No PII (email, name) is sent — only user ID and workspace ID.

### Company

Yrull is a product of Prepsmart Pty Ltd, registered in Victoria, Australia.
