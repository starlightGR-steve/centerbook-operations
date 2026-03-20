import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_ABSENCES } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { Absence, CreateAbsenceRequest } from '@/lib/types';

const dateKey = (date: string, demo?: boolean) =>
  demo ? `demo-absences-${date}` : `absences-${date}`;

/** Fetch absences for a date */
export function useAbsences(date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  const { isDemoMode } = useDemoMode();

  return useSWR<Absence[]>(
    dateKey(d, isDemoMode),
    async () => {
      if (isDemoMode) {
        return MOCK_ABSENCES.filter((a) => a.absence_date === d);
      }
      return api.absences.forDate(d);
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Fetch absences for a date range (e.g., a week) */
export function useWeekAbsences(from?: string, to?: string) {
  const { isDemoMode } = useDemoMode();
  const key = from && to ? (isDemoMode ? `demo-absences-${from}-${to}` : `absences-${from}-${to}`) : null;

  return useSWR<Absence[]>(
    key,
    async () => {
      if (!from || !to) return [];
      if (isDemoMode) {
        return MOCK_ABSENCES.filter((a) => a.absence_date >= from && a.absence_date <= to);
      }
      return api.absences.forRange(from, to);
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Create an absence record */
export async function createAbsence(data: CreateAbsenceRequest): Promise<Absence> {
  if (isDemoModeActive()) {
    const absence: Absence = {
      id: Date.now(),
      student_id: data.student_id,
      absence_date: data.absence_date,
      reason: data.reason,
      vacation_start: data.vacation_start ?? null,
      vacation_end: data.vacation_end ?? null,
      makeup_scheduled: data.makeup_scheduled ?? false,
      makeup_date: data.makeup_date ?? null,
      makeup_time: data.makeup_time ?? null,
      homework_out: data.homework_out ?? false,
      notes: data.notes ?? null,
      created_by: data.created_by ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_ABSENCES.push(absence);
    mutate(dateKey(data.absence_date, true));
    return absence;
  }
  const result = await api.absences.create(data);
  mutate(dateKey(data.absence_date));
  return result;
}
