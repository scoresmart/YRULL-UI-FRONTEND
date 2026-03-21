## FlowDesk — WhatsApp Automation & Inbox (Frontend)

Professional, minimal SaaS UI for WhatsApp automation & inbox management (Linear.app meets WhatsApp Web).

### Tech
- **React 18 + Vite**
- **Tailwind CSS**
- **shadcn/ui-style components (Radix primitives)**
- **React Router v6**
- **Zustand**
- **Supabase**
- **TanStack Query**
- **Axios**
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
