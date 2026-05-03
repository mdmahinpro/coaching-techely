import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download, Database, AlertTriangle, Upload, Info, CheckCircle2, Clock, Loader2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const BACKUP_KEY = 'coaching-backup-history';
const TABLES = [
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'batches', label: 'Batches' },
  { key: 'fees', label: 'Fee Records' },
  { key: 'exams', label: 'Exams' },
  { key: 'mcq_questions', label: 'MCQ Questions' },
  { key: 'mcq_submissions', label: 'MCQ Submissions' },
  { key: 'notices', label: 'Notices' },
  { key: 'sms_logs', label: 'SMS Logs' },
  { key: 'admission_requests', label: 'Admission Requests' },
  { key: 'site_settings', label: 'Site Settings' },
] as const;

// Each group defines what tables it will DELETE (in safe FK order)
const RESET_GROUPS = [
  {
    id: 'admissions',
    label: 'ভর্তি আবেদন',
    labelEn: 'Admission Requests',
    icon: '📋',
    description: 'সব ভর্তি আবেদন মুছবে',
    tables: ['admission_requests'],
  },
  {
    id: 'sms',
    label: 'SMS লগ',
    labelEn: 'SMS Logs',
    icon: '📱',
    description: 'সব SMS ইতিহাস মুছবে',
    tables: ['sms_logs'],
  },
  {
    id: 'notices',
    label: 'নোটিশ',
    labelEn: 'Notices',
    icon: '📢',
    description: 'সব নোটিশ মুছবে',
    tables: ['notices'],
  },
  {
    id: 'exams',
    label: 'পরীক্ষা ও প্রশ্নপত্র',
    labelEn: 'Exams + Questions + Submissions',
    icon: '📝',
    description: 'সব পরীক্ষা, প্রশ্ন ও সাবমিশন মুছবে',
    tables: ['mcq_submissions', 'mcq_questions', 'exams'],
  },
  {
    id: 'fees',
    label: 'ফি রেকর্ড',
    labelEn: 'Fee Records',
    icon: '💰',
    description: 'সব ফি পেমেন্ট রেকর্ড মুছবে',
    tables: ['fees'],
  },
  {
    id: 'students',
    label: 'শিক্ষার্থী',
    labelEn: 'Students',
    icon: '👨‍🎓',
    description: 'সব শিক্ষার্থী মুছবে (ফি মুছতে হবে আগে)',
    tables: ['students'],
    requiresFirst: ['fees'],
  },
  {
    id: 'teachers',
    label: 'শিক্ষক',
    labelEn: 'Teachers',
    icon: '👨‍🏫',
    description: 'সব শিক্ষক মুছবে',
    tables: ['teachers'],
  },
  {
    id: 'batches',
    label: 'ব্যাচ',
    labelEn: 'Batches',
    icon: '🗂️',
    description: 'সব ব্যাচ মুছবে (শিক্ষার্থী মুছতে হবে আগে)',
    tables: ['batches'],
    requiresFirst: ['students', 'fees', 'exams'],
  },
] as const;

type GroupId = typeof RESET_GROUPS[number]['id'];
type StepState = 'pending' | 'running' | 'done' | 'skip';
interface Step { label: string; state: StepState }

