import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StudentModal } from '@/components/admin/StudentModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Avatar } from '@/components/shared/Avatar';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, Download } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch_id?: string;
  batch?: { name: string };
  gender?: 'male' | 'female' | 'other';
  created_at: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const q = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('students').select('*, batch:batches(name)').order('created_at', { ascending: false });
    if (q) query = query.ilike('name', `%${q}%`);
    const { data } = await query;
    setStudents(data ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('batches').select('id,name').then(({ data }) => setBatches(data ?? []));
  }, []);

  const handleSave = async (data: any) => {
    if (editing?.id) {
      const { error } = await supabase.from('students').update(data).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Student updated');
    } else {
      const { error } = await supabase.from('students').insert([data]);
      if (error) { toast.error('Failed to add student'); return; }
      toast.success('Student added');
    }
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('students').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Student deleted');
    setDeleteTarget(null);
    load();
  };

  const columns: Column<Student>[] = [
    {
      key: 'name', header: 'Student', sortable: true,
      render: r => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size="sm" />
          <div>
            <p className="font-medium text-white">{r.name}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', sortable: true },
    {
      key: 'batch', header: 'Batch',
      render: r => r.batch?.name ? <span className="badge-blue">{r.batch.name}</span> : <span className="text-slate-500">—</span>,
    },
    {
      key: 'gender', header: 'Gender',
      render: r => r.gender ? <span className="capitalize text-slate-300">{r.gender}</span> : <span className="text-slate-500">—</span>,
    },
    {
      key: 'created_at', header: 'Joined', sortable: true,
      render: r => <span className="text-slate-400 text-sm">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Students">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm" placeholder="Search students…" />
          </div>
          <div className="flex gap-2">
            <button className="btn-outline text-sm py-2"><Download size={15} /> Export</button>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-sm py-2">
              <Plus size={15} /> Add Student
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <DataTable columns={columns} data={students} loading={loading} emptyMessage="No students found. Add your first student!" />
        </div>
      </div>

      <StudentModal
        open={modalOpen}
        student={editing ?? undefined}
        batches={batches}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
