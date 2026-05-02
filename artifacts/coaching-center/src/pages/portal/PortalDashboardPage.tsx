import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, FileText, Bell, BookOpen } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { motion } from 'framer-motion';

export default function PortalDashboardPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any>(null);
  const [pendingFees, setPendingFees] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const name = user?.user_metadata?.name ?? user?.email ?? 'Student';

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [s, f, e, n] = await Promise.all([
        supabase.from('students').select('*, batch:batches(name,subject,schedule)').eq('email', user.email!).single(),
        supabase.from('fees').select('amount').eq('status', 'pending').eq('student_id', user.id),
        supabase.from('exams').select('*').gte('exam_date', new Date().toISOString()).order('exam_date').limit(3),
        supabase.from('notices').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
      ]);
      setStudent(s.data);
      setPendingFees((f.data ?? []).reduce((a: number, r: any) => a + r.amount, 0));
      setUpcomingExams(e.data ?? []);
      setNotices(n.data ?? []);
    };
    load();
  }, [user]);

  return (
    <PortalLayout>
      <AnimatedSection>
        <h1 className="font-inter font-black text-2xl text-white mb-1">
          Welcome back, <span className="text-gradient">{name}</span>!
        </h1>
        <p className="text-slate-400 text-sm mb-6">Here's your academic overview.</p>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BookOpen, label: 'Batch', value: student?.batch?.name ?? 'Not enrolled', color: 'text-sky-400', bg: 'bg-sky-500/15' },
          { icon: DollarSign, label: 'Pending Fees', value: formatCurrency(pendingFees), color: 'text-amber-400', bg: 'bg-amber-500/15' },
          { icon: FileText, label: 'Upcoming Exams', value: upcomingExams.length, color: 'text-violet-400', bg: 'bg-violet-500/15' },
          { icon: Bell, label: 'Notices', value: notices.length, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-slate-400 text-xs mb-0.5">{s.label}</p>
            <p className="font-inter font-bold text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedSection className="card p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><FileText size={16} className="text-violet-400" /> Upcoming Exams</h2>
          {upcomingExams.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No upcoming exams</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-700/50">
                  <div>
                    <p className="font-medium text-white text-sm">{e.title}</p>
                    <p className="text-xs text-slate-400">{e.subject} · {e.total_marks} marks</p>
                  </div>
                  <span className="badge-violet text-xs">{formatDate(e.exam_date)}</span>
                </div>
              ))}
            </div>
          )}
        </AnimatedSection>

        <AnimatedSection delay={100} className="card p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Bell size={16} className="text-sky-400" /> Recent Notices</h2>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No notices</p>
          ) : (
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n.id} className="p-3 rounded-lg bg-navy-700/50">
                  <p className="font-medium text-white text-sm">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </AnimatedSection>
      </div>
    </PortalLayout>
  );
}
