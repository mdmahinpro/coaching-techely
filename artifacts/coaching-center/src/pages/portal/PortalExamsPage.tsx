import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText, Calendar } from 'lucide-react';

export default function PortalExamsPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: student } = await supabase.from('students').select('batch_id').eq('email', user.email!).single();
      let q = supabase.from('exams').select('*').order('exam_date', { ascending: false });
      if (student?.batch_id) q = q.or(`batch_id.eq.${student.batch_id},batch_id.is.null`);
      const { data } = await q;
      setExams(data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const upcoming = exams.filter(e => new Date(e.exam_date) >= new Date());
  const past = exams.filter(e => new Date(e.exam_date) < new Date());

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-2xl text-white mb-6">Exams</h1>
      {loading ? <LoadingSkeleton rows={4} /> : exams.length === 0 ? (
        <EmptyState title="No exams scheduled" icon={<FileText size={48} strokeWidth={1.2} />} />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-semibold text-sky-400 mb-3 flex items-center gap-2"><Calendar size={16} /> Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(e => (
                  <div key={e.id} className="card-glass p-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{e.title}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">{e.subject} · {e.duration_minutes} min · {e.total_marks} marks (pass: {e.pass_marks})</p>
                      {e.instructions && <p className="text-slate-500 text-xs mt-1 line-clamp-1">{e.instructions}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="badge-violet">{formatDate(e.exam_date)}</span>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{e.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-slate-400 mb-3">Past Exams</h2>
              <div className="space-y-3">
                {past.map(e => (
                  <div key={e.id} className="card p-4 flex items-center justify-between gap-4 opacity-70">
                    <div>
                      <h3 className="font-medium text-white">{e.title}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">{e.subject} · {e.total_marks} marks</p>
                    </div>
                    <span className="badge-yellow">{formatDate(e.exam_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
