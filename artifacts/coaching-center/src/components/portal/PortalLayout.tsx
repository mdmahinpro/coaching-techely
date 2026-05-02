import { PortalNav } from './PortalNav';

interface Props { children: React.ReactNode; }

export function PortalLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-navy-900">
      <PortalNav />
      <main className="pt-16 max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