const fmtFileName = (institute: string) => {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`;
  const safe = (institute || 'Backup').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `backup_${safe}_${date}_${time}.json`;
};

export default function BackupPage() {
  const [backing, setBacking] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);
  const [restoreData, setRestoreData] = useState<any | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset panel state
  const [selected, setSelected] = useState<Set<GroupId>>(new Set());
  const [resetConfirm, setResetConfirm] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);
  const [resetLog, setResetLog] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(BACKUP_KEY);
    if (stored) { try { setHistory(JSON.parse(stored)); } catch { /* ignore */ } }
  }, []);

  const saveHistory = (date: string) => {
    const next = [date, ...history].slice(0, 5);
    setHistory(next);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
  };

  const setStep = (idx: number, state: StepState) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, state } : s));

  const handleBackup = async () => {
    setBacking(true);
    const initSteps: Step[] = [
      ...TABLES.map(t => ({ label: `Fetching ${t.label}…`, state: 'pending' as StepState })),
      { label: 'Preparing backup file…', state: 'pending' },
    ];
    setSteps(initSteps);

    const backup: Record<string, unknown[]> = {};
    let totalRecords = 0;

    for (let i = 0; i < TABLES.length; i++) {
      setStep(i, 'running');
      await new Promise(r => setTimeout(r, 80));
      const { data, error } = await supabase.from(TABLES[i].key).select('*');
      if (error) {
        setStep(i, 'skip');
      } else {
        backup[TABLES[i].key] = data ?? [];
        totalRecords += (data ?? []).length;
        setStep(i, 'done');
      }
    }

    const lastIdx = TABLES.length;
    setStep(lastIdx, 'running');
    await new Promise(r => setTimeout(r, 100));

    const { data: settings } = await supabase.from('site_settings').select('key,value').eq('key', 'institute_name').single();
    const instituteName = settings?.value ?? 'CoachingCenter';

    const payload = {
      backup_version: '1.0',
      backup_date: new Date().toISOString(),
      institute: instituteName,
      tables: backup,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fmtFileName(instituteName);
    a.click();
    URL.revokeObjectURL(url);

    setStep(lastIdx, 'done');
    const dateStr = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    saveHistory(dateStr);
    toast.success(`✅ ব্যাকআপ সফল! ${totalRecords} records saved`);
    setBacking(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreSummary(null);
    setRestoreData(null);
    setConfirmStep(0);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.backup_version || !parsed.tables) { toast.error('Invalid backup file format'); return; }
      setRestoreData(parsed);
      const summary: Record<string, number> = {};
      for (const [key, rows] of Object.entries(parsed.tables)) {
        if (Array.isArray(rows)) summary[key] = rows.length;
      }
      setRestoreSummary(summary);
    } catch { toast.error('Could not parse backup file'); }
  };

  const handleRestore = async () => {
    if (!restoreData?.tables) return;
    setRestoring(true);
    let totalRestored = 0;
    const RESTORE_ORDER = [
      'site_settings', 'batches', 'teachers', 'students',
      'fees', 'notices', 'exams', 'mcq_questions',
      'mcq_submissions', 'sms_logs', 'admission_requests',
    ];
    const processed = new Set<string>();
    for (const tableName of RESTORE_ORDER) {
      const rows = (restoreData.tables as any)[tableName];
      if (!Array.isArray(rows) || rows.length === 0) { processed.add(tableName); continue; }
      const { error } = await supabase.from(tableName as any).upsert(rows as any[], { onConflict: 'id', ignoreDuplicates: false });
      if (!error) totalRestored += rows.length;
      processed.add(tableName);
    }
    for (const [table, rows] of Object.entries(restoreData.tables)) {
      if (processed.has(table)) continue;
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const { error } = await supabase.from(table as any).upsert(rows as any[], { onConflict: 'id', ignoreDuplicates: false });
      if (!error) totalRestored += (rows as any[]).length;
    }
    toast.success(`✅ Restore complete! ${totalRestored} records restored`);
    setRestoring(false);
    setConfirmStep(0);
    setRestoreFile(null);
    setRestoreSummary(null);
    setRestoreData(null);
  };

  const toggleGroup = (id: GroupId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setResetConfirm(0);
    setResetLog([]);
  };

  const handleReset = async () => {
    if (selected.size === 0) return;
    setResetting(true);
    setResetLog([]);

    // Collect all tables to delete in safe FK order
    // Fixed deletion order regardless of group selection
    const SAFE_ORDER: string[] = [
      'sms_logs',
      'admission_requests',
      'notices',
      'mcq_submissions',
      'mcq_questions',
      'exams',
      'fees',
      'students',
      'teachers',
      'batches',
    ];

    const tablesToDelete = new Set<string>();
    for (const group of RESET_GROUPS) {
      if (selected.has(group.id)) {
        group.tables.forEach(t => tablesToDelete.add(t));
      }
    }

    const log: string[] = [];
    for (const table of SAFE_ORDER) {
      if (!tablesToDelete.has(table)) continue;
      const { error, count } = await supabase.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        log.push(`❌ ${table}: ${error.message}`);
      } else {
        log.push(`✅ ${table} মুছে ফেলা হয়েছে`);
      }
      setResetLog([...log]);
      await new Promise(r => setTimeout(r, 120));
    }

    setResetting(false);
    setResetConfirm(0);
    setSelected(new Set());
    toast.success('✅ নির্বাচিত ডেটা মুছে ফেলা হয়েছে');
  };

  const stepIcon = (state: StepState) => {
    if (state === 'done') return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    if (state === 'running') return <Loader2 size={14} className="text-sky-400 animate-spin shrink-0" />;
    if (state === 'skip') return <span className="text-slate-500 text-xs shrink-0">—</span>;
    return <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />;
  };

  return (
    <AdminLayout title="ব্যাকআপ ও রিস্টোর">
      <div className="max-w-2xl space-y-6">

        {/* ── Main Backup Button ── */}
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
            <Database size={28} className="text-sky-400" />
          </div>
          <h2 className="font-inter font-black text-2xl text-white mb-2">সম্পূর্ণ ডেটা ব্যাকআপ</h2>
          <p className="text-slate-400 text-sm mb-6">সকল টেবিল থেকে ডেটা সংগ্রহ করে একটি JSON ফাইলে সংরক্ষণ করুন।</p>
          <button onClick={handleBackup} disabled={backing} className="btn-primary text-base px-8 py-3 mx-auto">
            {backing ? <><Loader2 size={16} className="animate-spin" /> ব্যাকআপ চলছে…</> : <><Download size={16} /> সম্পূর্ণ ডেটা ব্যাকআপ করুন</>}
          </button>

          <AnimatePresence>
            {steps.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 text-left space-y-1.5 overflow-hidden">
                {steps.map((s, i) => (
                  <div key={i} className={cn('flex items-center gap-2 text-sm transition-colors',
                    s.state === 'done' ? 'text-emerald-400' : s.state === 'running' ? 'text-sky-400' : s.state === 'skip' ? 'text-slate-600' : 'text-slate-600')}>
                    {stepIcon(s.state)}
                    <span>{s.state === 'done' ? s.label.replace('Fetching', 'Fetched').replace('Preparing', 'Prepared') : s.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Backup History ── */}
        {history.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-3">
              <Clock size={15} className="text-slate-400" /> Backup History
            </h3>
            <div className="space-y-2">
              {history.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  শেষ ব্যাকআপ: {d}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Restore Section ── */}
        <div className="card p-6 space-y-4">
          <h3 className="font-inter font-bold text-white flex items-center gap-2">
            <Upload size={16} className="text-violet-400" /> রিস্টোর
          </h3>
          <p className="text-slate-400 text-sm">একটি পূর্ববর্তী ব্যাকআপ ফাইল আপলোড করুন এবং ডেটা পুনরুদ্ধার করুন।</p>

          <button onClick={() => fileRef.current?.click()} className="btn-outline text-sm w-full justify-center">
            <Upload size={14} /> {restoreFile ? restoreFile.name : 'backup.json ফাইল বাছাই করুন'}
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

          <AnimatePresence>
            {restoreSummary && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Backup Contents</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(restoreSummary).filter(([,v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-slate-300">
                      <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-sky-400 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs pt-1">Backup date: {restoreData?.backup_date ? new Date(restoreData.backup_date).toLocaleString() : '—'}</p>

                {confirmStep === 0 && (
                  <button onClick={() => setConfirmStep(1)} className="btn-danger w-full justify-center text-sm mt-2">
                    Restore Data
                  </button>
                )}
                {confirmStep === 1 && (
                  <div className="card p-3 border border-amber-400/20 space-y-2">
                    <p className="text-amber-400 text-sm font-semibold">⚠ এটি বর্তমান ডেটা মুছে ফেলবে। নিশ্চিত?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmStep(0)} className="btn-outline text-sm flex-1 justify-center py-1.5">বাতিল</button>
                      <button onClick={() => setConfirmStep(2)} className="btn-danger text-sm flex-1 justify-center py-1.5">হ্যাঁ, নিশ্চিত</button>
                    </div>
                  </div>
                )}
                {confirmStep === 2 && (
                  <div className="card p-3 border border-red-400/30 space-y-2">
                    <p className="text-red-400 text-sm font-semibold">আবার নিশ্চিত করুন — এই কাজ পূর্বাবস্থায় ফেরানো যাবে না</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmStep(0)} className="btn-outline text-sm flex-1 justify-center py-1.5">বাতিল</button>
                      <button onClick={handleRestore} disabled={restoring} className="btn-danger text-sm flex-1 justify-center py-1.5">
                        {restoring ? <><Loader2 size={13} className="animate-spin" /> Restoring…</> : 'Restore করুন'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── DEMO DATA RESET / SETUP WIZARD ── */}
        <div className="card p-6 space-y-5 border border-red-500/20">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-inter font-bold text-white">ডেমো ডেটা মুছুন</h3>
              <p className="text-slate-400 text-sm mt-0.5 font-hind">
                প্রথমবার সেটআপের সময় ডেমো ডেটা মুছে নিজের আসল ডেটা দিয়ে শুরু করুন।
                চার্ট ও রিপোর্ট সঠিক তথ্য দেখাবে।
              </p>
            </div>
          </div>

          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs font-hind leading-relaxed">
              <strong>সতর্কতা:</strong> এই কাজ পূর্বাবস্থায় ফেরানো যাবে না। মুছার আগে উপরের ব্যাকআপ বাটন দিয়ে ডেটা সেভ করুন।
            </p>
          </div>

          {/* Category checkboxes */}
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">কোন ডেটা মুছবেন?</p>
            <div className="grid grid-cols-1 gap-2">
              {RESET_GROUPS.map(group => (
                <label key={group.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    selected.has(group.id)
                      ? 'border-red-400/40 bg-red-500/10'
                      : 'border-white/8 bg-navy-800/30 hover:border-white/15'
                  )}>
                  <input
                    type="checkbox"
                    checked={selected.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="w-4 h-4 accent-red-400 shrink-0"
                  />
                  <span className="text-lg shrink-0">{group.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', selected.has(group.id) ? 'text-red-300' : 'text-white')}>
                      {group.label}
                    </p>
                    <p className="text-xs text-slate-500 font-hind">{group.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Select all / none */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setSelected(new Set(RESET_GROUPS.map(g => g.id))); setResetConfirm(0); setResetLog([]); }}
                className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2">
                সব নির্বাচন করুন
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() => { setSelected(new Set()); setResetConfirm(0); setResetLog([]); }}
                className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2">
                সব বাতিল করুন
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-red-400 ml-auto">{selected.size}টি বিভাগ নির্বাচিত</span>
              )}
            </div>
          </div>

          {/* Action button + confirmation */}
          <AnimatePresence mode="wait">
            {selected.size === 0 ? null : resetConfirm === 0 ? (
              <motion.button
                key="step0"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onClick={() => setResetConfirm(1)}
                className="btn-danger w-full justify-center py-3 text-sm">
                <Trash2 size={14} /> নির্বাচিত ডেটা মুছুন
              </motion.button>
            ) : resetConfirm === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="card p-4 border border-amber-400/25 space-y-3">
                <p className="text-amber-300 text-sm font-semibold font-hind">
                  ⚠ নিশ্চিত? এই {selected.size}টি বিভাগের সব ডেটা স্থায়ীভাবে মুছে যাবে।
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setResetConfirm(0)} className="btn-outline text-sm flex-1 justify-center py-2">বাতিল</button>
                  <button onClick={() => setResetConfirm(2)} className="btn-danger text-sm flex-1 justify-center py-2">হ্যাঁ, মুছুন</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="card p-4 border border-red-400/30 space-y-3">
                <p className="text-red-400 text-sm font-semibold font-hind">
                  🔴 চূড়ান্ত নিশ্চিতকরণ — এই কাজ পূর্বাবস্থায় ফেরানো যাবে না
                </p>
                {resetLog.length > 0 && (
                  <div className="space-y-1 text-xs font-mono bg-navy-900/60 p-3 rounded-lg max-h-32 overflow-y-auto">
                    {resetLog.map((line, i) => (
                      <p key={i} className={line.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}>{line}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setResetConfirm(0)} disabled={resetting} className="btn-outline text-sm flex-1 justify-center py-2">বাতিল</button>
                  <button onClick={handleReset} disabled={resetting} className="btn-danger text-sm flex-1 justify-center py-2">
                    {resetting ? <><Loader2 size={13} className="animate-spin" /> মুছছে…</> : '🗑 চূড়ান্তভাবে মুছুন'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Info note ── */}
        <div className="card-glass p-4 border border-sky-400/10 flex items-start gap-3">
          <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
          <p className="text-slate-400 text-sm leading-relaxed font-hind">
            ℹ️ এই ব্যাকআপ ফাইলটি ভবিষ্যতে নতুন ফিচার যোগ হলেও কাজ করবে।
            নতুন ফিচারের ডেটা পুরোনো ব্যাকআপে থাকবে না, তবে পুরোনো ডেটা নিরাপদ থাকবে।
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
