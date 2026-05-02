import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useStudentStore } from '@/store/useStudentStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDate, cn } from '@/lib/utils';
import { Trophy, Award, BarChart2, X, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

interface Submission {
  id: string;
  exam_id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  time_taken?: number;
  rank?: number;
  submitted_at: string;
  answers?: Record<string, string>;
  exam?: { title: string; subject: string; total_marks: number; pass_marks: number };
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
  order_num: number;
}

const GRADE = (pct: number) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
const fmtTime = (s?: number) => !s ? '—' : `${Math.floor(s/60)}m ${s%60}s`;

export default function PortalResultsPage() {
  const { student } = useStudentStore();
  const { settings } = useSettingsStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<{ sub: Submission; questions: Question[] } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    supabase.from('mcq_submissions')
      .select('*, exam:exams(title,subject,total_marks,pass_marks)')
      .eq('student_id', student.id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setSubmissions((data ?? []) as Submission[]); setLoading(false); });
  }, [student]);

  const openBreakdown = async (sub: Submission) => {
    setBreakdownLoading(true);
    const { data: qs } = await supabase.from('mcq_questions').select('*').eq('exam_id', sub.exam_id).order('order_num');
    setBreakdown({ sub, questions: (qs ?? []) as Question[] });
    setBreakdownLoading(false);
  };

  const downloadResultCard = (sub: Submission) => {
    const total = sub.exam?.total_marks ?? 100;
    const pct = Math.round((sub.score / total) * 100);
    const grade = GRADE(pct);
    const pass = sub.score >= (sub.exam?.pass_marks ?? 0);

    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    doc.setFillColor(11, 17, 32); doc.rect(0, 0, 148, 210, 'F');
    // Header bar
    doc.setFillColor(56, 189, 248); doc.rect(0, 0, 148, 18, 'F');
    doc.setTextColor(11, 17, 32); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(settings.centerName.toUpperCase(), 74, 12, { align: 'center' });
    // Title
    doc.setTextColor(248, 250, 252); doc.setFontSize(10);
    doc.text('RESULT CARD', 74, 28, { align: 'center' });
    doc.setDrawColor(30, 41, 59); doc.line(15, 32, 133, 32);
    // Score ring area
    doc.setFontSize(32); doc.setFont('helvetica', 'bold');
    doc.setTextColor(pct >= 60 ? 52 : 239, pct >= 60 ? 211 : 68, pct >= 60 ? 153 : 68);
    doc.text(`${pct}%`, 74, 60, { align: 'center' });
    doc.setFontSize(14); doc.setTextColor(167, 139, 250);
    doc.text(`Grade: ${grade}`, 74, 72, { align: 'center' });
    // Details
    doc.setDrawColor(30, 41, 59); doc.line(15, 78, 133, 78);
    const rows = [
      ['Student', student?.name ?? ''],
      ['Student ID', student?.student_id ?? ''],
      ['Exam', sub.exam?.title ?? ''],
      ['Subject', sub.exam?.subject ?? ''],
      ['Score', `${sub.score} / ${total}`],
      ['Correct', String(sub.correct_count ?? '—')],
      ['Wrong', String(sub.wrong_count ?? '—')],
      ['Time', fmtTime(sub.time_taken)],
      ['Rank', sub.rank ? `#${sub.rank}` : '—'],
      ['Date', formatDate(sub.submitted_at)],
    ];
    let y = 90;
    rows.forEach(([k, v]) => {
      doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(k, 18, y);
      doc.setTextColor(248, 250, 252); doc.setFontSize(9); doc.text(String(v), 75, y);
      y += 9;
    });
    // Pass/Fail stamp
    doc.setDrawColor(30, 41, 59); doc.line(15, y + 2, 133, y + 2);
    if (pass) { doc.setTextColor(52, 211, 153); } else { doc.setTextColor(239, 68, 68); }
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(pass ? '✓ PASSED' : '✗ FAILED', 74, y + 14, { align: 'center' });
    doc.save(`result_${sub.exam_id.slice(-6)}_${student?.student_id}.pdf`);
  };

  const totalExams = submissions.length;
  const passed = submissions.filter(s => s.score >= (s.exam?.pass_marks ?? 0)).length;
  const avgPct = totalExams > 0 ? Math.round(submissions.reduce((a, s) => a + (s.score / (s.exam?.total_marks ?? 100)) * 100, 0) / totalExams) : 0;

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-xl text-white mb-5 font-hind flex items-center gap-2">
        <Trophy size={20} className="text-violet-400" /> আমার ফলাফল
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'মোট পরীক্ষা', value: totalExams, icon: BarChart2, color: 'text-sky-400', bg: 'bg-sky-400/10' },
          { label: 'পাস', value: passed, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'গড় স্কোর', value: `${avgPct}%`, icon: Trophy, color: 'text-violet-400', bg: 'bg-violet-400/10' },
        ].map(s => (
          <div key={s.label} className="card p-3 flex items-center gap-2">
            <div className={cn('p-2 rounded-xl shrink-0', s.bg)}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className={cn('font-inter font-bold', s.color)}>{s.value}</p>
              <p className="text-slate-500 text-xs font-hind truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-sky-400" /></div>
      ) : submissions.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-slate-500 font-hind">কোনো পরীক্ষার ফলাফল নেই</p></div>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => {
            const total = s.exam?.total_marks ?? 100;
            const pct = Math.round((s.score / total) * 100);
            const pass = s.score >= (s.exam?.pass_marks ?? 0);
            const grade = GRADE(pct);
            const isExpanded = expandedId === s.id;

            return (
              <div key={s.id} className="card overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-inter font-bold',
                    pass ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400')}>
                    {grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm font-hind">{s.exam?.title}</h3>
                    <p className="text-slate-400 text-xs">{s.exam?.subject} · {formatDate(s.submitted_at)}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={cn('font-inter font-bold text-sm', pass ? 'text-emerald-400' : 'text-red-400')}>
                        {s.score}/{total}
                        <span className="text-xs text-slate-500 font-normal ml-1">({pct}%)</span>
                      </span>
                      {s.rank && <span className="font-mono text-violet-400 text-xs">#{s.rank}</span>}
                      <span className="text-slate-500 text-xs flex items-center gap-1">⏱ {fmtTime(s.time_taken)}</span>
                      <span className="text-emerald-400 text-xs">{s.correct_count ?? '?'} correct</span>
                      <span className="text-red-400 text-xs">{s.wrong_count ?? '?'} wrong</span>
                    </div>
                    {/* Score bar */}
                    <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mt-2">
                      <div className={cn('h-full rounded-full transition-all', pass ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-red-500')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => downloadResultCard(s)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 transition-colors" title="Download">
                      <Download size={14} />
                    </button>
                    <button onClick={() => { openBreakdown(s); }} className="p-1.5 rounded-lg hover:bg-violet-500/15 text-slate-400 hover:text-violet-400 transition-colors" title="Breakdown">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Breakdown Modal */}
      <AnimatePresence>
        {(breakdown || breakdownLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBreakdown(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative card-glass w-full max-w-lg z-10 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                <h2 className="font-inter font-bold text-white text-sm">উত্তর বিশ্লেষণ</h2>
                <button onClick={() => setBreakdown(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-3">
                {breakdownLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-sky-400" /></div>
                ) : breakdown ? breakdown.questions.map((q, i) => {
                  const studentAns = breakdown.sub.answers?.[q.id];
                  const isCorrect = studentAns === q.correct_option;
                  const opts: Record<string, string> = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
                  return (
                    <div key={q.id} className={cn('rounded-xl p-3 border', isCorrect ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-red-400/5 border-red-400/20')}>
                      <p className="text-white text-sm font-medium mb-2 font-hind">
                        <span className="text-slate-500 mr-2">Q{i + 1}.</span>{q.question_text}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(opts).filter(([, v]) => v).map(([k, v]) => {
                          const isStudentChoice = studentAns === k;
                          const isCorrectChoice = q.correct_option === k;
                          return (
                            <div key={k} className={cn('rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5',
                              isCorrectChoice ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' :
                              isStudentChoice && !isCorrect ? 'bg-red-400/20 text-red-400 border border-red-400/30' :
                              'bg-white/5 text-slate-500')}>
                              <span className="uppercase font-bold shrink-0">{k}</span>
                              <span className="truncate font-hind">{v}</span>
                              {isStudentChoice && <span className="ml-auto shrink-0">{isCorrect ? '✓' : '✗'}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {!studentAns && <p className="text-slate-500 text-xs mt-1 font-hind">উত্তর দেননি</p>}
                    </div>
                  );
                }) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
