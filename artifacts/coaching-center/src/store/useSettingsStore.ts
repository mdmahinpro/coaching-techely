import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  centerName: string;
  centerTagline: string;
  centerAddress: string;
  centerPhone: string;
  centerEmail: string;
  centerWhatsapp: string;
  currency: string;
  logoUrl: string;
  bannerUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  admissionOpen: boolean;
  bkashNumber: string;
  nagadNumber: string;
  admissionFee: number;
  smsApiKey: string;
  smsSenderId: string;
  statStudents: number;
  statTeachers: number;
  statBatches: number;
  statSuccessRate: number;
  statAutoFromDb: boolean;
  socialFacebook: string;
  socialYoutube: string;
  socialInstagram: string;
  primaryColor: string;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const defaults: Settings = {
  centerName: 'Coaching Center',
  centerTagline: 'শিক্ষায় আলোকিত হোক ভবিষ্যৎ',
  centerAddress: '',
  centerPhone: '',
  centerEmail: '',
  centerWhatsapp: '',
  currency: 'BDT',
  logoUrl: '',
  bannerUrl: '',
  heroTitle: 'সেরা শিক্ষার সুযোগ',
  heroSubtitle: 'দক্ষ শিক্ষক, আধুনিক পদ্ধতি, নিশ্চিত সাফল্য',
  admissionOpen: true,
  bkashNumber: '',
  nagadNumber: '',
  admissionFee: 500,
  smsApiKey: '',
  smsSenderId: '',
  statStudents: 0,
  statTeachers: 0,
  statBatches: 0,
  statSuccessRate: 95,
  statAutoFromDb: true,
  socialFacebook: '',
  socialYoutube: '',
  socialInstagram: '',
  primaryColor: '#38bdf8',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaults,
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    { name: 'coaching-center-settings' }
  )
);
