import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function PortalFeesPage() {
  const { user } = useAuthStore();
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('fees')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setFees(data ?? []); setLoading(false); });
  }, [user]);

  const paid = fees.filter(f => f.status === 'paid');
  const pending = fees.filter(f => f.status !== 'paid');
  const totalPaid = paid.reduce((a, f) => a + f.amount, 0);
  const totalPending = pending.reduce((a, f) => a + f.amount, 0);

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-2xl text-white mb-6">Fee Records</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: DollarSign, label: 'Total Paid', value: formatCurrency(totalPaid), color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          { icon: Clock, label: 'Pending', value: formatCurrency(totalPending), color: 'text-amber-400', bg: 'bg-amber-500/15' },
          { icon: CheckCircle, label: 'Transactions', value: fees.length, color: 'text-sky-400', bg: 'bg-sky-500/15' },
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

      {loading ? <LoadingSkeleton rows={4} /> : fees.length === 0 ? (
        <EmptyState title="No fee records" description="Your fee records will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                {['Month', 'Amount', 'Status', 'Paid On', 'Note'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id} className="border-b border-navy-700/50">
                  <td className="px-4 py-3 text-white font-medium">{f.month}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">{formatCurrency(f.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={f.status === 'paid' ? 'badge-green' : f.status === 'overdue' ? 'badge-red' : 'badge-yellow'}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{f.payment_date ? formatDate(f.payment_date) : '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{f.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  );
}
