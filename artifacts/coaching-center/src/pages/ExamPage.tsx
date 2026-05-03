import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStudentStore } from '@/store/useStudentStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Loader2, BookOpen, AlertTriangle, Trophy, EyeOff, LayoutDashboard } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExamData {
  id: string;
  title: string;
  subject: string;
  batch?: { name: string };
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  instructions?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  timer_enabled?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  marks: number;
  order_num: number;
}

interface Submission {
  id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  time_taken: number;
  rank?: number;
  answers: string;
}

type Step = 'loading' | 'verify' | 'instructions' | 'exam' | 'result' | 'already-submitted' | 'ended';

const OPTS = ['A', 'B', 'C', 'D'] as const;
const MAX_TAB_LEAVES = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseAnswers = (raw: unknown): Record<string, string> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, string>;
  try { return JSON.parse(raw as string); } catch { return {}; }
};

const fmtTime = (s: number) => {
  const m = Math.floor(Math.abs(s) / 60).toString().padStart(2, '0');
  const ss = (Math.abs(s) % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const { settings } = useSettingsStore();

  const [step, setStep] = useState<Step>('loading');
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Verify step
  const [studentIdInput, setStudentIdInput] = useState('');
  const [student, setStudent] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Exam step
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleSubmitRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});
  const submittingRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});

  // Tab leave tracking
  const [tabLeaves, setTabLeaves] = useState(0);
  const tabLeavesRef = useRef(0);

  // Result step
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // ── Load exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId) return;
    const { student: sessionStudent } = useStudentStore.getState();

    Promise.all([
      supabase.from('exams').select('*, batch:batches(name)').eq('id', examId).single(),
      supabase.from('mcq_questions').select('*').eq('exam_id', examId).order('order_num'),
    ]).then(async ([{ data: e }, { data: q }]) => {
      if (!e) { setStep('ended'); return; }
      setExam(e as ExamData);
      const normalised = (q ?? []).map((qq: any) => ({
        ...qq,
        correct_option: (qq.correct_option as string).toUpperCase() as 'A' | 'B' | 'C' | 'D',
      }));
      setQuestions(normalised as Question[]);

      if (e.status === 'ended' && !sessionStudent) { setStep('ended'); return; }

      if (sessionStudent) {
        setStudent(sessionStudent);
        const { data: existing } = await supabase.from('mcq_submissions')
          .select('*').eq('exam_id', examId).eq('student_id', sessionStudent.id).single();
        if (existing) {
          setSubmission(existing as Submission);
          loadLeaderboard();
          setStep('already-submitted');
          return;
        }
        if (e.status === 'ended') { setStep('ended'); return; }

        const saved = localStorage.getItem(`exam-answers-${examId}-${sessionStudent.id}`);
        if (saved) {
          try {
            setAnswers(JSON.parse(saved));
            let secs = (e.duration_minutes ?? 30) * 60;
            if (e.timer_enabled !== false && e.end_time) {
              secs = Math.max(0, Math.floor((new Date(e.end_time).getTime() - Date.now()) / 1000));
            }
            setRemainingSecs(secs);
            setStep('exam');
            return;
          } catch { /* fall through */ }
        }
        setStep('instructions');
        return;
      }

      if (e.status === 'ended') { setStep('ended'); return; }
      setStep('verify');
    });
  }, [examId]);

  // ── Realtime: watch for exam ended ────────────────────────────────────────
  useEffect(() => {
    if (!examId || step !== 'exam') return;
    const ch = supabase.channel(`exam-watch-${examId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exams', filter: `id=eq.${examId}` },
        (payload) => {
          if (payload.new.status === 'ended') {
            toast.error('পরীক্ষার সময় শেষ হয়েছে! স্বয়ংক্রিয়ভাবে জমা হচ্ছে…');
            handleSubmitRef.current(true);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [examId, step]);

  // ── Tab visibility tracking ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam') return;

    const handleVisibility = () => {
      if (document.hidden) {
        const newCount = tabLeavesRef.current + 1;
        tabLeavesRef.current = newCount;
        setTabLeaves(newCount);

        // Save immediately
        localStorage.setItem(`exam-answers-${examId}-${student?.id}`, JSON.stringify(answersRef.current));

        if (newCount >= MAX_TAB_LEAVES) {
          toast.error(`আপনি ${MAX_TAB_LEAVES} বার ট্যাব ছেড়েছেন। পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হচ্ছে!`, { duration: 5000 });
          setTimeout(() => handleSubmitRef.current(true), 800);
        } else {
          const remaining = MAX_TAB_LEAVES - newCount;
          toast.error(
            `⚠ আপনি অন্য ট্যাবে গেছেন! (${newCount}/${MAX_TAB_LEAVES}) — আরও ${remaining} বার গেলে পরীক্ষা জমা হয়ে যাবে।`,
            { duration: 4000, id: 'tab-warning' }
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step, examId, student?.id]);

  // ── Verify Student ────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!studentIdInput.trim()) return;
    setVerifying(true);
    setVerifyError('');

    const { data: s } = await supabase.from('students').select('*')
      .ilike('student_id', studentIdInput.trim()).single();

    if (!s) { setVerifyError('এই Student ID দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি।'); setVerifying(false); return; }
    if (!s.is_approved) {
      setVerifyError('আপনি এখনো অনুমোদিত হননি। Admin এর সাথে যোগাযোগ করুন।');
      setVerifying(false); return;
    }
    if (s.status === 'suspended') {
      setVerifyError('আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে। Admin এর সাথে যোগাযোগ করুন।');
      setVerifying(false); return;
    }

    const { data: freshExam } = await supabase.from('exams').select('status').eq('id', examId).single();
    if (freshExam?.status === 'ended' || freshExam?.status === 'cancelled') {
      setStep('ended'); setVerifying(false); return;
    }

    const { data: existing } = await supabase.from('mcq_submissions')
      .select('*').eq('exam_id', examId).eq('student_id', s.id).single();

    if (existing) {
      setStudent(s);
      setSubmission(existing as Submission);
      loadLeaderboard();
      setStep('already-submitted');
      setVerifying(false);
      return;
    }

    const saved = localStorage.getItem(`exam-answers-${examId}-${s.id}`);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
        let secs = (exam?.duration_minutes ?? 30) * 60;
        if (exam?.timer_enabled !== false && exam?.end_time) {
          secs = Math.max(0, Math.floor((new Date(exam.end_time).getTime() - Date.now()) / 1000));
        }
        setRemainingSecs(secs);
        setStudent(s);
        setVerifying(false);
        setStep('exam');
        return;
      } catch { /* fall through */ }
    }

    setStudent(s);
    setVerifying(false);
    setStep('instructions');
  };

  // ── Start Exam ────────────────────────────────────────────────────────────
  const startExam = () => {
    const saved = localStorage.getItem(`exam-answers-${examId}-${student?.id}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch { /* ignore */ }
    }

    let secs = (exam?.duration_minutes ?? 30) * 60;
    if (exam?.timer_enabled !== false && exam?.end_time) {
      secs = Math.max(0, Math.floor((new Date(exam.end_time).getTime() - Date.now()) / 1000));
    }
    setRemainingSecs(secs);
    setStep('exam');
  };

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam') return;
    if (exam?.timer_enabled === false) return;

    timerRef.current = setInterval(() => {
      setRemainingSecs(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast.error('সময় শেষ! স্বয়ংক্রিয়ভাবে জমা হয়েছে।', { duration: 5000 });
          handleSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // ── Auto-save every 10 seconds ────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam') return;
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem(`exam-answers-${examId}-${student?.id}`, JSON.stringify(answersRef.current));
    }, 10000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [step, examId, student?.id]);

  // ── Keep refs in sync ─────────────────────────────────────────────────────
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { tabLeavesRef.current = tabLeaves; }, [tabLeaves]);

  // ── Warn before tab close / navigation during exam ────────────────────────
  useEffect(() => {
    if (step !== 'exam') return;
    const handler = (e: BeforeUnloadEvent) => {
      localStorage.setItem(`exam-answers-${examId}-${student?.id}`, JSON.stringify(answersRef.current));
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step, examId, student?.id]);

  const selectAnswer = (questionId: string, opt: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: opt }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    setSubmitting(true);
    setSubmitOpen(false);

    const currentAnswers = answersRef.current;

    let correct = 0, wrong = 0, score = 0;
    for (const q of questions) {
      const ans = currentAnswers[q.id];
      if (!ans) continue;
      if (ans === q.correct_option) { correct++; score += q.marks; }
      else wrong++;
    }

    const totalSecs = (exam?.duration_minutes ?? 30) * 60;
    const timeTaken = exam?.timer_enabled === false ? 0 : totalSecs - remainingSecs;

    const { count: higherCount } = await supabase.from('mcq_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId!)
      .or(`score.gt.${score},and(score.eq.${score},time_taken.lt.${timeTaken})`);

    const rank = (higherCount ?? 0) + 1;

    // Store tab_leaves in answers under a special key so admin can see it
    const answersWithMeta = { ...currentAnswers, __tab_leaves: String(tabLeavesRef.current) };

    const { data: sub, error: insertErr } = await supabase.from('mcq_submissions').insert([{
      exam_id: examId,
      student_id: student?.id,
      answers: JSON.stringify(answersWithMeta),
      score,
      correct_count: correct,
      wrong_count: wrong,
      time_taken: timeTaken,
      rank,
      submitted_at: new Date().toISOString(),
    }]).select().single();

    if (insertErr) {
      toast.error('জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      submittingRef.current = false;
      setSubmitting(false);
      // Restart timers so student can retry
      if (exam?.timer_enabled !== false && remainingSecs > 0) {
        timerRef.current = setInterval(() => {
          setRemainingSecs(prev => {
            if (prev <= 1) { clearInterval(timerRef.current!); handleSubmitRef.current(true); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
      return;
    }

    localStorage.removeItem(`exam-answers-${examId}-${student?.id}`);
    setSubmission(sub as Submission);
    setSubmitting(false);
    await loadLeaderboard();
    setStep('result');
  }, [questions, exam, examId, student, remainingSecs]);

  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const loadLeaderboard = async () => {
    const { data } = await supabase.from('mcq_submissions')
      .select('*, student:students(name, student_id)')
      .eq('exam_id', examId!)
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true })
      .limit(5);
    setLeaderboard(data ?? []);
  };

  const unanswered = questions.filter(q => !answers[q.id]).length;
  const timerColor = remainingSecs < 60 ? 'text-red-400' : remainingSecs < 300 ? 'text-amber-400' : 'text-sky-400';

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center">
        <Loader2 size={32} className="text-sky-400 animate-spin" />
      </div>
    );
  }

  // ── Render: Ended ─────────────────────────────────────────────────────────
  if (step === 'ended') {
    const isNotFound = !exam;
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="card p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          {isNotFound ? (
            <>
              <h2 className="font-inter font-bold text-xl text-white">পরীক্ষাটি পাওয়া যায়নি</h2>
              <p className="text-slate-400 text-sm">এই লিঙ্কটি সঠিক নয় অথবা পরীক্ষাটি মুছে ফেলা হয়েছে।</p>
            </>
          ) : (
            <>
              <h2 className="font-inter font-bold text-xl text-white">পরীক্ষা শেষ হয়ে গেছে</h2>
              <div className="space-y-1">
                <p className="text-white font-semibold font-hind">{exam.title}</p>
                {exam.subject && <p className="text-slate-400 text-sm">{exam.subject}</p>}
              </div>
              <p className="text-slate-500 text-sm">এই পরীক্ষার সময় শেষ হয়েছে। আর যোগ দেওয়া সম্ভব নয়।</p>
            </>
          )}
          <div className="flex gap-3 pt-2 justify-center">
            <a href="/portal/exams" className="btn-outline text-sm py-2 px-4">পোর্টালে যান</a>
            <a href="/" className="btn-primary text-sm py-2 px-4">হোমে যান</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Verify ────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center p-4 overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-sky-400" />
            </div>
            <h1 className="font-inter font-black text-xl text-white mb-1">{exam?.title}</h1>
            {exam?.batch?.name && <p className="text-slate-400 text-sm">{exam.batch.name}</p>}
            <p className="text-slate-500 text-xs mt-1">{exam?.duration_minutes} মিনিট · {exam?.total_marks} নম্বর</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">আপনার Student ID লিখুন</label>
              <input
                value={studentIdInput}
                onChange={e => { setStudentIdInput(e.target.value); setVerifyError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                className="input-field text-center font-mono tracking-widest text-lg"
                placeholder="CF250001"
                autoFocus
              />
            </div>
            {verifyError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm text-center">
                {verifyError}
              </motion.p>
            )}
            <button onClick={handleVerify} disabled={verifying || !studentIdInput.trim()} className="btn-primary w-full justify-center">
              {verifying ? <><Loader2 size={15} className="animate-spin" /> যাচাই করা হচ্ছে…</> : 'শুরু করুন'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Instructions ──────────────────────────────────────────────────
  if (step === 'instructions') {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto"
        >
          <h1 className="font-inter font-black text-xl text-white mb-1">{exam?.title}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge-blue">{exam?.subject}</span>
            <span className="badge-yellow">{exam?.duration_minutes} মিনিট</span>
            <span className="text-slate-400 text-xs self-center">{exam?.total_marks} নম্বর · পাস: {exam?.pass_marks}</span>
          </div>

          {exam?.instructions && (
            <div className="card p-4 mb-4">
              <p className="text-slate-300 text-sm font-hind leading-relaxed">{exam.instructions}</p>
            </div>
          )}

          <div className="card p-4 mb-4 space-y-2">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">নিয়মাবলী</p>
            {[
              'পরীক্ষা চলাকালীন পেজ রিফ্রেশ করবেন না',
              'প্রতিটি প্রশ্নে একটি উত্তর দিন',
              'সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে',
              'সব প্রশ্নের উত্তর দেওয়ার চেষ্টা করুন',
              `অন্য ট্যাব বা অ্যাপে ${MAX_TAB_LEAVES} বারের বেশি গেলে পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হবে`,
            ].map((r, i) => (
              <div key={i} className={cn('flex items-start gap-2 text-sm', i === 4 ? 'text-amber-400' : 'text-slate-300')}>
                <span className={cn('mt-0.5', i === 4 ? 'text-amber-400' : 'text-sky-400')}>•</span>
                <span className="font-hind">{r}</span>
              </div>
            ))}
          </div>

          <div className="text-center mb-4 text-slate-400 text-sm">
            স্বাগতম, <span className="text-white font-semibold">{student?.name}</span>
          </div>

          <button onClick={startExam} className="btn-primary w-full justify-center text-base py-3">
            পরীক্ষা শুরু করুন →
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render: Exam Interface ────────────────────────────────────────────────
  if (step === 'exam') {
    const q = questions[currentQ];
    if (!q) return null;
    const answeredCount = Object.keys(answers).filter(k => !k.startsWith('__')).length;
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    return (
      <div className="min-h-dvh bg-navy-900 flex flex-col overflow-x-hidden">
        {/* Full-screen submitting overlay */}
        {submitting && (
          <div className="fixed inset-0 z-[60] bg-navy-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-sky-400 animate-spin" />
            <p className="text-white font-hind text-lg">জমা হচ্ছে…</p>
            <p className="text-slate-400 text-sm">একটু অপেক্ষা করুন</p>
          </div>
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-navy-900/95 backdrop-blur-sm border-b border-navy-700/50 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs truncate">{settings.centerName}</p>
              <p className="text-white text-sm font-semibold truncate">{exam?.title}</p>
            </div>

            {/* Tab leave indicator */}
            {tabLeaves > 0 && (
              <div className="flex items-center gap-1 text-amber-400 text-xs shrink-0">
                <EyeOff size={12} />
                <span>{tabLeaves}/{MAX_TAB_LEAVES}</span>
              </div>
            )}

            {/* Timer */}
            <div className="flex flex-col items-center shrink-0">
              {exam?.timer_enabled === false ? (
                <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12} /> No limit</span>
              ) : (
                <span className={cn('font-inter font-black text-xl tabular-nums transition-colors', timerColor,
                  remainingSecs < 60 && 'animate-pulse')}>
                  {fmtTime(remainingSecs)}
                </span>
              )}
              <span className="text-slate-500 text-[10px]">Q {currentQ + 1}/{questions.length}</span>
            </div>

            <button
              onClick={() => setSubmitOpen(true)}
              disabled={submitting}
              className="btn-primary text-sm py-1.5 px-3 shrink-0"
            >
              জমা দিন
            </button>
          </div>

          {/* Progress bar */}
          <div className="max-w-3xl mx-auto mt-2">
            <div className="h-1 bg-navy-700 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-5 space-y-4">
          <div key={q.id} className="space-y-4">
            {/* Question */}
            <div className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-sky-400/15 text-sky-400 text-sm font-bold flex items-center justify-center">{currentQ + 1}</span>
                  <p className="text-white font-hind text-base sm:text-lg leading-relaxed">{q.question_text}</p>
                </div>
                <span className="badge-blue text-xs shrink-0">{q.marks}m</span>
              </div>

              {/* Options — no left margin on mobile to prevent overflow */}
              <div className="space-y-2">
                {OPTS.filter(opt => !!(q[`option_${opt.toLowerCase()}` as keyof Question] as string)).map(opt => {
                  const key = `option_${opt.toLowerCase()}` as keyof Question;
                  const text = q[key] as string;
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(q.id, opt)}
                      className={cn(
                        'w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 rounded-xl border-2 transition-all text-left',
                        selected
                          ? 'bg-sky-400/15 border-sky-400 text-sky-400'
                          : 'bg-navy-800/50 border-navy-600 text-slate-300 hover:border-sky-400/40 hover:bg-sky-400/5'
                      )}
                    >
                      <span className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold border transition-all',
                        selected ? 'bg-sky-400 border-sky-400 text-navy-900' : 'border-white/20 text-slate-400')}>
                        {opt}
                      </span>
                      <span className="font-hind text-sm sm:text-base">{text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                disabled={currentQ === 0}
                className="btn-outline flex-1 justify-center disabled:opacity-30"
              >
                <ChevronLeft size={16} /> আগে
              </button>
              <button
                onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))}
                disabled={currentQ === questions.length - 1}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                পরে <ChevronRight size={16} />
              </button>
            </div>

            {/* Question grid */}
            <div className="card p-4">
              <p className="text-slate-500 text-xs mb-3">প্রশ্ন নেভিগেশন</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((qq, i) => (
                  <button
                    key={qq.id}
                    onClick={() => setCurrentQ(i)}
                    className={cn(
                      'w-8 h-8 rounded-full text-xs font-bold border-2 transition-all',
                      i === currentQ ? 'bg-sky-400 border-sky-400 text-navy-900' :
                      answers[qq.id] ? 'bg-sky-400/15 border-sky-400/40 text-sky-400' :
                      'border-white/20 text-slate-400 hover:border-white/40'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-2">
                {answeredCount}/{questions.length} উত্তর দেওয়া হয়েছে
                {tabLeaves > 0 && (
                  <span className="ml-3 text-amber-400">⚠ {tabLeaves} বার ট্যাব ছেড়েছেন</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Submit confirm modal */}
        <AnimatePresence>
          {submitOpen && !submitting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setSubmitOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                className="relative card-glass p-6 w-full max-w-sm z-10 text-center"
              >
                {unanswered > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
                    <p className="text-amber-400 text-sm font-hind">⚠ আপনি {unanswered}টি প্রশ্নের উত্তর দেননি।</p>
                  </div>
                )}
                <p className="font-semibold text-white mb-1">আপনি নিশ্চিত?</p>
                <p className="text-slate-400 text-sm mb-5 font-hind">পরীক্ষা জমা দেওয়ার পর আর পরিবর্তন করা যাবে না।</p>
                <div className="flex gap-3">
                  <button onClick={() => setSubmitOpen(false)} className="btn-outline flex-1 justify-center">ফিরে যাই</button>
                  <button
                    onClick={() => handleSubmitRef.current(false)}
                    disabled={submitting}
                    className="btn-primary flex-1 justify-center"
                  >
                    Submit করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Render: Already Submitted ─────────────────────────────────────────────
  if (step === 'already-submitted' && submission) {
    return <ResultView exam={exam!} submission={submission} questions={questions} answers={parseAnswers(submission.answers)} leaderboard={leaderboard} studentId={student?.id} />;
  }

  // ── Render: Result ────────────────────────────────────────────────────────
  if (step === 'result' && submission) {
    return <ResultView exam={exam!} submission={submission} questions={questions} answers={parseAnswers(submission.answers)} leaderboard={leaderboard} studentId={student?.id} />;
  }

  return null;
}

// ── Result View ───────────────────────────────────────────────────────────────
function ResultView({ exam, submission, questions, answers, leaderboard, studentId }: {
  exam: ExamData; submission: Submission; questions: Question[];
  answers: Record<string, string>; leaderboard: any[]; studentId?: string;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { student } = useStudentStore.getState();
  const total = exam.total_marks;
  const score = submission.score;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = score >= exam.pass_marks;
  const rank = submission.rank ?? 0;

  const timeMins = Math.floor((submission.time_taken ?? 0) / 60);
  const timeSecs = (submission.time_taken ?? 0) % 60;

  const unanswered = questions.length - (submission.correct_count ?? 0) - (submission.wrong_count ?? 0);

  const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - (pct / 100) * circumference;

  return (
    <div className={cn(
      'bg-navy-900 px-4 overflow-x-hidden transition-all',
      showBreakdown ? 'min-h-dvh overflow-y-auto py-8' : 'h-dvh overflow-y-hidden py-6'
    )}>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Back to dashboard */}
        <div className="flex items-center justify-between">
          <a href={student ? '/portal/dashboard' : '/portal/exams'}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ChevronLeft size={16} /> ড্যাশবোর্ড
          </a>
          <a href="/portal/exams"
            className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs transition-colors">
            <LayoutDashboard size={13} /> সব পরীক্ষা
          </a>
        </div>

        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8 text-center">
          <div className="text-4xl mb-2">{passed ? '🎉' : '😔'}</div>
          <h2 className="font-inter font-black text-2xl text-white mb-1">
            {passed ? 'অভিনন্দন!' : 'আরও চেষ্টা করুন'}
          </h2>

          <div className="flex justify-center my-6">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
                <motion.circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={passed ? '#34d399' : '#f87171'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeDash }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('font-inter font-black text-3xl', passed ? 'text-emerald-400' : 'text-red-400')}>{pct}%</span>
                <span className="text-slate-400 text-xs">{score}/{total}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card p-3">
              <p className="text-emerald-400 font-bold text-xl">{submission.correct_count}</p>
              <p className="text-slate-500 text-xs">সঠিক</p>
            </div>
            <div className="card p-3">
              <p className="text-red-400 font-bold text-xl">{submission.wrong_count}</p>
              <p className="text-slate-500 text-xs">ভুল</p>
            </div>
            <div className="card p-3">
              <p className="text-slate-400 font-bold text-xl">{unanswered}</p>
              <p className="text-slate-500 text-xs">উত্তর নেই</p>
            </div>
          </div>

          {submission.time_taken > 0 && (
            <p className="text-slate-400 text-sm mb-3">সময় নিয়েছেন: <span className="text-white">{timeMins}m {timeSecs}s</span></p>
          )}

          {rank > 0 && (
            <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full border',
              rank === 1 ? 'border-amber-400/40 bg-amber-400/10 text-amber-400' :
              rank === 2 ? 'border-slate-400/40 bg-slate-400/10 text-slate-300' :
              rank === 3 ? 'border-amber-700/40 bg-amber-700/10 text-amber-600' :
              'border-white/15 bg-white/5 text-white')}>
              <span className="text-xl">{RANK_ICONS[rank] ?? '🏅'}</span>
              <span className="font-inter font-bold">আপনার র‍্যাংক: #{rank}</span>
            </div>
          )}
        </motion.div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-navy-700/50 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <h3 className="font-semibold text-white text-sm">Top 5 Leaderboard</h3>
            </div>
            <div className="divide-y divide-navy-700/30">
              {leaderboard.map((s, i) => {
                const isMe = s.student_id === studentId;
                const lRank = i + 1;
                return (
                  <div key={s.id} className={cn('flex items-center gap-3 px-4 py-3',
                    isMe && 'bg-sky-400/5 border-l-2 border-sky-400')}>
                    <span className="w-7 text-center">
                      {RANK_ICONS[lRank] ?? <span className="text-slate-500 text-sm font-mono">#{lRank}</span>}
                    </span>
                    <span className={cn('flex-1 text-sm', isMe ? 'text-white font-semibold' : 'text-slate-300')}>
                      {s.student?.name ?? '—'} {isMe && <span className="text-sky-400 text-xs">(আপনি)</span>}
                    </span>
                    <span className="font-inter font-bold text-white text-sm">{s.score}/{exam.total_marks}</span>
                    <span className="text-slate-500 text-xs">{Math.floor(s.time_taken / 60)}m{s.time_taken % 60}s</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Answer breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button onClick={() => setShowBreakdown(v => !v)} className="btn-outline w-full justify-center text-sm">
            {showBreakdown ? 'বিস্তারিত বন্ধ করুন' : 'বিস্তারিত দেখুন (প্রশ্নভিত্তিক)'}
          </button>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 mt-4 overflow-hidden">
                {questions.map((q, i) => {
                  const studentAns = answers[q.id] ?? null;
                  const correct = q.correct_option;
                  const isRight = studentAns === correct;
                  return (
                    <div key={q.id} className={cn('card p-4 border', isRight ? 'border-emerald-400/20' : studentAns ? 'border-red-400/20' : 'border-white/5')}>
                      <div className="flex items-start gap-2 mb-3">
                        <span className="shrink-0 mt-0.5">
                          {!studentAns ? <span className="text-slate-500 text-sm">–</span> :
                           isRight ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                           <XCircle size={16} className="text-red-400" />}
                        </span>
                        <div>
                          <p className="text-slate-400 text-xs">Q{i + 1} · {q.marks} marks</p>
                          <p className="text-white text-sm font-hind mt-0.5">{q.question_text}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        {OPTS.map(o => {
                          const key = `option_${o.toLowerCase()}` as keyof Question;
                          const optText = q[key] as string;
                          const isSelected = studentAns === o;
                          const isCorrect = correct === o;
                          return (
                            <div key={o} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border',
                              isCorrect && isSelected ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400' :
                              isSelected ? 'bg-red-400/15 border-red-400/40 text-red-400' :
                              isCorrect ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400/70' :
                              'border-white/5 text-slate-500')}>
                              <span className="font-bold w-4">{o}.</span>
                              <span className="font-hind truncate">{optText}</span>
                              {isCorrect && !isSelected && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
