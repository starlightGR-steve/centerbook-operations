import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Student, StudentContact } from '@/lib/types';

/** Fetch all active students */
export function useStudents() {
  return useSWR<Student[]>(
    'students',
    async () => {
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
      const raw = await api.students.get(id);
      // Strip nested objects that the API embeds but Student type doesn't define
      // (primary_contact, billing_contact are full Contact objects — rendering them causes React error #310)
      const { primary_contact, billing_contact, ...student } = raw as Student & { primary_contact?: unknown; billing_contact?: unknown };
      return student as Student;
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch all students (all statuses) for roster view */
export function useAllStudents() {
  return useSWR<Student[]>(
    'all-students',
    async () => {
      return api.students.list();
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch contacts linked to a student */
export function useStudentContacts(studentId: number | null) {
  return useSWR<StudentContact[]>(
    studentId ? `student-contacts-${studentId}` : null,
    async () => {
      if (!studentId) return [];
      return api.students.contacts(studentId);
    },
    { dedupingInterval: 10000 }
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
