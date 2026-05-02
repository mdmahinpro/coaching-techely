import { Bell, Search, Menu } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/useAuthStore';

interface Props {
  title: string;
  onMenuToggle?: () => void;
}

export function AdminHeader({ title, onMenuToggle }: Props) {
  const { user } = useAuthStore();
  const name = user?.user_metadata?.name ?? user?.email ?? 'Admin';

  return (
    <header className="h-16 bg-navy-800/60 backdrop-blur-sm border-b border-white/5 flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="md:hidden text-slate-400 hover:text-white p-1 rounded"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-inter font-bold text-white text-lg flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-sky-400 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar name={name} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-white truncate max-w-[120px]">{name}</span>
        </div>
      </div>
    </header>
  );
}
