import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Hash, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password required'),
});
type F = z.infer<typeof schema>;

export default function PortalLoginPage() {
  const [showPw, setShowPw] = useState(false);
  const { signIn } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: F) => {
    const { error } = await signIn(data.email, data.password);
    if (error) { toast.error(error); return; }
    toast.success('Welcome back!');
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="card-glass p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="font-inter font-black text-2xl text-white mb-1">Student Portal</h1>
            <p className="text-slate-400 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input {...register('email')} className="input-field pl-9" placeholder="student@example.com" />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-field pl-9 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-secondary w-full justify-center py-3 mt-2">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Not a student?{' '}
            <Link to="/" className="text-sky-400 hover:underline">Go to home</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
