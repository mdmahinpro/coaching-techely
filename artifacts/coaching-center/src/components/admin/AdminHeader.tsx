import { useState } from 'react';
import { Bell, Search, Menu, LogOut, X } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  onMenuToggle?: () => void;
}

export function AdminHeader({ title, onMenuToggle }: Props) {
  const { user, signOut } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const name = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Admin';
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="h-16 bg-navy-800/80 backdrop-blur-md border-b border-navy-700/50 flex items-center px-4 md:px-6 gap-3 sticky top-0 z-30">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="font-inter font-bold text-white text-base flex-1 truncate">{title}</h1>

      {/* Search */}
      <div className="flex items-center gap-1">
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="input-field pl-8 py-2 text-sm h-9"
                  placeholder="Search students, batches…"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => { setSearchOpen(s => !s); setSearchQ(''); }}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {searchOpen ? <X size={17} /> : <Search size={17} />}
        </button>
      </div>

      {/* Bell */}
      <button className="relative w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
        <Bell size={17} />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sky-400 rounded-full" />
      </button>

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(s => !s)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Avatar name={name} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-white max-w-[100px] truncate">{name}</span>
        </button>

        <AnimatePresence>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 card-glass border border-navy-700/60 rounded-xl overflow-hidden z-50 shadow-2xl"
              >
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-white text-sm font-medium truncate">{name}</p>
                  <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
