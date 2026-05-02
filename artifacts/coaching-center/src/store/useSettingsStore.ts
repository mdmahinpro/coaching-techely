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
  centerName: 'Techely Learning Academy',
  centerTagline: 'Excellence in Education',
  centerAddress: '389 5th Ave, New York, 10016, USA',
  centerPhone: '+16502977656',
  centerEmail: 'coaching@techely.com',
  centerWhatsapp: '8801768836443',
  currency: 'BDT',
  logoUrl: '',
  bannerUrl: '',
  heroTitle: 'Excellence in Education',
  heroSubtitle: 'Expert teachers, modern methods, guaranteed success',
  admissionOpen: true,
  bkashNumber: '01768836443',
  nagadNumber: '01768836443',
  admissionFee: 500,
  smsApiKey: '',
  smsSenderId: 'TechelyAcademy',
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
