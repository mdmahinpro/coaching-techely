import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, DollarSign, FileText,
  BarChart2, Bell, MessageSquare, UserCheck, Settings,
  Database, GraduationCap, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/batches', icon: BookOpen, label: 'Batches' },
  { to: '/admin/teachers', icon: UserCheck, label: 'Teachers' },
  { to: '/admin/fees', icon: DollarSign, label: 'Fees' },
  { to: '/admin/exams', icon: FileText, label: 'Exams' },
  { to: '/admin/results', icon: BarChart2, label: 'Results' },
  { to: '/admin/notices', icon: Bell, label: 'Notices' },
  { to: '/admin/admissions', icon: GraduationCap, label: 'Admissions' },
  { to: '/admin/sms', icon: MessageSquare, label: 'SMS' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/backup', icon: Database, label: 'Backup' },
];

interface Props { collapsed: boolean; onToggle: () => void; }

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const { signOut, user } = useAuthStore();
  const { settings } = useSettingsStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300',
        'bg-navy-800 border-r border-white/5',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between px-3 h-16 border-b border-white/5 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center shrink-0">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-inter font-bold text-white text-sm truncate">{settings.centerName}</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="text-slate-400 hover:text-white p-1 rounded">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={onToggle} className="mx-auto mt-2 text-slate-400 hover:text-white p-1 rounded">
          <ChevronRight size={16} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3 shrink-0">
        {!collapsed && (
          <div className="px-2 mb-2">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <p className="text-xs font-medium text-sky-400">Administrator</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium',
            'text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
