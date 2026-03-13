import useSWR from 'swr';
import { api } from '@/lib/api';
import { MOCK_STUDENTS } from '@/lib/mock-data';
import { useDemoMode } from '@/context/MockDataContext';
import type { Student } from '@/lib/types';

/** Fetch all active students */
export function useStudents() {
  const { isDemoMode } = useDemoMode();

  return useSWR<Student[]>(
    isDemoMode ? 'demo-students' : 'students',
    async () => {
      if (isDemoMode) return MOCK_STUDENTS.filter((s) => s.enrollment_status === 'Active');
      const all = await api.students.list();
      return all.filter((s) => s.enrollment_status === 'Active');
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Fetch a single student by ID */
export function useStudent(id: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<Student | null>(
    id ? (isDemoMode ? `demo-student-${id}` : `student-${id}`) : null,
    async () => {
      if (!id) return null;
      if (isDemoMode) return MOCK_STUDENTS.find((s) => s.id === id) || null;
      return api.students.get(id);
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Filter students scheduled for a specific day */
export function useStudentsForDay(day: string) {
  const { data: students, ...rest } = useStudents();

  const filtered = students?.filter((s) => {
    if (!s.class_schedule_days) return false;
    return s.class_schedule_days
      .split(',')
      .map((d) => d.trim())
      .includes(day);
  });

  return { data: filtered, ...rest };
}
