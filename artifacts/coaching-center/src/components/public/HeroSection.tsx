import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Users, Award } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function HeroSection() {
  const { settings } = useSettingsStore();
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="badge-blue mb-6 inline-block">Welcome to {settings.centerName}</span>
          <h1 className="font-inter font-black text-4xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight">
            Learn, Grow &{' '}
            <span className="text-gradient">Succeed</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Quality education tailored to your needs. Join thousands of students who have transformed their academic journey with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/admission" className="btn-primary text-base px-8 py-3">
              Apply for Admission <ArrowRight size={18} />
            </Link>
            <Link to="/courses" className="btn-outline text-base px-8 py-3">
              Browse Courses
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: <Users size={28} />, label: 'Students Enrolled', value: '1,200+', color: 'text-sky-400' },
            { icon: <BookOpen size={28} />, label: 'Courses Available', value: '24+', color: 'text-violet-400' },
            { icon: <Award size={28} />, label: 'Success Rate', value: '95%', color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="card-glass p-6 text-center">
              <div className={`mx-auto mb-3 ${stat.color}`}>{stat.icon}</div>
              <div className="font-inter font-black text-3xl text-white mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
