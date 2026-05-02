import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface StudentSession {
  id: string;
  name: string;
  student_id: string;
  phone: string;
  email?: string;
  class_level?: string;
  batch_id?: string;
  batch_name?: string;
  photo_url?: string;
  status: string;
  is_approved: boolean;
}

interface StudentState {
  student: StudentSession | null;
  setStudent: (s: StudentSession | null) => void;
  logout: () => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      student: null,
      setStudent: (student) => set({ student }),
      logout: () => set({ student: null }),
    }),
    {
      name: 'student-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
