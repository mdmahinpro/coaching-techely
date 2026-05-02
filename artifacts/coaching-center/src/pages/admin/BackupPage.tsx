import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Download, Database, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const TABLES = ['students', 'teachers', 'batches', 'fees', 'exams', 'results', 'notices', 'admission_requests'];

export default function BackupPage() {
  const [loading, setLoading] = useState(false);

  const exportTable = async (table: string) => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select('*');
    if (error) { toast.error(`Failed to export ${table}`); setLoading(false); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${table} exported!`);
    setLoading(false);
  };

  const exportAll = async () => {
    setLoading(true);
    const backup: Record<string, unknown[]> = {};
    for (const t of TABLES) {
      const { data } = await supabase.from(t).select('*');
      backup[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Full backup downloaded!');
    setLoading(false);
  };

  return (
    <AdminLayout title="Backup & Export">
      <div className="max-w-2xl space-y-6">
        <div className="card p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/20">
            <AlertTriangle size={22} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Data Export</h3>
            <p className="text-slate-400 text-sm">Download your data as JSON files. These can be used as backups or imported into other systems.</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-inter font-bold text-white flex items-center gap-2"><Database size={18} className="text-sky-400" /> Export by Table</h2>
            <button onClick={exportAll} disabled={loading} className="btn-primary text-sm py-2">
              <Download size={15} /> Export All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TABLES.map(t => (
              <button
                key={t}
                onClick={() => exportTable(t)}
                disabled={loading}
                className="flex items-center justify-between p-3 rounded-lg bg-navy-700/60 border border-navy-600/40 hover:border-sky-400/30 hover:bg-sky-500/5 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Database size={15} className="text-sky-400" />
                  <span className="font-medium text-white capitalize">{t.replace('_', ' ')}</span>
                </div>
                <Download size={14} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
