import { Link } from 'react-router-dom';
import { GraduationCap, Phone, Mail, MapPin } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function Footer() {
  const { settings } = useSettingsStore();
  return (
    <footer className="bg-navy-800 border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-inter font-bold text-white">{settings.centerName}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Empowering students with quality education and personalized guidance.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Quick Links</h4>
          <div className="space-y-2">
            {[['/', 'Home'], ['/courses', 'Courses'], ['/admission', 'Admission'], ['/notices', 'Notice Board'], ['/contact', 'Contact']].map(([to, label]) => (
              <Link key={to} to={to} className="block text-slate-400 hover:text-sky-400 text-sm transition-colors">{label}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Contact</h4>
          <div className="space-y-2 text-sm text-slate-400">
            {settings.centerPhone && <p className="flex items-center gap-2"><Phone size={14} /> {settings.centerPhone}</p>}
            {settings.centerEmail && <p className="flex items-center gap-2"><Mail size={14} /> {settings.centerEmail}</p>}
            {settings.centerAddress && <p className="flex items-center gap-2"><MapPin size={14} /> {settings.centerAddress}</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-slate-500 text-xs">
        © {new Date().getFullYear()} {settings.centerName}. All rights reserved.
      </div>
    </footer>
  );
}
