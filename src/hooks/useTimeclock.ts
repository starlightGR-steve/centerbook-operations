import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { TimeEntry, ClockInRequest, ClockOutRequest } from '@/lib/types';

/** Fetch today's time entries */
export function useTimeclock(date?: string) {
  const d = date || getCenterToday();

  return useSWR<TimeEntry[]>(
    `timeclock-${d}`,
    async () => {
      return api.timeclock.today(d);
    },
    { refreshInterval: 10000 }
  );
}

/** Staff currently clocked in (clock_out is null) */
export function useClockedInStaff(date?: string) {
  const { data: entries, ...rest } = useTimeclock(date);
  const clockedIn = entries?.filter((e) => e.clock_out === null);
  return { data: clockedIn, ...rest };
}

/** Clock in a staff member */
export async function clockInStaff(data: ClockInRequest): Promise<TimeEntry> {
  const result = await api.timeclock.clockIn(data);
  const d = getCenterToday();
  mutate(`timeclock-${d}`);
  return result;
}

/** Clock out a staff member */
export async function clockOutStaff(data: ClockOutRequest): Promise<TimeEntry> {
  const result = await api.timeclock.clockOut(data);
  const d = getCenterToday();
  mutate(`timeclock-${d}`);
  return result;
}
