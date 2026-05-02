import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Settings } from 'lucide-react';

const schema = z.object({
  centerName: z.string().min(2),
  centerAddress: z.string().optional(),
  centerPhone: z.string().optional(),
  centerEmail: z.string().optional(),
  currency: z.string().default('BDT'),
  smsApiKey: z.string().optional(),
  smsSenderId: z.string().optional(),
});
type F = z.infer<typeof schema>;

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  useEffect(() => { reset(settings); }, [settings]);

  const onSubmit = async (data: F) => {
    updateSettings(data);
    toast.success('Settings saved!');
  };

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card p-6">
            <h2 className="font-inter font-bold text-white mb-5 flex items-center gap-2">
              <Settings size={18} className="text-sky-400" /> Center Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Center Name *</label>
                <input {...register('centerName')} className="input-field" placeholder="My Coaching Center" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Address</label>
                <textarea {...register('centerAddress')} className="input-field" rows={2} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Phone</label>
                  <input {...register('centerPhone')} className="input-field" placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
                  <input {...register('centerEmail')} className="input-field" placeholder="info@center.com" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Currency</label>
                <select {...register('currency')} className="input-field">
                  <option value="BDT">BDT (৳)</option>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-inter font-bold text-white mb-5">SMS Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">SMS API Key</label>
                <input {...register('smsApiKey')} className="input-field" placeholder="Your SMS provider API key" type="password" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Sender ID</label>
                <input {...register('smsSenderId')} className="input-field" placeholder="e.g. COACHING" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            <Save size={16} /> Save Settings
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
