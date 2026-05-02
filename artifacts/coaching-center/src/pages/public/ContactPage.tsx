import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Footer } from '@/components/public/Footer';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Phone, Mail, MapPin, Send } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
});
type F = z.infer<typeof schema>;

export default function ContactPage() {
  const { settings } = useSettingsStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: F) => {
    const { error } = await supabase.from('contact_messages').insert([data]);
    if (error) { toast.error('Failed to send message.'); return; }
    toast.success('Message sent successfully!');
    reset();
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <PublicNavbar />
      <div className="pt-24 max-w-5xl mx-auto px-4 pb-16">
        <AnimatedSection className="text-center mb-12">
          <h1 className="section-title mb-3">Get in <span className="text-gradient">Touch</span></h1>
          <p className="text-slate-400">Have questions? We'd love to hear from you.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatedSection>
            <div className="space-y-5 mb-8">
              {[
                { icon: <Phone size={20} />, label: 'Phone', value: settings.centerPhone || 'Not configured' },
                { icon: <Mail size={20} />, label: 'Email', value: settings.centerEmail || 'Not configured' },
                { icon: <MapPin size={20} />, label: 'Address', value: settings.centerAddress || 'Not configured' },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className="text-white font-medium">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <form onSubmit={handleSubmit(onSubmit)} className="card-glass p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Name *</label>
                  <input {...register('name')} className="input-field" placeholder="Your name" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email *</label>
                  <input {...register('email')} className="input-field" placeholder="email@example.com" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Phone</label>
                <input {...register('phone')} className="input-field" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Message *</label>
                <textarea {...register('message')} className="input-field" rows={4} placeholder="Your message…" />
                {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                <Send size={15} /> {isSubmitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </AnimatedSection>
        </div>
      </div>
      <Footer />
    </div>
  );
}
