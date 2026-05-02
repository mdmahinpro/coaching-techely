import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/admission', label: 'Admission' },
  { to: '/notices', label: 'Notice Board' },
  { to: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { settings } = useSettingsStore();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-navy-900/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="font-inter font-bold text-white">{settings.centerName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? 'text-sky-400 bg-sky-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/portal/login" className="ml-3 btn-primary text-sm py-2">
            Student Portal
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-400 hover:text-white p-2">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-navy-900"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === l.to
                      ? 'text-sky-400 bg-sky-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/portal/login" onClick={() => setOpen(false)} className="btn-primary w-full justify-center mt-2 text-sm py-2">
                Student Portal
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
