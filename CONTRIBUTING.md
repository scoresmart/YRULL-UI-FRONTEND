# Contributing to Yrull

Thank you for considering contributing to Yrull.

## Development Setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start the dev server: `npm run dev`

## Code Style

- We use **Prettier** for formatting — run `npm run format` before committing
- We use **ESLint** for linting — run `npm run lint` to check
- Single quotes, semicolons, 2-space indentation, 120-char line width

## Branching

- `main` — production-ready code
- `feat/<name>` — new features
- `fix/<name>` — bug fixes
- `chore/<name>` — tooling, deps, docs

## Commit Messages

Use conventional commits:

```
feat: add broadcast scheduling
fix: resolve WhatsApp reconnection issue
chore: update dependencies
docs: update README setup instructions
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint && npm run test:run && npm run build` to verify
4. Open a PR with a clear description of what changed and why

## Testing

- Write tests for new components and hooks in `src/tests/`
- Run `npm run test:run` to verify all tests pass
- Focus on critical paths: auth, messaging, broadcasts

## Architecture Guidelines

- Use named exports for components and hooks
- Keep components focused — extract reusable logic into hooks
- API calls go through `src/lib/api.js` using `authFetch`
- All realtime subscriptions must be workspace-scoped (use `src/lib/realtime.js`)
- Prefer Tailwind classes over custom CSS
- Use `EmptyState` and `ErrorState` components for consistent UX
