import { useEffect, useState } from 'react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Footer } from '@/components/public/Footer';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Bell, Pin } from 'lucide-react';

export default function NoticeBoardPage() {
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
    <div className="min-h-screen bg-navy-900">
      <PublicNavbar />
      <div className="pt-24 max-w-3xl mx-auto px-4 pb-16">
        <AnimatedSection className="text-center mb-10">
          <h1 className="section-title mb-3">Notice <span className="text-gradient">Board</span></h1>
          <p className="text-slate-400">Stay updated with latest announcements and news.</p>
        </AnimatedSection>
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : notices.length === 0 ? (
          <EmptyState title="No notices yet" description="Check back later for announcements." icon={<Bell size={48} strokeWidth={1.2} />} />
        ) : (
          <div className="space-y-4">
            {notices.map((n, i) => (
              <AnimatedSection key={n.id} delay={i * 60} className="card-glass p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${n.is_pinned ? 'bg-sky-500/15' : 'bg-white/5'}`}>
                    {n.is_pinned ? <Pin size={16} className="text-sky-400" /> : <Bell size={16} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{n.title}</h3>
                      {n.is_pinned && <span className="badge-blue">Pinned</span>}
                      {n.category && <span className="badge-violet">{n.category}</span>}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-2">{n.content}</p>
                    <p className="text-slate-500 text-xs">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
