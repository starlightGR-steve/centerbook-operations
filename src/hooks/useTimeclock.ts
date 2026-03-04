import useSWR, { mutate } from 'swr';
import { api, useMockFor } from '@/lib/api';
import { MOCK_TIME_ENTRIES, MOCK_STAFF } from '@/lib/mock-data';
import type { TimeEntry, ClockInRequest, ClockOutRequest } from '@/lib/types';

const MOCK = useMockFor('timeclock');

/** In-memory mock store so mutations persist across SWR refetches */
let mockTimeEntries: TimeEntry[] = [...MOCK_TIME_ENTRIES];

/** Fetch today's time entries */
export function useTimeclock(date?: string) {
  const d = date || new Date().toISOString().split('T')[0];

  return useSWR<TimeEntry[]>(
    `timeclock-${d}`,
    async () => {
      if (MOCK) {
        return mockTimeEntries.map((t) => ({
          ...t,
          staff: MOCK_STAFF.find((s) => s.id === t.staff_id),
        }));
      }
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
  if (MOCK) {
    const entry: TimeEntry = {
      id: Date.now(),
      staff_id: data.staff_id,
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_minutes: null,
      source: data.source,
      notes: null,
      created_at: new Date().toISOString(),
    };
    mockTimeEntries.push(entry);
    const d = new Date().toISOString().split('T')[0];
    mutate(`timeclock-${d}`);
    return entry;
  }
  const result = await api.timeclock.clockIn(data);
  const d = new Date().toISOString().split('T')[0];
  mutate(`timeclock-${d}`);
  return result;
}

/** Clock out a staff member */
export async function clockOutStaff(data: ClockOutRequest): Promise<TimeEntry> {
  if (MOCK) {
    const existing = mockTimeEntries.find(
      (e) => e.staff_id === data.staff_id && e.clock_out === null
    );
    if (existing) {
      const clockIn = new Date(existing.clock_in);
      const clockOut = new Date();
      existing.clock_out = clockOut.toISOString();
      existing.duration_minutes = Math.round(
        (clockOut.getTime() - clockIn.getTime()) / 60000
      );
    }
    const d = new Date().toISOString().split('T')[0];
    mutate(`timeclock-${d}`);
    return existing || ({} as TimeEntry);
  }
  const result = await api.timeclock.clockOut(data);
  const d = new Date().toISOString().split('T')[0];
  mutate(`timeclock-${d}`);
  return result;
}
