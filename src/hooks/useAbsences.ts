import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { Absence, CreateAbsenceRequest } from '@/lib/types';

const dateKey = (date: string) => `absences-${date}`;

/** Fetch absences for a date */
export function useAbsences(date?: string) {
  const d = date || getCenterToday();

  return useSWR<Absence[]>(
    dateKey(d),
    async () => {
      return api.absences.forDate(d);
    },
    { dedupingInterval: 5000 }
  );
}

/** Fetch absences for a date range (e.g., a week) */
export function useWeekAbsences(from?: string, to?: string) {
  const key = from && to ? `absences-${from}-${to}` : null;

  return useSWR<Absence[]>(
    key,
    async () => {
      if (!from || !to) return [];
      return api.absences.forRange(from, to);
    },
    { dedupingInterval: 5000 }
  );
}

/** Create an absence record */
export async function createAbsence(data: CreateAbsenceRequest): Promise<Absence> {
  const result = await api.absences.create(data);
  mutate(dateKey(data.absence_date));
  return result;
}

const studentKey = (studentId: number) => `absences-student-${studentId}`;

/** Fetch all absences for a specific student */
export function useStudentAbsences(studentId: number) {
  return useSWR<Absence[]>(
    studentKey(studentId),
    () => api.absences.forStudent(studentId),
    { dedupingInterval: 5000 }
  );
}

/** Delete an absence record and revalidate the student's absence list */
export async function deleteAbsence(id: number, studentId: number): Promise<void> {
  await api.absences.delete(id);
  mutate(studentKey(studentId));
}
