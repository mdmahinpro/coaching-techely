import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';

const links = [
  { to: '/portal/dashboard', label: 'Dashboard' },
  { to: '/portal/fees', label: 'Fees' },
  { to: '/portal/exams', label: 'Exams' },
  { to: '/portal/results', label: 'Results' },
  { to: '/portal/notices', label: 'Notices' },
];

export function PortalNav() {
  const location = useLocation();
  const { signOut, user } = useAuthStore();
  const { settings } = useSettingsStore();
  const name = user?.user_metadata?.name ?? user?.email ?? 'Student';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-navy-800/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/portal/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-inter font-bold text-white text-sm hidden sm:block">{settings.centerName}</span>
          <span className="badge-violet text-xs ml-1 hidden sm:inline">Portal</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                location.pathname.startsWith(l.to)
                  ? 'text-violet-400 bg-violet-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <Avatar name={name} size="sm" />
          <button
            onClick={() => signOut()}
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
