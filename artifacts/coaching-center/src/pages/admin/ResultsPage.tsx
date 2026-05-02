import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  student_id: z.string().min(1),
  exam_id: z.string().min(1),
  marks_obtained: z.coerce.number().min(0),
  grade: z.string().optional(),
  remarks: z.string().optional(),
});
type F = z.infer<typeof schema>;

interface Result { id: string; student?: { name: string }; exam?: { title: string; total_marks: number; pass_marks: number }; marks_obtained: number; grade?: string; remarks?: string }

function calcGrade(marks: number, total: number): string {
  const pct = (marks / total) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('results').select('*, student:students(name), exam:exams(title,total_marks,pass_marks)').order('created_at', { ascending: false });
    setResults(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('students').select('id,name').then(({ data }) => setStudents(data ?? []));
    supabase.from('exams').select('id,title,total_marks,pass_marks').then(({ data }) => setExams(data ?? []));
  }, []);

  const handleSave = async (data: F) => {
    const exam = exams.find(e => e.id === data.exam_id);
    const grade = exam ? calcGrade(data.marks_obtained, exam.total_marks) : '';
    const { error } = await supabase.from('results').insert([{ ...data, grade }]);
    if (error) { toast.error('Failed to add result'); return; }
    toast.success('Result added');
    setModalOpen(false);
    reset();
    load();
  };

  const columns: Column<Result>[] = [
    { key: 'student', header: 'Student', sortable: true, render: r => <span className="font-medium text-white">{r.student?.name ?? '—'}</span> },
    { key: 'exam', header: 'Exam', render: r => <span className="text-slate-300">{r.exam?.title ?? '—'}</span> },
    { key: 'marks_obtained', header: 'Marks', render: r => <span className="text-white">{r.marks_obtained} / {r.exam?.total_marks ?? '?'}</span> },
    {
      key: 'grade', header: 'Grade',
      render: r => {
        const g = r.grade;
        return <span className={g === 'F' ? 'badge-red' : g?.startsWith('A') ? 'badge-green' : 'badge-yellow'}>{g ?? '—'}</span>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: r => {
        const pass = r.exam?.pass_marks ?? 0;
        return <span className={r.marks_obtained >= pass ? 'badge-green' : 'badge-red'}>{r.marks_obtained >= pass ? 'Pass' : 'Fail'}</span>;
      },
    },
    { key: 'remarks', header: 'Remarks', render: r => <span className="text-slate-400 text-sm">{r.remarks ?? '—'}</span> },
  ];

  return (
    <AdminLayout title="Results">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => { reset(); setModalOpen(true); }} className="btn-primary text-sm"><Plus size={15} /> Add Result</button>
        </div>
        <div className="card overflow-hidden">
          <DataTable columns={columns} data={results} loading={loading} emptyMessage="No results yet." />
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative card-glass w-full max-w-md z-10 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-inter font-bold text-white">Add Result</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Student *</label>
                  <select {...register('student_id')} className="input-field">
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Exam *</label>
                  <select {...register('exam_id')} className="input-field">
                    <option value="">Select exam</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.total_marks} marks)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Marks Obtained *</label>
                  <input {...register('marks_obtained')} type="number" className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Remarks</label>
                  <input {...register('remarks')} className="input-field" placeholder="Optional remarks" />
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
