# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

---

## Coaching Center Management System (`artifacts/coaching-center`)

Full-stack React + Vite SPA backed by Supabase (PostgreSQL + Auth).

### Design System
- **Colors**: Dark navy base (#0b1120), sky-blue primary (#38bdf8), violet secondary (#a78bfa)
- **Fonts**: Hind Siliguri (UI/Bengali), Inter (headings), system mono (IDs)
- **Style**: Glassmorphism cards, gradient buttons, glow effects, Tailwind v4 via `@tailwindcss/vite`

### Key Libraries
- React Router DOM v6 (BrowserRouter)
- Zustand (auth + settings stores)
- React Hook Form + Zod (all forms)
- Framer Motion (animations)
- Recharts (charts/reports)
- react-hot-toast (notifications)
- Supabase JS (auth + DB)

### Environment Variables (Secrets)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

### Routes
| Path | Description |
|------|-------------|
| `/` | Public homepage |
| `/courses` | Browse active batches |
| `/admission` | Apply for admission |
| `/notices` | Public notice board |
| `/contact` | Contact form |
| `/admin/login` | Admin sign-in |
| `/admin/dashboard` | Admin dashboard (protected) |
| `/admin/students` | Student CRUD |
| `/admin/batches` | Batch management |
| `/admin/teachers` | Teacher management |
| `/admin/fees` | Fee collection |
| `/admin/exams` | Exam scheduling |
| `/admin/results` | Results entry |
| `/admin/notices` | Notice management |
| `/admin/admissions` | Admission requests |
| `/admin/sms` | SMS messaging |
| `/admin/reports` | Charts & analytics |
| `/admin/settings` | Center settings |
| `/admin/backup` | Data export/backup |
| `/portal/login` | Student portal sign-in |
| `/portal/dashboard` | Student dashboard |
| `/portal/fees` | Student fee history |
| `/portal/exams` | Student exam schedule |
| `/portal/results` | Student results |
| `/portal/notices` | Student notices |

### Auth
- Supabase Auth with `user_metadata.role` field
- Admin role: `role = 'admin'`; Student role: `role = 'student'`
- `ProtectedRoute` component guards admin and portal routes

### Supabase Tables Required
```sql
students, teachers, batches, fees, exams, results,
notices, admission_requests, contact_messages
```
(See SQL schema section below for full DDL)

### Project Structure
```
artifacts/coaching-center/src/
  App.tsx                   # BrowserRouter + all routes
  pages/
    public/                 # HomePage, CoursesPage, AdmissionPage, NoticeBoardPage, ContactPage
    admin/                  # All 13 admin pages
    portal/                 # All 5 portal pages
  components/
    public/                 # PublicNavbar, Footer, HeroSection, BatchCard
    admin/                  # AdminLayout, AdminSidebar, AdminHeader, StatsCard, DataTable,
                            # StudentModal (rebuilt), StudentDrawer (new), SuspendModal (new)
    portal/                 # PortalLayout, PortalNav
    shared/                 # AnimatedSection, LoadingSkeleton, EmptyState, Avatar, ConfirmDialog
    ProtectedRoute.tsx
  store/
    useAuthStore.ts         # Zustand: user, role, signIn, signOut, initialize
    useSettingsStore.ts     # Zustand persisted: center name/phone/email/SMS config
  hooks/
    useIntersection.ts
    useDebounce.ts
  lib/
    supabase.ts             # Supabase client
    utils.ts                # cn, formatDate, formatCurrency, getInitials, etc.
```
