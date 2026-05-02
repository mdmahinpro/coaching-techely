import { supabase } from '@/lib/supabase';

const DEMO_KEY = 'demo_loaded';

export function isDemoLoaded(): boolean {
  return localStorage.getItem(DEMO_KEY) === 'true';
}

export async function loadDemoData(): Promise<void> {
  if (isDemoLoaded()) return;

  // ── 1. Teachers (actual schema: no bio/is_active/photo_url) ──────────────
  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .insert([
      { name: 'Md. Rafiqul Islam', subject: 'Mathematics', qualification: 'MSc Mathematics', phone: '01711000001', email: 'rafiq@demo.com', salary: 15000 },
      { name: 'Fatema Khatun',     subject: 'English',     qualification: 'MA English Literature', phone: '01711000002', email: 'fatema@demo.com', salary: 12000 },
      { name: 'Abdul Karim',       subject: 'Science',     qualification: 'BSc Physics', phone: '01711000003', email: 'karim@demo.com', salary: 13000 },
    ])
    .select('id, name');
  if (tErr || !teachers) throw new Error(tErr?.message ?? 'Teachers insert failed');

  const [t1, t2, t3] = teachers;

  // ── 2. Batches (actual schema: teacher=text, fee, schedule=text, capacity, enrolled, is_active) ──
  const { data: batches, error: bErr } = await supabase
    .from('batches')
    .insert([
      { name: 'SSC-2025 গণিত',    subject: 'Mathematics', teacher: t1.name, schedule: 'Sat, Mon, Wed  7:00-8:30 AM',  capacity: 30, enrolled: 0, fee: 500, is_active: true },
      { name: 'HSC-2025 ইংরেজি',  subject: 'English',     teacher: t2.name, schedule: 'Sun, Tue, Thu  5:00-6:30 PM', capacity: 25, enrolled: 0, fee: 600, is_active: true },
      { name: 'Class 8 বিজ্ঞান',  subject: 'Science',     teacher: t3.name, schedule: 'Sat, Mon  4:00-5:00 PM',       capacity: 20, enrolled: 0, fee: 400, is_active: true },
    ])
    .select('id, name, fee');
  if (bErr || !batches) throw new Error(bErr?.message ?? 'Batches insert failed');

  const [b1, b2, b3] = batches;

  // ── 3. Students (actual schema: no student_id/password/is_approved/status/photo_url/class_level) ──
  const { data: students, error: sErr } = await supabase
    .from('students')
    .insert([
      { name: 'আরিফ হোসেন',   phone: '01811000001', email: 'arif@demo.com',    guardian_name: 'মো. হোসেন',  guardian_phone: '01911000001', gender: 'male',   batch_id: b1.id, address: 'ঢাকা, বাংলাদেশ' },
      { name: 'সুমাইয়া খান',  phone: '01811000002', email: 'sumaiya@demo.com', guardian_name: 'মো. খান',    guardian_phone: '01911000002', gender: 'female',  batch_id: b1.id, address: 'চট্টগ্রাম, বাংলাদেশ' },
      { name: 'রাহুল দাস',     phone: '01811000003', email: 'rahul@demo.com',   guardian_name: 'সুনীল দাস',  guardian_phone: '01911000003', gender: 'male',   batch_id: b2.id, address: 'সিলেট, বাংলাদেশ' },
      { name: 'নাদিয়া ইসলাম', phone: '01811000004', email: 'nadia@demo.com',   guardian_name: 'মো. ইসলাম', guardian_phone: '01911000004', gender: 'female',  batch_id: b2.id, address: 'রাজশাহী, বাংলাদেশ' },
      { name: 'তানভীর আহমেদ', phone: '01811000005', email: 'tanvir@demo.com',  guardian_name: 'মো. আহমেদ', guardian_phone: '01911000005', gender: 'male',   batch_id: b3.id, address: 'খুলনা, বাংলাদেশ' },
    ])
    .select('id, name, batch_id');
  if (sErr || !students) throw new Error(sErr?.message ?? 'Students insert failed');

  // ── 4. Fee records — 2 months each (actual schema: no batch_id/due_date) ──
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const fmt = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const month1 = fmt(prevMonth);
  const month2 = fmt(now);
  const paidDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10).toISOString();

  const feeRows: any[] = [];
  for (const s of students) {
    const bFee = s.batch_id === b1.id ? b1.fee : s.batch_id === b2.id ? b2.fee : b3.fee;
    feeRows.push(
      { student_id: s.id, amount: bFee, month: month1, status: 'paid',    payment_date: paidDate },
      { student_id: s.id, amount: bFee, month: month2, status: 'pending' },
    );
  }
  const { error: fErr } = await supabase.from('fees').insert(feeRows);
  if (fErr) throw new Error(fErr.message);

  // ── 5. Exam (actual schema: no status/start_time/end_time/timer_enabled) ──
  const examDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { error: eErr } = await supabase
    .from('exams')
    .insert([{
      title: 'গণিত মডেল টেস্ট ০১',
      subject: 'Mathematics',
      batch_id: b1.id,
      duration_minutes: 30,
      total_marks: 30,
      pass_marks: 18,
      exam_date: examDate.toISOString().split('T')[0],
      type: 'mcq',
      instructions: 'প্রতিটি প্রশ্নের জন্য ৩ নম্বর। কোনো নেগেটিভ মার্কিং নেই।',
    }]);
  if (eErr) throw new Error(eErr.message);

  // ── 6. Notices (actual schema: category not type, no target/batch_id) ──
  const { error: nErr } = await supabase.from('notices').insert([
    { title: 'গণিত মডেল টেস্ট ০১ — ফলাফল প্রকাশিত',   content: 'SSC-2025 গণিত ব্যাচের মডেল টেস্ট ০১ এর ফলাফল প্রকাশিত হয়েছে। অ্যাডমিন প্যানেল থেকে ফলাফল দেখুন।', category: 'general', is_published: true, is_pinned: true  },
    { title: 'এই মাসের ফি পরিশোধের অনুরোধ',             content: 'সকল ছাত্রদের অনুরোধ করা হচ্ছে এই মাসের ফি দ্রুত পরিশোধ করুন। bKash বা Nagad এ পেমেন্ট করা যাবে।',   category: 'general', is_published: true, is_pinned: false },
    { title: 'ঈদ উপলক্ষে বিশেষ ছুটির নোটিশ',           content: 'আগামীকাল থেকে ৩ দিন কোচিং বন্ধ থাকবে। ছুটির পরে স্বাভাবিক সময়সূচিতে ক্লাস শুরু হবে।',              category: 'general', is_published: true, is_pinned: false },
  ]);
  if (nErr) throw new Error(nErr.message);

  // ── 7. Mark done ──────────────────────────────────────────────────────────
  localStorage.setItem(DEMO_KEY, 'true');
}
