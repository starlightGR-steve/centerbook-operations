import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_TIME_ENTRIES, MOCK_STAFF } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { TimeEntry, ClockInRequest, ClockOutRequest } from '@/lib/types';

/** Fetch today's time entries */
export function useTimeclock(date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  const { isDemoMode } = useDemoMode();

  return useSWR<TimeEntry[]>(
    isDemoMode ? `demo-timeclock-${d}` : `timeclock-${d}`,
    async () => {
      if (isDemoMode) {
        // Filter to today's entries and attach staff objects
        const todayStr = new Date().toISOString().split('T')[0];
        return MOCK_TIME_ENTRIES
          .filter((e) => e.created_at.startsWith(d === todayStr ? todayStr : d))
          .map((e) => ({
            ...e,
            staff: MOCK_STAFF.find((s) => s.id === e.staff_id),
          }));
      }
      return api.timeclock.today(d);
    },
    { refreshInterval: isDemoMode ? 0 : 10000, revalidateOnFocus: !isDemoMode }
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
  if (isDemoModeActive()) {
    const d = new Date().toISOString().split('T')[0];
    mutate(`demo-timeclock-${d}`);
    return { id: Date.now(), staff_id: data.staff_id, clock_in: new Date().toISOString(), clock_out: null, duration_minutes: null, source: data.source, notes: null, created_at: new Date().toISOString() };
  }
  const result = await api.timeclock.clockIn(data);
  const d = new Date().toISOString().split('T')[0];
  mutate(`timeclock-${d}`);
  return result;
}

/** Clock out a staff member */
export async function clockOutStaff(data: ClockOutRequest): Promise<TimeEntry> {
  if (isDemoModeActive()) {
    const d = new Date().toISOString().split('T')[0];
    mutate(`demo-timeclock-${d}`);
    return { id: Date.now(), staff_id: data.staff_id, clock_in: new Date().toISOString(), clock_out: new Date().toISOString(), duration_minutes: 0, source: 'manual', notes: null, created_at: new Date().toISOString() };
  }
  const result = await api.timeclock.clockOut(data);
  const d = new Date().toISOString().split('T')[0];
  mutate(`timeclock-${d}`);
  return result;
}
