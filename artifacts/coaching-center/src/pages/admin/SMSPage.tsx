import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Users } from 'lucide-react';

const schema = z.object({
  recipient: z.enum(['all', 'batch', 'custom']),
  batch_id: z.string().optional(),
  phone_numbers: z.string().optional(),
  message: z.string().min(5).max(160),
});
type F = z.infer<typeof schema>;

export default function SMSPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [charCount, setCharCount] = useState(0);
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { recipient: 'all' } });
  const recipient = watch('recipient');
  const message = watch('message') ?? '';

  useEffect(() => { setCharCount(message.length); }, [message]);
  useEffect(() => { supabase.from('batches').select('id,name').then(({ data }) => setBatches(data ?? [])); }, []);

  const onSubmit = async (data: F) => {
    toast.success(`SMS queued for ${data.recipient === 'all' ? 'all students' : 'selected recipients'}. (Connect SMS API in Settings to send real messages.)`);
  };

  return (
    <AdminLayout title="SMS Messaging">
      <div className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ icon: MessageSquare, label: 'Sent Today', val: '0', color: 'text-sky-400' }, { icon: Users, label: 'Recipients', val: '—', color: 'text-violet-400' }, { icon: Send, label: 'Pending', val: '0', color: 'text-amber-400' }].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={s.color}><s.icon size={22} /></div>
              <div><p className="text-xs text-slate-400">{s.label}</p><p className="font-inter font-bold text-white">{s.val}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h2 className="font-inter font-bold text-white mb-5">Compose SMS</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Send To</label>
              <select {...register('recipient')} className="input-field">
                <option value="all">All Students</option>
                <option value="batch">Specific Batch</option>
                <option value="custom">Custom Phone Numbers</option>
              </select>
            </div>

            {recipient === 'batch' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Select Batch</label>
                <select {...register('batch_id')} className="input-field">
                  <option value="">Choose batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {recipient === 'custom' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Phone Numbers (comma separated)</label>
                <textarea {...register('phone_numbers')} className="input-field" rows={2} placeholder="01XXXXXXXXX, 01XXXXXXXXX" />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Message <span className={`ml-1 ${charCount > 140 ? 'text-red-400' : 'text-slate-500'}`}>({charCount}/160)</span></label>
              <textarea {...register('message')} className="input-field" rows={4} placeholder="Type your message here…" />
              {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message.message}</p>}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-400 text-xs">Configure your SMS API key in Settings to send real messages.</span>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <Send size={16} /> Send SMS
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
