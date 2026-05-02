import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  schedule: z.string().min(2),
  capacity: z.coerce.number().min(1),
  fee: z.coerce.number().min(0),
  teacher: z.string().optional(),
  is_active: z.boolean().default(true),
});
type F = z.infer<typeof schema>;

interface Batch extends F { id: string; enrolled?: number }

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
    setBatches(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (b?: Batch) => {
    setEditing(b ?? null);
    reset(b ?? { is_active: true });
    setModalOpen(true);
  };

  const handleSave = async (data: F) => {
    if (editing?.id) {
      const { error } = await supabase.from('batches').update(data).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Batch updated');
    } else {
      const { error } = await supabase.from('batches').insert([data]);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Batch created');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('batches').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Batch deleted');
    setDeleteTarget(null);
    load();
  };

  const columns: Column<Batch>[] = [
    { key: 'name', header: 'Batch Name', sortable: true, render: r => <span className="font-medium text-white">{r.name}</span> },
    { key: 'subject', header: 'Subject', render: r => <span className="badge-blue">{r.subject}</span> },
    { key: 'schedule', header: 'Schedule', render: r => <span className="text-slate-300">{r.schedule}</span> },
    { key: 'capacity', header: 'Seats', render: r => <span className="text-slate-300">{r.enrolled ?? 0}/{r.capacity}</span> },
    { key: 'fee', header: 'Fee/mo', render: r => <span className="font-medium text-emerald-400">{formatCurrency(r.fee)}</span> },
    { key: 'teacher', header: 'Teacher', render: r => r.teacher ? <span className="text-slate-300">{r.teacher}</span> : <span className="text-slate-500">—</span> },
    { key: 'is_active', header: 'Status', render: r => r.is_active ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span> },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex gap-2">
          <button onClick={() => openModal(r)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Batches">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => openModal()} className="btn-primary text-sm"><Plus size={15} /> New Batch</button>
        </div>
        <div className="card overflow-hidden">
          <DataTable columns={columns} data={batches} loading={loading} emptyMessage="No batches yet. Create your first batch!" />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-lg z-10">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="font-inter font-bold text-white">{editing ? 'Edit Batch' : 'New Batch'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block">Batch Name *</label>
                    <input {...register('name')} className="input-field" placeholder="e.g. SSC Batch 2025" />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Subject *</label>
                    <input {...register('subject')} className="input-field" placeholder="e.g. Mathematics" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Schedule *</label>
                    <input {...register('schedule')} className="input-field" placeholder="e.g. Sat/Mon/Wed 5pm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Capacity *</label>
                    <input {...register('capacity')} type="number" className="input-field" placeholder="30" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Monthly Fee (৳) *</label>
                    <input {...register('fee')} type="number" className="input-field" placeholder="1500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block">Teacher</label>
                    <input {...register('teacher')} className="input-field" placeholder="Teacher name" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <input {...register('is_active')} type="checkbox" id="active" className="w-4 h-4 accent-sky-400" />
                    <label htmlFor="active" className="text-sm text-slate-300">Active batch</label>
                  </div>
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Batch" message={`Delete "${deleteTarget?.name}"? This may affect enrolled students.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminLayout>
  );
}
