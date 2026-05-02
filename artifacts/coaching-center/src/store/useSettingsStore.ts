import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  centerName: string;
  centerAddress: string;
  centerPhone: string;
  centerEmail: string;
  currency: string;
  smsApiKey: string;
  smsSenderId: string;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const defaults: Settings = {
  centerName: 'Coaching Center',
  centerAddress: '',
  centerPhone: '',
  centerEmail: '',
  currency: 'BDT',
  smsApiKey: '',
  smsSenderId: '',
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
