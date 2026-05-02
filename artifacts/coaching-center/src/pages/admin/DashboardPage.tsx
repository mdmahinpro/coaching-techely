import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, DollarSign, FileText, TrendingUp, Bell } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, batches: 0, fees: 0, exams: 0, pendingFees: 0 });
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [feeChart, setFeeChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, b, f, e, p, rs] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('batches').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('fees').select('amount').eq('status', 'paid'),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
        supabase.from('fees').select('amount').eq('status', 'pending'),
        supabase.from('students').select('id,name,phone,created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      const totalFees = (f.data ?? []).reduce((acc: number, r: any) => acc + (r.amount ?? 0), 0);
      const pendingFees = (p.data ?? []).reduce((acc: number, r: any) => acc + (r.amount ?? 0), 0);
      setStats({
        students: s.count ?? 0,
        batches: b.count ?? 0,
        fees: totalFees,
        exams: e.count ?? 0,
        pendingFees,
      });
      setRecentStudents(rs.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Total Students" value={stats.students} icon={Users} color="sky" index={0} />
          <StatsCard title="Active Batches" value={stats.batches} icon={BookOpen} color="violet" index={1} />
          <StatsCard title="Total Fees Collected" value={formatCurrency(stats.fees)} icon={DollarSign} color="emerald" index={2} />
          <StatsCard title="Pending Fees" value={formatCurrency(stats.pendingFees)} icon={TrendingUp} color="amber" index={3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedSection className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-sky-400" /> Fee Collection</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { month: 'Jan', amount: 45000 }, { month: 'Feb', amount: 52000 },
                  { month: 'Mar', amount: 48000 }, { month: 'Apr', amount: 61000 },
                  { month: 'May', amount: 58000 }, { month: 'Jun', amount: 67000 },
                ]}>
                  <defs>
                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="amount" stroke="#38bdf8" strokeWidth={2} fill="url(#feeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100} className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Users size={17} className="text-violet-400" /> Recent Students</h2>
            <div className="space-y-3">
              {recentStudents.length === 0 && !loading && (
                <p className="text-slate-500 text-sm text-center py-4">No students yet</p>
              )}
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      <p className="text-slate-500 text-xs">{s.phone}</p>
                    </div>
                  </div>
                  <span className="badge-green text-xs">New</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </AdminLayout>
  );
}
