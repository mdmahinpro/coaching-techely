import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <AdminHeader title={title} onMenuToggle={() => setCollapsed(c => !c)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
