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

/** Period-ranged time entries across all staff. Backs the Staff hours table,
 *  StaffDetailModal time log, and the Me-page hours section. 30s refresh —
 *  reporting cadence, not live status (use useTimeclock for the latter). */
export function useTimeclockRange(from: string, to: string) {
  return useSWR<TimeEntry[]>(
    `timeclock-range-${from}-${to}`,
    async () => {
      return api.timeclock.range(from, to);
    },
    { refreshInterval: 30000 }
  );
}

/** Staff currently clocked in (clock_out is null) */
export function useClockedInStaff(date?: string) {
  const { data: entries, ...rest } = useTimeclock(date);
  const clockedIn = entries?.filter((e) => e.clock_out === null);
  return { data: clockedIn, ...rest };
}

/** Invalidate every active timeclock SWR cache key (today + range variants).
 *  Called after any write (clock-in, clock-out, manual entry) so the kiosk
 *  live status, the staff hours table, and the Me-page hours all refresh in
 *  one shot — otherwise the surface that didn't initiate the write would
 *  wait up to its refreshInterval to catch up. */
function mutateAllTimeclock() {
  return mutate(
    (key) => typeof key === 'string' && key.startsWith('timeclock-'),
    undefined,
    { revalidate: true }
  );
}

/** Clock in a staff member */
export async function clockInStaff(data: ClockInRequest): Promise<TimeEntry> {
  const result = await api.timeclock.clockIn(data);
  await mutateAllTimeclock();
  return result;
}

/** Clock out a staff member */
export async function clockOutStaff(data: ClockOutRequest): Promise<TimeEntry> {
  const result = await api.timeclock.clockOut(data);
  await mutateAllTimeclock();
  return result;
}

export { mutateAllTimeclock };
