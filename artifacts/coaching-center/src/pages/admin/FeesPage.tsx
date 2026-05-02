import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Search, CheckCircle, XCircle, X, Save, DollarSign } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatsCard } from '@/components/admin/StatsCard';

const schema = z.object({
  student_id: z.string().min(1, 'Select a student'),
  amount: z.coerce.number().min(1),
  month: z.string().min(1),
  status: z.enum(['paid', 'pending', 'overdue']),
  payment_date: z.string().optional(),
  note: z.string().optional(),
});
type F = z.infer<typeof schema>;

interface Fee { id: string; student_id: string; student?: { name: string }; amount: number; month: string; status: 'paid' | 'pending' | 'overdue'; payment_date?: string; }

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fee | null>(null);
  const q = useDebounce(search, 300);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('fees').select('*, student:students(name)').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    const filtered = q ? (data ?? []).filter((f: any) => f.student?.name?.toLowerCase().includes(q.toLowerCase())) : (data ?? []);
    setFees(filtered);
    setLoading(false);
  }, [q, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('students').select('id,name').then(({ data }) => setStudents(data ?? []));
  }, []);

  const openModal = (f?: Fee) => { setEditing(f ?? null); reset(f ?? { status: 'pending' }); setModalOpen(true); };

  const handleSave = async (data: F) => {
    if (editing?.id) {
      const { error } = await supabase.from('fees').update(data).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Fee record updated');
    } else {
      const { error } = await supabase.from('fees').insert([data]);
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Fee record added');
    }
    setModalOpen(false);
    load();
  };

  const markPaid = async (id: string) => {
    await supabase.from('fees').update({ status: 'paid', payment_date: new Date().toISOString() }).eq('id', id);
    toast.success('Marked as paid');
    load();
  };

  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + f.amount, 0);

  const columns: Column<Fee>[] = [
    { key: 'student', header: 'Student', sortable: true, render: r => <span className="font-medium text-white">{r.student?.name ?? '—'}</span> },
    { key: 'month', header: 'Month', render: r => <span className="text-slate-300">{r.month}</span> },
    { key: 'amount', header: 'Amount', render: r => <span className="font-medium text-emerald-400">{formatCurrency(r.amount)}</span> },
    {
      key: 'status', header: 'Status',
      render: r => (
        <span className={r.status === 'paid' ? 'badge-green' : r.status === 'overdue' ? 'badge-red' : 'badge-yellow'}>
          {r.status}
        </span>
      ),
    },
    { key: 'payment_date', header: 'Paid On', render: r => r.payment_date ? <span className="text-slate-400 text-sm">{formatDate(r.payment_date)}</span> : <span className="text-slate-500">—</span> },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex gap-2">
          {r.status !== 'paid' && (
            <button onClick={() => markPaid(r.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-400 transition-colors" title="Mark paid"><CheckCircle size={14} /></button>
          )}
          <button onClick={() => openModal(r)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 transition-colors"><Plus size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Fees Management">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="Total Collected" value={formatCurrency(totalPaid)} icon={DollarSign} color="emerald" index={0} />
          <StatsCard title="Pending Amount" value={formatCurrency(totalPending)} icon={XCircle} color="amber" index={1} />
          <StatsCard title="Total Records" value={fees.length} icon={CheckCircle} color="sky" index={2} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm" placeholder="Search…" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field py-2 text-sm w-32">
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <button onClick={() => openModal()} className="btn-primary text-sm py-2"><Plus size={15} /> Add Fee</button>
        </div>

        <div className="card overflow-hidden">
          <DataTable columns={columns} data={fees} loading={loading} emptyMessage="No fee records found." />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-md z-10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">{editing ? 'Edit Fee' : 'Add Fee'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Student *</label>
                  <select {...register('student_id')} className="input-field">
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.student_id && <p className="text-red-400 text-xs mt-1">{errors.student_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Amount (৳) *</label>
                    <input {...register('amount')} type="number" className="input-field" placeholder="1500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Month *</label>
                    <input {...register('month')} className="input-field" placeholder="Jan 2025" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Status</label>
                  <select {...register('status')} className="input-field">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Note</label>
                  <input {...register('note')} className="input-field" placeholder="Optional note" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-outline text-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-sm"><Save size={15} /> Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
