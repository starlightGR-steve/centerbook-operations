import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Absence, CreateAbsenceRequest } from '@/lib/types';

const dateKey = (date: string) => `absences-${date}`;

/** Fetch absences for a date */
export function useAbsences(date?: string) {
  const d = date || new Date().toISOString().split('T')[0];

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
