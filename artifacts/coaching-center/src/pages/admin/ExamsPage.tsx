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
import { formatDate } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  batch_id: z.string().optional(),
  exam_date: z.string().min(1),
  duration_minutes: z.coerce.number().min(1),
  total_marks: z.coerce.number().min(1),
  pass_marks: z.coerce.number().min(1),
  type: z.enum(['mcq', 'written', 'mixed']),
  instructions: z.string().optional(),
});
type F = z.infer<typeof schema>;
interface Exam extends F { id: string }

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('exams').select('*, batch:batches(name)').order('exam_date', { ascending: false });
    setExams(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { supabase.from('batches').select('id,name').then(({ data }) => setBatches(data ?? [])); }, []);

  const openModal = (e?: Exam) => { setEditing(e ?? null); reset(e ?? { type: 'written', total_marks: 100, pass_marks: 40, duration_minutes: 120 }); setModalOpen(true); };

  const handleSave = async (data: F) => {
    if (editing?.id) {
      await supabase.from('exams').update(data).eq('id', editing.id);
      toast.success('Exam updated');
    } else {
      await supabase.from('exams').insert([data]);
      toast.success('Exam created');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('exams').delete().eq('id', deleteTarget.id);
    toast.success('Exam deleted');
    setDeleteTarget(null);
    load();
  };

  const columns: Column<Exam & { batch?: { name: string } }>[] = [
    { key: 'title', header: 'Title', sortable: true, render: r => <span className="font-medium text-white">{r.title}</span> },
    { key: 'subject', header: 'Subject', render: r => <span className="badge-blue">{r.subject}</span> },
    { key: 'batch', header: 'Batch', render: r => <span className="text-slate-300">{(r as any).batch?.name ?? 'All'}</span> },
    { key: 'exam_date', header: 'Date', sortable: true, render: r => <span className="text-slate-300">{formatDate(r.exam_date)}</span> },
    { key: 'total_marks', header: 'Marks', render: r => <span className="text-slate-300">{r.total_marks} / Pass: {r.pass_marks}</span> },
    { key: 'type', header: 'Type', render: r => <span className="badge-violet capitalize">{r.type}</span> },
    { key: 'actions', header: '', render: r => <div className="flex gap-2"><button onClick={() => openModal(r as Exam)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400"><Pencil size={14} /></button><button onClick={() => setDeleteTarget(r as Exam)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button></div> },
  ];

  return (
    <AdminLayout title="Exams">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => openModal()} className="btn-primary text-sm"><Plus size={15} /> Schedule Exam</button>
        </div>
        <div className="card overflow-hidden">
          <DataTable columns={columns} data={exams as any} loading={loading} emptyMessage="No exams scheduled." />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">{editing ? 'Edit Exam' : 'Schedule Exam'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block">Exam Title *</label>
                    <input {...register('title')} className="input-field" placeholder="e.g. Mid-Term Exam" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Subject *</label>
                    <input {...register('subject')} className="input-field" placeholder="Mathematics" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Exam Date *</label>
                    <input {...register('exam_date')} type="date" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Duration (min) *</label>
                    <input {...register('duration_minutes')} type="number" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Type</label>
                    <select {...register('type')} className="input-field">
                      <option value="written">Written</option>
                      <option value="mcq">MCQ</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Total Marks *</label>
                    <input {...register('total_marks')} type="number" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Pass Marks *</label>
                    <input {...register('pass_marks')} type="number" className="input-field" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block">Batch (optional)</label>
                    <select {...register('batch_id')} className="input-field">
                      <option value="">All Batches</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block">Instructions</label>
                    <textarea {...register('instructions')} className="input-field" rows={3} />
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
      <ConfirmDialog open={!!deleteTarget} title="Delete Exam" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminLayout>
  );
}
