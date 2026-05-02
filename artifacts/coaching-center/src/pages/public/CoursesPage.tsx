import { useEffect, useState } from 'react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Footer } from '@/components/public/Footer';
import { BatchCard } from '@/components/public/BatchCard';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function CoursesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('batches').select('*').eq('is_active', true);
    if (q) query = query.ilike('name', `%${q}%`);
    query.then(({ data }) => { setBatches(data ?? []); setLoading(false); });
  }, [q]);

  return (
    <div className="min-h-screen bg-navy-900">
      <PublicNavbar />
      <div className="pt-24 max-w-6xl mx-auto px-4 pb-16">
        <AnimatedSection className="text-center mb-12">
          <h1 className="section-title mb-3">Available <span className="text-gradient">Courses</span></h1>
          <p className="text-slate-400 max-w-xl mx-auto">Explore all our active batches and find the perfect fit for your learning journey.</p>
        </AnimatedSection>
        <div className="relative mb-8 max-w-md mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
            placeholder="Search batches…"
          />
        </div>
        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : batches.length === 0 ? (
          <EmptyState title="No courses found" description="Check back later for new batches." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {batches.map((b, i) => <BatchCard key={b.id} batch={b} index={i} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
