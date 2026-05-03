# Coaching Center Management System

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Auth-3ecf8e?logo=supabase&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?logo=pnpm&logoColor=white)

A full-featured coaching center management system built with React, Vite, and Supabase. It includes an **admin panel** for managing students, teachers, batches, fees, exams, results, notices, and SMS messaging, as well as a **student portal** where enrolled students can view their fees, exam schedules, results, and notices.

---

## Features

### Admin Panel (`/admin`)
- Dashboard with key statistics and charts
- Student, teacher, and batch CRUD management
- Fee collection with PDF receipt generation
- Exam scheduling and results entry (including MCQ exams with live timer)
- Notice board management
- Admission request processing
- SMS messaging via MIMSMS API
- Data export and backup
- Center settings (name, contact, SMS config)

### Student Portal (`/portal`)
- Personalised dashboard
- Fee payment history
- Exam schedule and results
- Notice board

### Public Pages
- Homepage with hero section and batch listings
- Course browser
- Online admission form
- Notice board
- Contact form

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 (glassmorphism design) |
| Routing | React Router DOM v7 |
| State management | Zustand |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend / Auth / DB | Supabase (PostgreSQL + Auth) |
| Monorepo | pnpm workspaces |
| API server (optional) | Express 5 + Drizzle ORM |

---

## Prerequisites

- **Node.js** v20 or later (v24 recommended)
- **pnpm** v9 or later — install with `npm install -g pnpm`
- **Supabase account** — [supabase.com](https://supabase.com) (free tier works)

---

## Environment Variables

The frontend app reads its configuration from `artifacts/coaching-center/.env`.

Copy the provided example and fill in your values:

```bash
cp artifacts/coaching-center/.env.example artifacts/coaching-center/.env
```

Then open the file and set the following:

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key | Yes |
| `PORT` | Port the Vite dev server listens on (default `3000`) | Yes |
| `BASE_PATH` | URL base path (use `/` for local dev) | Yes |
| `VITE_SITE_URL` | Your public site URL (used for metadata) | Optional |

> **Security note:** Never commit your `.env` file to version control. The `.env.example` file is safe to commit because it contains no real secrets.

---

### API Server (optional)

If you are also running the Express API server (`artifacts/api-server`), create a `.env` file inside `artifacts/api-server/` with:

```env
# Port the API server listens on (assigned automatically by Replit workflows)
PORT=8080

# Supabase service role key — required for server-side admin operations that
# bypass Row Level Security (Settings → API → service_role secret key)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# A long, random string used to sign session cookies (e.g. generate with
# `openssl rand -hex 32`)
SESSION_SECRET=change-me-to-a-long-random-string
```

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Supabase Row Level Security and must never be exposed to the browser or committed to version control. Keep it server-side only.

---

## Supabase Setup

1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. In the **SQL Editor**, run **Step 1** below to create the base tables, then **Step 2** to apply all column additions and policies.
3. Enable **Email Auth** under Authentication → Providers.
4. Create your first admin user via Authentication → Users, then set their metadata to `{"role": "admin"}`.

<details>
<summary><strong>Step 1 — Create base tables</strong> (click to expand)</summary>

Run this in Supabase → SQL Editor. The order matters — tables with foreign keys are created after their dependencies.

```sql
-- Batches (no dependencies)
CREATE TABLE IF NOT EXISTS batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  subject     TEXT,
  schedule    TEXT,
  fee         NUMERIC,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers (no dependencies)
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  subject     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Students (references batches)
CREATE TABLE IF NOT EXISTS students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  batch_id    UUID REFERENCES batches(id),
  roll        TEXT,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Fees (references students and batches)
CREATE TABLE IF NOT EXISTS fees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES students(id),
  amount      NUMERIC NOT NULL,
  month       TEXT,
  paid_at     TIMESTAMPTZ DEFAULT NOW(),
  note        TEXT
);

-- Exams (references batches)
CREATE TABLE IF NOT EXISTS exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  batch_id    UUID REFERENCES batches(id),
  exam_date   DATE,
  total_marks NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Results (references exams and students)
CREATE TABLE IF NOT EXISTS results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID REFERENCES exams(id),
  student_id  UUID REFERENCES students(id),
  marks       NUMERIC,
  grade       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notices
CREATE TABLE IF NOT EXISTS notices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  body         TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_public    BOOLEAN DEFAULT TRUE
);

-- Admission Requests
CREATE TABLE IF NOT EXISTS admission_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

</details>

<details>
<summary><strong>Step 2 — Apply migration</strong> (click to expand)</summary>

After creating the base tables, run the full migration script found at `artifacts/coaching-center/migration.sql`. It adds all required columns, creates the `mcq_questions`, `mcq_submissions`, and `site_settings` tables, and sets up Row Level Security policies.

Copy the contents of that file and paste them into the Supabase SQL Editor, then click **Run**.

</details>

---

## Local Setup

```bash
# 1. Clone the repository (replace the URL with your actual GitHub repo URL)
git clone https://github.com/your-org/your-repo.git
cd your-repo

# 2. Install all workspace dependencies
pnpm install

# 3. Set up environment variables
cp artifacts/coaching-center/.env.example artifacts/coaching-center/.env
# Open artifacts/coaching-center/.env and fill in your Supabase URL and anon key

# 4. Start the frontend dev server
pnpm --filter @workspace/coaching-center run dev
```

The app will be available at `http://localhost:3000` (or the `PORT` you set in `.env`).

To also run the API server in a separate terminal:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (dev only) |

---

## Project Structure

```
.
├── artifacts/
│   ├── coaching-center/        # React + Vite frontend (main app)
│   │   ├── .env.example        # Environment variable template
│   │   ├── migration.sql       # Supabase schema migration (Step 2)
│   │   └── src/
│   │       ├── pages/          # public/, admin/, portal/
│   │       ├── components/     # public/, admin/, shared UI
│   │       ├── store/          # Zustand stores (auth, settings)
│   │       ├── hooks/          # useDebounce, useIntersection
│   │       └── lib/            # supabase client, utils, pdf, sms
│   └── api-server/             # Express 5 API server (optional)
├── lib/                        # Shared TypeScript libraries
│   ├── db/                     # Drizzle ORM schema + migrations
│   ├── api-spec/               # OpenAPI spec + codegen
│   └── api-zod/                # Generated Zod schemas
├── scripts/                    # Utility scripts
├── pnpm-workspace.yaml         # Workspace config
└── README.md
```

---

## Design System

- **Primary colour**: Sky blue `#38bdf8`
- **Secondary colour**: Violet `#a78bfa`
- **Background**: Dark navy `#0b1120`
- **Style**: Glassmorphism cards, gradient buttons, subtle glow effects
- **Fonts**: Hind Siliguri (Bengali UI), Inter (headings)

---

## License

MIT
