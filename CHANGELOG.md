# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Testing infrastructure: Vitest + Testing Library with component and hook tests
- Route-level code splitting with React.lazy and Suspense
- Prettier configuration for consistent code formatting
- CONTRIBUTING.md and CHANGELOG.md documentation
- Pre-submission checklist for Meta App Review

### Changed
- All page imports converted to lazy loading for smaller initial bundle
- README.md rewritten with full architecture docs, setup guide, and security notes

## [0.9.0] - 2026-04-17

### Added
- Mobile and tablet responsive design across all pages
- PWA manifest and meta tags
- `useMediaQuery` hook for responsive logic
- Sidebar context for mobile menu toggle
- Bottom-sheet dialogs on mobile
- Safe area padding for iPhone notch

## [0.8.0] - 2026-04-17

### Added
- Broadcasts and campaigns feature (list, composer, detail, templates)
- WhatsApp message template management
- 5-step broadcast composer wizard
- Audience estimation and compliance guardrails

## [0.7.0] - 2026-04-17

### Added
- Real dashboard data with stat cards, activity feed, top automations
- Empty states across all pages (inbox, contacts, automations, etc.)
- Error states with retry functionality
- Skeleton loading screens
- Keyboard shortcuts for inbox navigation
- Standardized toast notifications

## [0.6.0] - 2026-04-17

### Added
- Forgot password and reset password flows
- Email verification page
- Multi-step onboarding wizard
- Workspace switcher in sidebar
- Invite acceptance page
- Session expiry modal

## [0.5.0] - 2026-04-17

### Added
- Workspace-scoped realtime channels
- Environment variable validation at startup
- Error boundary component
- Security headers in vercel.json

### Removed
- Dead code: unused axios dependency and lib/axios.js

## [0.4.0] - 2026-04-17

### Added
- Full Settings page with 7 wired tabs
- Instagram comments management
- Marketing homepage with features, pricing, about, contact pages

## [0.3.0] - 2026-04-17

### Added
- WhatsApp Business Account integration UX
- Multi-tenant workspace-scoped API calls
- OAuth connection flow for WhatsApp

## [0.1.0] - 2026-04-17

### Added
- Initial project setup with React 18, Vite, Tailwind CSS
- Authentication with Supabase (login, register)
- Basic inbox for WhatsApp and Instagram
- Contact management
- Automation builder with React Flow
