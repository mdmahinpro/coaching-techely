import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type Role = 'admin' | 'student' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setRole: (role: Role) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = session.user.user_metadata?.role as Role ?? null;
      set({ user: session.user, session, role, loading: false, initialized: true });
    } else {
      set({ user: null, session: null, role: null, loading: false, initialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role as Role ?? null;
        set({ user: session.user, session, role });
      } else {
        set({ user: null, session: null, role: null });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      return { error: error.message };
    }
    const role = data.user?.user_metadata?.role as Role ?? null;
    set({ user: data.user, session: data.session, role, loading: false });
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null });
  },

  setRole: (role: Role) => set({ role }),
}));
