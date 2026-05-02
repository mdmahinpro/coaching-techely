import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  batch_id: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  student?: Partial<FormData> & { id?: string };
  batches?: { id: string; name: string }[];
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}

export function StudentModal({ open, student, batches = [], onSave, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) reset(student ?? {});
  }, [open, student]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative card-glass w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
          >
            <div className="sticky top-0 bg-navy-800/90 backdrop-blur-sm flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-inter font-bold text-white">{student?.id ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Full Name *</label>
                  <input {...register('name')} className="input-field" placeholder="Student name" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email *</label>
                  <input {...register('email')} className="input-field" placeholder="email@example.com" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Phone *</label>
                  <input {...register('phone')} className="input-field" placeholder="01XXXXXXXXX" />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Gender</label>
                  <select {...register('gender')} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Guardian Name</label>
                  <input {...register('guardian_name')} className="input-field" placeholder="Parent/Guardian" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Guardian Phone</label>
                  <input {...register('guardian_phone')} className="input-field" placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Date of Birth</label>
                  <input {...register('date_of_birth')} type="date" className="input-field" />
                </div>
                {batches.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Batch</label>
                    <select {...register('batch_id')} className="input-field">
                      <option value="">Select batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Address</label>
                <textarea {...register('address')} className="input-field" rows={2} placeholder="Full address" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-sm">
                  <Save size={15} /> {isSubmitting ? 'Saving…' : 'Save Student'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
