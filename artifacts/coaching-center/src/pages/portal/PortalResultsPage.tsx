import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart2, Award } from 'lucide-react';

export default function PortalResultsPage() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('results')
      .select('*, exam:exams(title,total_marks,pass_marks,subject)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setResults(data ?? []); setLoading(false); });
  }, [user]);

  const passed = results.filter(r => r.marks_obtained >= (r.exam?.pass_marks ?? 0)).length;
  const avg = results.length > 0
    ? Math.round(results.reduce((a, r) => a + (r.marks_obtained / (r.exam?.total_marks ?? 100)) * 100, 0) / results.length)
    : 0;

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-2xl text-white mb-6">My Results</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: BarChart2, label: 'Total Exams', value: results.length, color: 'text-sky-400', bg: 'bg-sky-500/15' },
          { icon: Award, label: 'Passed', value: passed, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          { icon: BarChart2, label: 'Avg Score', value: `${avg}%`, color: 'text-violet-400', bg: 'bg-violet-500/15' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="font-inter font-bold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : results.length === 0 ? (
        <EmptyState title="No results yet" description="Your exam results will appear here once published." icon={<Award size={48} strokeWidth={1.2} />} />
      ) : (
        <div className="space-y-3">
          {results.map(r => {
            const pct = Math.round((r.marks_obtained / (r.exam?.total_marks ?? 100)) * 100);
            const pass = r.marks_obtained >= (r.exam?.pass_marks ?? 0);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{r.exam?.title ?? 'Exam'}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{r.exam?.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={r.grade === 'F' ? 'badge-red' : r.grade?.startsWith('A') ? 'badge-green' : 'badge-yellow'}>{r.grade ?? '—'}</span>
                    <p className="text-xs text-slate-500 mt-1">{pass ? '✓ Pass' : '✗ Fail'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pass ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-white shrink-0">{r.marks_obtained}/{r.exam?.total_marks ?? '?'} ({pct}%)</span>
                </div>
                {r.remarks && <p className="text-xs text-slate-500 mt-2">{r.remarks}</p>}
              </div>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}
