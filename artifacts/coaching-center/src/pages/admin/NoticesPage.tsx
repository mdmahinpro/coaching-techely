import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, Pin, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.string().optional(),
  is_pinned: z.boolean().default(false),
  is_published: z.boolean().default(true),
});
type F = z.infer<typeof schema>;
interface Notice extends F { id: string; created_at: string }

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setNotices(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (n?: Notice) => { setEditing(n ?? null); reset(n ?? { is_published: true, is_pinned: false }); setModalOpen(true); };

  const handleSave = async (data: F) => {
    if (editing?.id) {
      await supabase.from('notices').update(data).eq('id', editing.id);
      toast.success('Notice updated');
    } else {
      await supabase.from('notices').insert([data]);
      toast.success('Notice published');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('notices').delete().eq('id', deleteTarget.id);
    toast.success('Notice deleted');
    setDeleteTarget(null);
    load();
  };

  return (
    <AdminLayout title="Notices">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => openModal()} className="btn-primary text-sm"><Plus size={15} /> New Notice</button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-20 card animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-3">
            {notices.map(n => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${n.is_pinned ? 'bg-sky-500/15' : 'bg-white/5'}`}>
                      {n.is_pinned ? <Pin size={14} className="text-sky-400" /> : <Bell size={14} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{n.title}</h3>
                        {n.is_pinned && <span className="badge-blue">Pinned</span>}
                        {n.category && <span className="badge-violet">{n.category}</span>}
                        {!n.is_published && <span className="badge-yellow">Draft</span>}
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2">{n.content}</p>
                      <p className="text-slate-500 text-xs mt-1">{formatDate(n.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openModal(n)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(n)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
            {notices.length === 0 && <div className="text-center py-16 text-slate-500">No notices yet. Create your first notice.</div>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-lg z-10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">{editing ? 'Edit Notice' : 'New Notice'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Title *</label>
                  <input {...register('title')} className="input-field" placeholder="Notice title" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Content *</label>
                  <textarea {...register('content')} className="input-field" rows={4} placeholder="Notice content…" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
                  <input {...register('category')} className="input-field" placeholder="e.g. Exam, Holiday, Fee" />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input {...register('is_pinned')} type="checkbox" className="accent-sky-400" /> Pin to top
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input {...register('is_published')} type="checkbox" className="accent-sky-400" /> Published
                  </label>
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
      <ConfirmDialog open={!!deleteTarget} title="Delete Notice" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminLayout>
  );
}
