import useSWR from 'swr';
import { api, USE_MOCK } from '@/lib/api';
import { MOCK_STUDENTS } from '@/lib/mock-data';
import type { Student } from '@/lib/types';

/** Fetch all active students */
export function useStudents() {
  return useSWR<Student[]>(
    'students',
    async () => {
      if (USE_MOCK) return MOCK_STUDENTS;
      const all = await api.students.list();
      return all.filter((s) => s.enrollment_status === 'Active');
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch a single student by ID */
export function useStudent(id: number | null) {
  return useSWR<Student | null>(
    id ? `student-${id}` : null,
    async () => {
      if (!id) return null;
      if (USE_MOCK) return MOCK_STUDENTS.find((s) => s.id === id) ?? null;
      return api.students.get(id);
    },
    { dedupingInterval: 5000 }
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
