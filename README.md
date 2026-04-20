# Yrull — Multi-Channel Conversation Automation Platform

Yrull is a multi-channel conversation automation platform for businesses. Manage Instagram DMs, WhatsApp messages, Facebook Messenger, comments, broadcasts, and automations from one unified inbox.

## Features

- **Unified inbox** — WhatsApp, Instagram, Facebook Messenger in one place
- **Instagram comments** — View, reply, hide, delete comments and mentions
- **Broadcasts** — Send targeted messages to contact segments across channels
- **Automations** — Visual flow builder for automated responses
- **Contacts & tags** — CRM-style contact management with tagging
- **Team collaboration** — Invite team members with role-based access
- **Multi-tenant workspaces** — Each workspace gets its own data, channels, and team

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Components | Radix UI primitives (shadcn-style) |
| Routing | React Router v6 |
| State | Zustand (client), TanStack Query (server) |
| Auth & DB | Supabase |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (or use mock mode)

### Installation

```bash
git clone <repo-url>
cd Chat-UIUX
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_API_BASE_URL` | Yes | Backend API base URL |
| `VITE_USE_MOCK` | No | Set to `true` for mock data (no backend needed) |
| `VITE_SENTRY_DSN` | No | Sentry DSN for error reporting |

### Development

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run format     # Format code with Prettier
```

## Architecture

```
src/
├── components/       # Reusable UI components
│   ├── auth/         # Login, register, protected route
│   ├── layout/       # Sidebar, TopNav, UserLayout, PublicLayout
│   ├── ui/           # Primitives (Button, Input, Dialog, Skeleton)
│   └── whatsapp/     # WhatsApp-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities, API client, Supabase config
├── pages/
│   ├── admin/        # Admin dashboard
│   ├── auth/         # Login, register, onboarding, password reset
│   ├── legal/        # Privacy, terms, data deletion
│   ├── marketing/    # Homepage, features, pricing, about, contact
│   └── user/         # App pages (dashboard, inbox, settings, etc.)
├── store/            # Zustand stores
└── tests/            # Test files
```

### Key Patterns

- **Route-level code splitting** — All pages are lazy-loaded via `React.lazy` with a `Suspense` fallback
- **Workspace scoping** — Every API call includes `X-Workspace-Id` header; realtime channels filter by workspace
- **Optimistic updates** — Message sending, comment actions, and notification toggles update the UI immediately
- **Responsive design** — Mobile-first with breakpoints at 640px (sm), 768px (md), 1024px (lg)
- **Skeleton loading** — Data-loading states use skeleton screens instead of spinners

## Testing

```bash
npm run test        # Watch mode
npm run test:run    # Single run (CI)
```

Tests are in `src/tests/` and cover auth flows, UI components, and custom hooks.

## Deployment

The app deploys to Vercel. Security headers are configured in `vercel.json`.

```bash
npm run build       # Outputs to dist/
```

### Supabase

Database schema is in `supabase/schema.sql`. Run migrations against your Supabase project.

## Security

- **Realtime channels** — Workspace-scoped with server-side filters (`src/lib/realtime.js`)
- **Environment variables** — Validated at startup (`src/lib/envCheck.js`)
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options via `vercel.json`
- **XSS prevention** — No `dangerouslySetInnerHTML` usage; all content auto-escaped by React
- **Error boundary** — Catch-all error boundary prevents white screens

## Company

Yrull is a product of **Prepsmart Pty Ltd**, registered in Victoria, Australia.

- Website: [yrull.com](https://yrull.com)
- Support: support@yrull.com
- Privacy: privacy@yrull.com
