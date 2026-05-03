# Coaching Center Management System
### Techely Learning Academy

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Auth-3ecf8e?logo=supabase&logoColor=white)

A full-featured coaching center management system with an **admin panel** and a **student portal**, built with React + Vite + Supabase. UI is in Bengali.

---

## Table of Contents

1. [What's Included](#whats-included)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Create Supabase Project](#step-1--create-supabase-project)
4. [Step 2 — Run Database Migration](#step-2--run-database-migration)
5. [Step 3 — Create Admin User](#step-3--create-admin-user)
6. [Step 4 — Set Environment Variables](#step-4--set-environment-variables)
7. [Step 5 — Run the App](#step-5--run-the-app)
8. [Step 6 — Configure Institute Settings](#step-6--configure-institute-settings)
9. [Step 7 — Clear Demo Data](#step-7--clear-demo-data)
10. [Step 8 — Add Real Data (in order)](#step-8--add-real-data-in-order)
11. [Step 9 — Test the Student Portal](#step-9--test-the-student-portal)
12. [Step 10 — Test Every Page](#step-10--test-every-page)
13. [Step 11 — Go Live](#step-11--go-live)
14. [Admin Panel Reference](#admin-panel-reference)
15. [Student Portal Reference](#student-portal-reference)
16. [Project Structure](#project-structure)
17. [Continuous Integration](#continuous-integration)

---

## What's Included

### Admin Panel (`/admin`)
| Page | What it does |
|------|-------------|
| Dashboard | Live stats — students, fees collected, active exams, recent admissions |
| Students | Add / edit / delete students; set portal password; approve portal access |
| Batches | Manage course batches with schedule, fee, teacher assignment |
| Teachers | Teacher profiles with photo and subject |
| Fees | Collect fees, mark paid/pending/overdue/waived, generate PDF receipts |
| Exams | Schedule MCQ exams with live timer; set start/end times |
| Results | View per-exam leaderboard and student score breakdown |
| Notices | Post notices (public or batch-specific) |
| Admissions | Review and accept/reject online admission requests |
| SMS | Send bulk or individual SMS via MIMSMS API |
| Reports | Monthly fee reports, student statistics, batch analysis |
| Settings | Institute info, payment numbers, SMS config, appearance, social media |
| Backup & Restore | Download full JSON backup; restore from backup; clear demo data |

### Student Portal (`/portal`)
| Page | What it does |
|------|-------------|
| Dashboard | Welcome message, upcoming exams, recent notices |
| Fees | Payment history for the student |
| Exams | Join live MCQ exams via link; view upcoming exams |
| Results | Personal results with score, rank, grade |
| Notices | All notices visible to the student's batch |
| Profile | Update personal info and password |

### Public Website (`/`)
- Homepage with hero section, stats, batch listings
- Courses page
- Online admission form
- Notice board
- Contact page

---

## Prerequisites

- **Node.js** v20 or later
- **pnpm** v9 or later → `npm install -g pnpm`
- **Supabase account** → [supabase.com](https://supabase.com) (free tier is enough)
- A modern browser (Chrome / Edge recommended)

---

## Step 1 — Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) and sign in.
2. Click **New project**.
3. Choose a name (e.g. `techely-coaching`), set a database password, and pick a region close to your users.
4. Wait ~2 minutes for the project to provision.
5. Go to **Settings → API** and note down:
   - **Project URL** → looks like `https://xyzxyz.supabase.co`
   - **anon public key** → a long JWT string starting with `eyJ…`

> Keep the **service_role** key secret — it bypasses all security. Only use it server-side.

---

## Step 2 — Run Database Migration

You need to run two SQL scripts in order. Go to **Supabase → SQL Editor**.

### 2a — Create base tables

Click **New query**, paste the SQL below, and click **Run**:

```sql
-- Batches
CREATE TABLE IF NOT EXISTS batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  subject      TEXT,
  schedule     TEXT,
  fee          NUMERIC,
  status       TEXT DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  subject    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  batch_id   UUID REFERENCES batches(id),
  roll       TEXT,
  status     TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fees
CREATE TABLE IF NOT EXISTS fees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES students(id),
  amount       NUMERIC NOT NULL,
  month        TEXT,
  payment_date DATE,
  status       TEXT DEFAULT 'pending',
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subject     TEXT,
  batch_id    UUID REFERENCES batches(id),
  exam_date   DATE,
  total_marks INTEGER DEFAULT 100,
  pass_marks  INTEGER DEFAULT 40,
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

-- SMS Logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT,
  message    TEXT,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs          ENABLE ROW LEVEL SECURITY;

-- Allow authenticated (admin) full access to all tables
CREATE POLICY IF NOT EXISTS "Allow auth all batches"            ON batches            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all teachers"           ON teachers           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all students"           ON students           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all fees"               ON fees               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all exams"              ON exams              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all notices"            ON notices            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all admission_requests" ON admission_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow auth all sms_logs"           ON sms_logs           FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read only for non-sensitive public-facing data
CREATE POLICY IF NOT EXISTS "Public read batches"      ON batches             FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read notices"      ON notices             FOR SELECT USING (is_public = true);
CREATE POLICY IF NOT EXISTS "Public read exams"        ON exams               FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public insert admissions" ON admission_requests  FOR INSERT  WITH CHECK (true);

-- NOTE: students and fees contain personal/payment data.
-- Do NOT add public SELECT policies for these tables.
-- The full migration.sql (Step 2b) handles their access policies correctly.
```

### 2b — Apply the full migration

Open `artifacts/coaching-center/migration.sql` from this repository, copy its entire contents, paste into a **new SQL Editor query**, and click **Run**.

This migration adds all required columns (student portal password, exam timer, fee audit log, etc.) and sets up the MCQ questions, submissions, and site settings tables.

> **If you see "column already exists" errors**, that is fine — the migration uses `IF NOT EXISTS` and `IF NOT EXISTS` guards throughout.

---

## Step 3 — Create Admin User

1. In Supabase → **Authentication → Users**, click **Add user → Create new user**.
2. Enter an email and a strong password (you will use these to log in to `/admin/login`).
3. After creating the user, click on their row to open the user detail page.
4. Scroll down to **User Metadata** and set:
   ```json
   { "role": "admin", "name": "Your Name" }
   ```
5. Click **Save**.

> Only users with `role: "admin"` in their metadata can access the admin panel.

---

## Step 4 — Set Environment Variables

### If running on Replit

The Replit project already has secrets configured. Verify these are set under **Tools → Secrets**:

| Secret Key | Value |
|------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

### If running locally

Copy the example file:

```bash
cp artifacts/coaching-center/.env.example artifacts/coaching-center/.env
```

Open `artifacts/coaching-center/.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
BASE_PATH=/
```

> Never commit your `.env` file — it is already in `.gitignore`.

---

## Step 5 — Run the App

### On Replit

Click the green **Run** button. Both workflows start automatically:
- **coaching-center: web** → the main website
- **api-server: API Server** → optional backend

### Locally

```bash
# Install dependencies
pnpm install

# Start the frontend
pnpm --filter @workspace/coaching-center run dev
```

Visit `http://localhost:3000`. The admin panel is at `/admin/login`.

---

## Step 6 — Configure Institute Settings

Log in to the admin panel at `/admin/login` with the credentials you created in Step 3.

Go to **Settings** (sidebar → bottom). Work through each tab:

### Institute tab
| Field | What to enter |
|-------|--------------|
| Center Name | Your coaching center's official name (appears on homepage, receipts, SMS) |
| Tagline | A short slogan |
| Address | Full address |
| Phone | Contact number (shown on site) |
| WhatsApp | Number with country code e.g. `8801XXXXXXXXX` (for WhatsApp click-to-chat) |
| Email | Contact email |
| Currency | BDT / USD / INR |
| Hero Title | Large heading on the homepage |
| Hero Subtitle | Subtitle below the heading |
| Logo URL | Direct link to your logo image (upload to Supabase Storage or use an external URL) |
| Banner URL | Homepage right-side banner image URL |
| Admission Open | Toggle ON to show the admission form on the public site |

### Payment tab
| Field | What to enter |
|-------|--------------|
| bKash Number | Your bKash merchant number |
| Nagad Number | Your Nagad number |
| Admission Fee | Amount charged for new admissions |

> These numbers appear on the student portal fee page so students know where to send money.

### SMS tab
| Field | What to enter |
|-------|--------------|
| API Key | Your MIMSMS API key (get it from [mimsms.com](https://mimsms.com)) |
| Sender ID | Your registered sender ID (max 8 characters) |

Use the **Send Test SMS** button to verify the configuration is working before sending real messages.

> Without an API key, SMS messages will be saved as `pending` in the SMS logs but not actually sent.

### Stats tab
These numbers appear on the homepage. Either:
- Toggle **Auto-calculate from database** ON — the site will use live counts from the database, or
- Enter them manually (useful when you have historical students not in the system)

| Field | Suggested value |
|-------|----------------|
| Students Count | Total enrolled students |
| Teachers Count | Number of active teachers |
| Active Batches | Number of running batches |
| Success Rate (%) | Your center's pass rate |

### Social tab
Enter your Facebook, YouTube, and Instagram page URLs. These appear in the site footer.

### Appearance tab
Choose the primary accent colour using the colour picker. Sky blue (`#38bdf8`) is the default. The preview buttons update live.

### Admins tab
- **Change Password** — update your admin login password
- **Add New Admin** — create a second admin account if needed

Click **সেটিংস সংরক্ষণ করুন** (Save Settings) after each tab.

---

## Step 7 — Clear Demo Data

The system ships with sample data so you can see how everything looks. Before going live, wipe it.

1. Go to **Admin → Backup & Restore**.
2. **First — take a backup** (optional but recommended): click **সম্পূর্ণ ডেটা ব্যাকআপ করুন** to download a JSON file.
3. Scroll down to the **ডেমো ডেটা মুছুন** (Clear Demo Data) section.
4. Tick the categories you want to clear. For a fresh start, click **সব নির্বাচন করুন** (Select All).
5. Click **নির্বাচিত ডেটা মুছুন**, then confirm through the two warning screens.
6. All selected data is permanently deleted. The dashboard will now show zeros.

**Recommended clearing order if you want to be selective:**

| Clear first | Then clear |
|-------------|-----------|
| ফলাফল (Results) | পরীক্ষা ও প্রশ্নপত্র (Exams) |
| ফি রেকর্ড (Fees) | শিক্ষার্থী (Students) |
| শিক্ষার্থী (Students) | ব্যাচ (Batches) |

> Site settings (institute name, SMS config, appearance) are **not** cleared by this panel — your Step 6 configuration is safe.

---

## Step 8 — Add Real Data (in order)

Always add data in this order because later items depend on earlier ones (e.g. students need a batch, fees need a student).

### 8.1 — Add Batches first

Go to **Admin → Batches → + নতুন ব্যাচ**

| Field | Example |
|-------|---------|
| Batch Name | SSC 2026 Morning |
| Subject | Physics / Math / All subjects |
| Class Level | SSC / HSC / Honours |
| Monthly Fee | 1500 |
| Schedule Days | Sun, Tue, Thu |
| Start Time | 08:00 AM |
| Max Seats | 40 |
| Description | Optional notes |
| Teacher | Assign after adding teachers |

Add all your active batches before moving on.

### 8.2 — Add Teachers

Go to **Admin → Teachers → + নতুন শিক্ষক**

| Field | Example |
|-------|---------|
| Name | মোঃ রহিম উদ্দীন |
| Phone | 01712345678 |
| Subject | Mathematics |
| Bio | Brief background |
| Photo URL | Direct image URL (optional) |

After adding teachers, go back to **Batches** and assign each batch a teacher.

### 8.3 — Add Students

Go to **Admin → Students → + নতুন শিক্ষার্থী**

| Field | Notes |
|-------|-------|
| Name | Student's full name |
| Student ID | Auto-generated, or enter manually (e.g. `TLA-2026-001`) |
| Phone | Used as login identifier in the portal |
| Guardian Name | Parent/guardian name |
| Email | Optional |
| Class Level | SSC / HSC / etc. |
| Batch | Select from the batches you created |
| Password | Sets the student's portal login password |
| Approve Portal Access | Toggle ON to let the student log in to the portal |
| Status | active / inactive / suspended |
| Photo URL | Optional profile photo |

> Students can **only log in to the portal** if:
> - A password is set for them
> - "Approve Portal Access" is toggled ON

### 8.4 — Add Fee Records

Go to **Admin → Fees → + ফি যোগ করুন**

For each student each month:

| Field | Notes |
|-------|-------|
| Student | Select student from list |
| Month | e.g. `January 2026` |
| Amount | Monthly fee amount |
| Payment Method | bKash / Nagad / Cash |
| Status | pending / paid / overdue / waived |
| Transaction ID | bKash/Nagad reference (if paid) |
| Discount | Any discount applied |
| Due Date | When payment is expected |

> **Tip:** The **Reports** page can generate a list of students who haven't paid for a given month — useful for follow-up.

### 8.5 — Add Notices

Go to **Admin → Notices → + নতুন নোটিশ**

| Field | Notes |
|-------|-------|
| Title | Notice heading |
| Body | Full notice text |
| Type | notice / event / holiday / result / exam |
| Target | All students / specific batch |
| Public | ON = visible on public website; OFF = portal only |

### 8.6 — Add Exams (optional)

Go to **Admin → Exams → + নতুন পরীক্ষা**

| Field | Notes |
|-------|-------|
| Title | Exam name |
| Subject | Subject being tested |
| Batch | Which batch takes this exam |
| Exam Date | Scheduled date |
| Total Marks | Total marks available |
| Pass Marks | Minimum marks to pass |
| Status | upcoming / active / ended |
| Start Time / End Time | For live MCQ exams with timer |
| Timer Enabled | Countdown timer for MCQ exams |

After creating an exam, open it and add MCQ questions using **+ প্রশ্ন যোগ করুন**. Each question has 4 options (A/B/C/D) and a correct answer.

To run the live exam:
1. Set status to **active** and set the start/end time.
2. Share the exam URL (`/exam/<exam-id>`) with students.
3. Students open the link, verify their Student ID, and take the exam.
4. After the exam ends, go to **Admin → Results** to see the leaderboard.

---

## Step 9 — Test the Student Portal

Before giving login credentials to real students, test the portal yourself.

1. **Create a test student** in Admin → Students:
   - Set a phone number (e.g. `01900000000`)
   - Set a password (e.g. `test1234`)
   - Turn ON **Approve Portal Access**
   - Assign to a batch
2. Open a **private/incognito browser window** (so you stay logged in as admin in your main window).
3. Go to `/portal/login`.
4. Log in with the phone number and password you set.
5. Check each portal page:
   - **Dashboard** — welcome message, upcoming exams, recent notices
   - **Fees** — should show any fees added for this student
   - **Exams** — should show any exams linked to the student's batch
   - **Results** — should show any submitted results
   - **Notices** — should show notices targeted to the student's batch or all
   - **Profile** — student should be able to update their name and password

---

## Step 10 — Test Every Page

Go through this checklist before handing over to the client:

### Public website
- [ ] Homepage loads with your center name, hero text, and batch list
- [ ] Courses page shows active batches
- [ ] Notice board shows public notices
- [ ] Admission form submits and appears in **Admin → Admissions**
- [ ] Contact page is visible

### Admin panel
- [ ] **Dashboard** shows real stats (not demo numbers)
- [ ] **Students** — add, edit, delete a test student
- [ ] **Batches** — batches show correct teacher and schedule
- [ ] **Teachers** — all teachers listed correctly
- [ ] **Fees** — collect a test payment; check that the PDF receipt downloads
- [ ] **Exams** — create a test exam; add one MCQ question; set status to active
- [ ] **Results** — visible after a student submits an exam
- [ ] **Notices** — add a notice; check it appears on the public site and portal
- [ ] **Admissions** — submit a test admission from the public form; approve it here
- [ ] **SMS** — send a test SMS (requires API key in Settings → SMS)
- [ ] **Reports** — monthly fee report generates correctly
- [ ] **Settings** — all fields saved and reflected on the homepage
- [ ] **Backup** — backup downloads as a `.json` file

### Student portal
- [ ] Login works with phone + password
- [ ] Portal pages load without errors
- [ ] Logout works

---

## Step 11 — Go Live

### Option A — Deploy on Replit

1. Click **Deploy** in the Replit toolbar.
2. Replit provisions a `.replit.app` domain with HTTPS automatically.
3. Set your production secrets under **Deployments → Environment Variables** (same keys as Step 4).
4. Your site is live.

### Option B — Deploy anywhere (Vercel, Netlify, VPS)

```bash
# Build the frontend
pnpm --filter @workspace/coaching-center run build
# Output is in artifacts/coaching-center/dist/
```

Upload the `dist/` folder to any static hosting service. Set the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in your hosting platform's settings.

### After going live — checklist
- [ ] Visit your live domain and confirm the homepage loads
- [ ] Log in to `/admin/login` on the live domain
- [ ] Test the student portal at `/portal/login`
- [ ] Check the admission form submits correctly
- [ ] Remove or update the test student you created in Step 9
- [ ] Set the Settings → Stats numbers to your real values (or enable auto-calculate)
- [ ] Make sure Admission Open is toggled to the correct state (ON if accepting applications)

---

## Admin Panel Reference

### URL map

| URL | Page |
|-----|------|
| `/` | Public homepage |
| `/courses` | Public courses |
| `/notices` | Public notice board |
| `/admission` | Public admission form |
| `/contact` | Public contact page |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |
| `/admin/students` | Students list |
| `/admin/batches` | Batches |
| `/admin/teachers` | Teachers |
| `/admin/fees` | Fee collection |
| `/admin/exams` | Exam management |
| `/admin/results` | Exam results & leaderboard |
| `/admin/notices` | Notice management |
| `/admin/admissions` | Admission requests |
| `/admin/sms` | SMS messaging |
| `/admin/reports` | Reports & analytics |
| `/admin/settings` | Center settings |
| `/admin/backup` | Backup, restore & data reset |
| `/portal/login` | Student portal login |
| `/portal` | Student dashboard |
| `/exam/:id` | Live MCQ exam |

---

## Student Portal Reference

### How students log in

Students log in at `/portal/login` using:
- **Phone number** (the number entered in Admin → Students)
- **Password** (set by the admin in Admin → Students → Edit Student)

The admin must toggle **Approve Portal Access** ON for each student before they can log in.

### Forgot password

Students cannot reset their own password. The admin must go to **Admin → Students**, open the student's profile, and set a new password manually.

### Exam participation

1. Admin creates an exam, adds questions, and sets status to **active**.
2. Admin shares the exam URL: `https://yoursite.com/exam/<exam-id>`
3. Student opens the URL and enters their Student ID to verify identity.
4. Student reads the instructions and starts the exam.
5. The timer counts down. Student selects answers and submits before time runs out.
6. Score and rank appear immediately after submission.
7. Results are visible to the admin in **Admin → Results**.

---

## Project Structure

```
.
├── artifacts/
│   ├── coaching-center/          # React + Vite frontend (main app)
│   │   ├── .env.example          # Environment variable template
│   │   ├── migration.sql         # Full database migration (run in Supabase)
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── admin/        # All admin panel pages
│   │       │   ├── portal/       # All student portal pages
│   │       │   └── public/       # Public-facing pages
│   │       ├── components/
│   │       │   ├── admin/        # Admin UI components (drawers, tables)
│   │       │   ├── portal/       # Portal layout and components
│   │       │   └── shared/       # Shared UI (Avatar, etc.)
│   │       ├── store/            # Zustand stores (auth, settings)
│   │       ├── hooks/            # Custom React hooks
│   │       └── lib/              # supabase client, utils, pdf, sms helpers
│   └── api-server/               # Express 5 API server (optional)
├── lib/                          # Shared TypeScript libraries
├── scripts/                      # Post-merge and utility scripts
├── .github/workflows/ci.yml      # GitHub Actions — typecheck + build on push
├── pnpm-workspace.yaml           # pnpm workspace config
└── README.md                     # This file
```

---

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on every push to `main`. It:

1. Runs `pnpm run typecheck` — TypeScript check across all packages
2. Runs `pnpm -r --if-present run build` — confirms everything builds cleanly

No GitHub secrets are needed for CI to pass. If your CI check fails after a push, the TypeScript error will be shown in the **Actions** tab of your GitHub repository.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 — glassmorphism, dark navy + sky blue |
| Routing | React Router DOM v7 |
| State | Zustand |
| Charts | Recharts |
| Animations | Framer Motion |
| Backend / Auth / DB | Supabase (PostgreSQL + Row Level Security) |
| PDF receipts | jsPDF |
| SMS | MIMSMS API |
| Monorepo | pnpm workspaces |

---

## Common Issues

**"Missing Supabase environment variables" error on startup**
→ The `.env` file is missing or the keys are wrong. Re-check Step 4.

**Admin login says "Invalid login credentials"**
→ The email/password doesn't match the user in Supabase Auth. Reset the password in Supabase → Authentication → Users.

**Admin login works but redirects back to login**
→ The user metadata `role` field is not set to `"admin"`. Check Step 3.

**Students can't log in to the portal**
→ Either the password is not set, or "Approve Portal Access" is OFF. Check Admin → Students → Edit.

**SMS messages show as "pending" but aren't sent**
→ The MIMSMS API key is missing or wrong. Check Settings → SMS → API Key, then use the Test SMS button.

**Charts and dashboard show demo numbers after clearing data**
→ If Stats is set to manual, update the numbers in Settings → Stats. If auto-calculate is ON, refresh the page.

**Exam link shows "পরীক্ষা শেষ হয়ে গেছে" (Exam ended)**
→ The exam status is `ended`. Go to Admin → Exams and set the status back to `active` if needed.

---

## License

MIT
