import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Footer } from '@/components/public/Footer';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Send, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  guardian_name: z.string().min(2),
  guardian_phone: z.string().min(10),
  batch_id: z.string().min(1, 'Please select a batch'),
  address: z.string().optional(),
  message: z.string().optional(),
});
type F = z.infer<typeof schema>;

export default function AdmissionPage() {
  const [submitted, setSubmitted] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  useEffect(() => {
    supabase.from('batches').select('id,name').eq('is_active', true).then(({ data }) => setBatches(data ?? []));
  }, []);

  const onSubmit = async (data: F) => {
    const { error } = await supabase.from('admission_requests').insert([{ ...data, status: 'pending' }]);
    if (error) { toast.error('Failed to submit. Please try again.'); return; }
    setSubmitted(true);
    toast.success('Application submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <PublicNavbar />
      <div className="pt-24 max-w-2xl mx-auto px-4 pb-16">
        <AnimatedSection className="text-center mb-10">
          <h1 className="section-title mb-3">Apply for <span className="text-gradient">Admission</span></h1>
          <p className="text-slate-400">Fill out the form and we'll get back to you within 24 hours.</p>
        </AnimatedSection>

        {submitted ? (
          <div className="card-glass p-10 text-center">
            <CheckCircle size={56} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="font-inter font-bold text-2xl text-white mb-2">Application Received!</h2>
            <p className="text-slate-400">We'll contact you shortly. Thank you for applying.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="card-glass p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['name','Full Name','Your name'],['email','Email','email@example.com'],['phone','Phone','01XXXXXXXXX'],['guardian_name',"Guardian's Name","Parent/Guardian"],['guardian_phone',"Guardian's Phone","01XXXXXXXXX"]].map(([f,l,p]) => (
                <div key={f}>
                  <label className="text-xs text-slate-400 mb-1.5 block">{l} *</label>
                  <input {...register(f as keyof F)} className="input-field" placeholder={p} />
                  {errors[f as keyof F] && <p className="text-red-400 text-xs mt-1">{errors[f as keyof F]?.message as string}</p>}
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Preferred Batch *</label>
                <select {...register('batch_id')} className="input-field">
                  <option value="">Select a batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.batch_id && <p className="text-red-400 text-xs mt-1">{errors.batch_id.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Address</label>
              <input {...register('address')} className="input-field" placeholder="Your address" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Message (optional)</label>
              <textarea {...register('message')} className="input-field" rows={3} placeholder="Any questions or notes?" />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              <Send size={16} /> {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
