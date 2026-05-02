import { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell, Pin } from 'lucide-react';

export default function PortalNoticePage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('notices')
      .select('*')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => { setNotices(data ?? []); setLoading(false); });
  }, []);

  return (
    <PortalLayout>
      <h1 className="font-inter font-bold text-2xl text-white mb-6">Notice Board</h1>
      {loading ? <LoadingSkeleton rows={4} /> : notices.length === 0 ? (
        <EmptyState title="No notices" description="Notices will appear here." icon={<Bell size={48} strokeWidth={1.2} />} />
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <div key={n.id} className={`card p-5 ${n.is_pinned ? 'border-sky-500/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${n.is_pinned ? 'bg-sky-500/15' : 'bg-white/5'}`}>
                  {n.is_pinned ? <Pin size={15} className="text-sky-400" /> : <Bell size={15} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{n.title}</h3>
                    {n.is_pinned && <span className="badge-blue">Pinned</span>}
                    {n.category && <span className="badge-violet">{n.category}</span>}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{n.content}</p>
                  <p className="text-slate-500 text-xs mt-2">{formatDate(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
