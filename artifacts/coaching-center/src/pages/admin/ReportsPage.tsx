import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, BarChart2 } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [feeStats, setFeeStats] = useState<any[]>([]);
  const [batchEnroll, setBatchEnroll] = useState<any[]>([]);
  const [passRate, setPassRate] = useState<{ name: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ students: 0, collected: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      const [s, paidFees, pendFees, batches, results] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('fees').select('amount').eq('status', 'paid'),
        supabase.from('fees').select('amount').eq('status', 'pending'),
        supabase.from('batches').select('name, enrolled').eq('is_active', true),
        supabase.from('results').select('marks_obtained, exam:exams(pass_marks)'),
      ]);

      const collected = (paidFees.data ?? []).reduce((a: number, f: any) => a + f.amount, 0);
      const pending = (pendFees.data ?? []).reduce((a: number, f: any) => a + f.amount, 0);
      setTotals({ students: s.count ?? 0, collected, pending });

      setFeeStats([
        { name: 'Collected', amount: collected },
        { name: 'Pending', amount: pending },
      ]);

      setBatchEnroll((batches.data ?? []).map((b: any) => ({ name: b.name, students: b.enrolled ?? 0 })));

      const rs = results.data ?? [];
      const passed = rs.filter((r: any) => r.marks_obtained >= (r.exam?.pass_marks ?? 0)).length;
      const failed = rs.length - passed;
      setPassRate([{ name: 'Pass', value: passed }, { name: 'Fail', value: failed }]);
    };
    load();
  }, []);

  return (
    <AdminLayout title="Reports">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ label: 'Total Students', val: totals.students, color: 'text-sky-400' }, { label: 'Fees Collected', val: formatCurrency(totals.collected), color: 'text-emerald-400' }, { label: 'Fees Pending', val: formatCurrency(totals.pending), color: 'text-amber-400' }].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <p className="text-slate-400 text-sm mb-1">{s.label}</p>
              <p className={`font-inter font-black text-2xl ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedSection className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 size={17} className="text-sky-400" /> Fee Overview</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc' }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {feeStats.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100} className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 size={17} className="text-violet-400" /> Pass / Fail Rate</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={passRate} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {passRate.map((_, i) => <Cell key={i} fill={i === 0 ? '#34d399' : '#ef4444'} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedSection>

          {batchEnroll.length > 0 && (
            <AnimatedSection delay={150} className="card p-5 lg:col-span-2">
              <h2 className="font-semibold text-white mb-4">Enrollment per Batch</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchEnroll}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc' }} />
                    <Bar dataKey="students" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnimatedSection>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
