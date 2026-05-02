import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Footer } from '@/components/public/Footer';
import { HeroSection } from '@/components/public/HeroSection';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { BatchCard } from '@/components/public/BatchCard';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('batches')
      .select('*')
      .eq('is_active', true)
      .limit(6)
      .then(({ data }) => setBatches(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PublicNavbar />
      <HeroSection />
      {batches.length > 0 && (
        <AnimatedSection className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="section-title text-center mb-2">Our Batches</h2>
          <p className="text-slate-400 text-center mb-10">Join a batch that fits your schedule</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {batches.map((b, i) => <BatchCard key={b.id} batch={b} index={i} />)}
          </div>
        </AnimatedSection>
      )}
      <Footer />
    </div>
  );
}
