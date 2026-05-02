#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
if (!projectRef) { console.error("Could not parse project ref from URL"); process.exit(1); }
console.log(`Project ref: ${projectRef}`);

const SQL = `
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  schedule text,
  capacity int DEFAULT 30,
  enrolled int DEFAULT 0,
  fee numeric DEFAULT 0,
  teacher text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  gender text CHECK (gender IN ('male','female','other')),
  guardian_name text,
  guardian_phone text,
  date_of_birth date,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  subject text,
  qualification text,
  salary numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  month text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  payment_date timestamptz,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  exam_date date,
  duration_minutes int,
  total_marks int,
  pass_marks int,
  type text,
  instructions text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  marks_obtained numeric,
  grade text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  category text DEFAULT 'general',
  is_pinned boolean DEFAULT false,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  guardian_name text,
  guardian_phone text,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  address text,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='batches' AND policyname='public_read_batches') THEN
    CREATE POLICY public_read_batches ON batches FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notices' AND policyname='public_read_notices') THEN
    CREATE POLICY public_read_notices ON notices FOR SELECT USING (is_published = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_requests' AND policyname='public_insert_admissions') THEN
    CREATE POLICY public_insert_admissions ON admission_requests FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_messages' AND policyname='public_insert_contact') THEN
    CREATE POLICY public_insert_contact ON contact_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='auth_all_students') THEN
    CREATE POLICY auth_all_students ON students FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teachers' AND policyname='auth_all_teachers') THEN
    CREATE POLICY auth_all_teachers ON teachers FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='batches' AND policyname='auth_all_batches') THEN
    CREATE POLICY auth_all_batches ON batches FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fees' AND policyname='auth_all_fees') THEN
    CREATE POLICY auth_all_fees ON fees FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exams' AND policyname='auth_all_exams') THEN
    CREATE POLICY auth_all_exams ON exams FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='results' AND policyname='auth_all_results') THEN
    CREATE POLICY auth_all_results ON results FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notices' AND policyname='auth_all_notices') THEN
    CREATE POLICY auth_all_notices ON notices FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_requests' AND policyname='auth_all_admissions') THEN
    CREATE POLICY auth_all_admissions ON admission_requests FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_messages' AND policyname='auth_all_contact') THEN
    CREATE POLICY auth_all_contact ON contact_messages FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO batches (name, subject, schedule, capacity, enrolled, fee, teacher, is_active)
VALUES
  ('SSC English Morning', 'English', 'Sat-Thu 8:00-9:30 AM', 40, 28, 800, 'Md. Rafiqul Islam', true),
  ('SSC Math Afternoon', 'Mathematics', 'Sat-Thu 3:00-4:30 PM', 35, 22, 900, 'Nasrin Sultana', true),
  ('HSC Physics Evening', 'Physics', 'Sat-Thu 5:00-6:30 PM', 30, 18, 1000, 'Dr. Kamal Hossain', true),
  ('HSC Chemistry Morning', 'Chemistry', 'Sat-Thu 9:30-11:00 AM', 30, 15, 1000, 'Farzana Akter', true),
  ('IELTS Preparation', 'English (IELTS)', 'Fri-Sat 10:00 AM-1:00 PM', 20, 12, 2500, 'Md. Rafiqul Islam', true),
  ('JSC Math Basic', 'Mathematics', 'Sat-Thu 2:00-3:00 PM', 45, 35, 600, 'Nasrin Sultana', true)
ON CONFLICT DO NOTHING;

INSERT INTO teachers (name, email, phone, subject, qualification, salary)
VALUES
  ('Md. Rafiqul Islam', 'rafiqul@example.com', '01711-000001', 'English', 'M.A. in English (DU)', 25000),
  ('Nasrin Sultana', 'nasrin@example.com', '01711-000002', 'Mathematics', 'M.Sc. in Math (BUET)', 28000),
  ('Dr. Kamal Hossain', 'kamal@example.com', '01711-000003', 'Physics', 'Ph.D. in Physics (DU)', 35000),
  ('Farzana Akter', 'farzana@example.com', '01711-000004', 'Chemistry', 'M.Sc. in Chemistry (RU)', 26000)
ON CONFLICT DO NOTHING;

INSERT INTO notices (title, content, category, is_pinned, is_published)
VALUES
  ('Welcome to New Academic Session 2025', 'We are pleased to announce the commencement of the new academic session. All students are requested to collect their ID cards from the office.', 'general', true, true),
  ('SSC Model Test Schedule Published', 'The SSC Model Test schedule has been published. Students of SSC batches are requested to check the exam hall and timing carefully.', 'exam', true, true),
  ('Monthly Fee Collection Notice', 'Monthly fees for May 2025 are now being collected. Students are requested to pay their fees by 10th May to avoid late charges.', 'fees', false, true),
  ('Eid Holiday Announcement', 'The coaching center will remain closed from 29 March to 5 April on the occasion of Eid-ul-Fitr. Classes will resume on 6 April.', 'holiday', false, true)
ON CONFLICT DO NOTHING;
`;

async function tryConnect(connStr, label) {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`Connected via ${label}`);
    await client.query(SQL);
    await client.end();
    return true;
  } catch (err) {
    await client.end().catch(() => {});
    console.log(`${label} failed: ${err.message}`);
    return false;
  }
}

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-west-1'];
let success = false;

for (const region of regions) {
  const connStr = `postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  success = await tryConnect(connStr, `pooler ${region}`);
  if (success) break;
}

if (!success) {
  const direct = `postgresql://postgres:${SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;
  success = await tryConnect(direct, 'direct connection');
}

if (success) {
  console.log('\n✅ Tables created');
  console.log('✅ RLS enabled');
  console.log('✅ Policies created');
  console.log('✅ Seed data inserted');
  console.log('\n🎉 Database setup complete!');
} else {
  console.error('\n❌ Could not connect to database. Check your service role key.');
  process.exit(1);
}
