import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Admission { id: string; name: string; email: string; phone: string; guardian_name?: string; batch?: { name: string }; batch_id?: string; status: string; message?: string; address?: string; created_at: string }

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [viewing, setViewing] = useState<Admission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('admission_requests').select('*, batch:batches(name)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setAdmissions(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('admission_requests').update({ status }).eq('id', id);
    toast.success(`Admission ${status}`);
    load();
  };

  const columns: Column<Admission>[] = [
    { key: 'name', header: 'Applicant', sortable: true, render: r => <div><p className="font-medium text-white">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div> },
    { key: 'phone', header: 'Phone' },
    { key: 'batch', header: 'Batch', render: r => <span className="badge-blue">{(r as any).batch?.name ?? 'N/A'}</span> },
    { key: 'status', header: 'Status', render: r => <span className={r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-yellow'}>{r.status}</span> },
    { key: 'created_at', header: 'Applied', sortable: true, render: r => <span className="text-slate-400 text-sm">{formatDate(r.created_at)}</span> },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex gap-2">
          <button onClick={() => setViewing(r)} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400" title="View"><Eye size={14} /></button>
          {r.status === 'pending' && <>
            <button onClick={() => updateStatus(r.id, 'approved')} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-400" title="Approve"><CheckCircle size={14} /></button>
            <button onClick={() => updateStatus(r.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400" title="Reject"><XCircle size={14} /></button>
          </>}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Admissions">
      <div className="space-y-4">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{s}</button>
          ))}
        </div>
        <div className="card overflow-hidden">
          <DataTable columns={columns} data={admissions} loading={loading} emptyMessage="No admission requests." />
        </div>
      </div>

      <AnimatePresence>
        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewing(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-md z-10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">Application Details</h2>
                <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3 text-sm">
                {[['Name', viewing.name],['Email', viewing.email],['Phone', viewing.phone],['Guardian', viewing.guardian_name ?? '—'],['Address', viewing.address ?? '—'],['Message', viewing.message ?? '—'],['Applied', formatDate(viewing.created_at)]].map(([k,v]) => (
                  <div key={k} className="flex gap-3"><span className="text-slate-500 w-20 shrink-0">{k}</span><span className="text-white">{v}</span></div>
                ))}
              </div>
              {viewing.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { updateStatus(viewing.id, 'approved'); setViewing(null); }} className="btn-primary text-sm flex-1 justify-center"><CheckCircle size={14} /> Approve</button>
                  <button onClick={() => { updateStatus(viewing.id, 'rejected'); setViewing(null); }} className="btn-danger text-sm flex-1 justify-center"><XCircle size={14} /> Reject</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
