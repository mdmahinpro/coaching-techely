import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Avatar } from '@/components/shared/Avatar';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  subject: z.string().min(2),
  qualification: z.string().optional(),
  salary: z.coerce.number().optional(),
});
type F = z.infer<typeof schema>;
interface Teacher extends F { id: string }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
    setTeachers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (t?: Teacher) => { setEditing(t ?? null); reset(t ?? {}); setModalOpen(true); };

  const handleSave = async (data: F) => {
    if (editing?.id) {
      const { error } = await supabase.from('teachers').update(data).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Teacher updated');
    } else {
      const { error } = await supabase.from('teachers').insert([data]);
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Teacher added');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('teachers').delete().eq('id', deleteTarget.id);
    toast.success('Teacher removed');
    setDeleteTarget(null);
    load();
  };

  const columns: Column<Teacher>[] = [
    { key: 'name', header: 'Teacher', sortable: true, render: r => <div className="flex items-center gap-3"><Avatar name={r.name} size="sm" /><div><p className="font-medium text-white">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div></div> },
    { key: 'phone', header: 'Phone' },
    { key: 'subject', header: 'Subject', render: r => <span className="badge-violet">{r.subject}</span> },
    { key: 'qualification', header: 'Qualification', render: r => <span className="text-slate-300">{r.qualification ?? '—'}</span> },
    { key: 'salary', header: 'Salary', render: r => r.salary ? <span className="text-emerald-400">৳{r.salary.toLocaleString()}</span> : <span className="text-slate-500">—</span> },
    { key: 'actions', header: '', render: r => <div className="flex gap-2"><button onClick={() => openModal(r)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400"><Pencil size={14} /></button><button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button></div> },
  ];

  return (
    <AdminLayout title="Teachers">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => openModal()} className="btn-primary text-sm"><Plus size={15} /> Add Teacher</button>
        </div>
        <div className="card overflow-hidden">
          <DataTable columns={columns} data={teachers} loading={loading} emptyMessage="No teachers yet." />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-md z-10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">{editing ? 'Edit Teacher' : 'Add Teacher'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {([['name','Full Name','Teacher name'],['email','Email','email@example.com'],['phone','Phone','01XXXXXXXXX'],['subject','Subject','e.g. Mathematics'],['qualification','Qualification','e.g. M.Sc']] as [string,string,string][]).map(([f,l,p]) => (
                    <div key={f} className={f === 'email' ? 'col-span-2' : ''}>
                      <label className="text-xs text-slate-400 mb-1.5 block">{l}</label>
                      <input {...register(f as keyof F)} className="input-field" placeholder={p} />
                      {errors[f as keyof F] && <p className="text-red-400 text-xs mt-1">{(errors[f as keyof F] as any)?.message}</p>}
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Salary (৳)</label>
                    <input {...register('salary')} type="number" className="input-field" placeholder="25000" />
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
      <ConfirmDialog open={!!deleteTarget} title="Remove Teacher" message={`Remove ${deleteTarget?.name}?`} confirmLabel="Remove" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminLayout>
  );
}
