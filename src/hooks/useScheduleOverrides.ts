import useSWR, { mutate } from 'swr';
import { USE_MOCK } from '@/lib/api';
import { MOCK_SCHEDULE_OVERRIDES } from '@/lib/mock-data';
import type { ScheduleOverride } from '@/lib/types';

/** In-memory mock store */
let mockOverrides: ScheduleOverride[] = [...MOCK_SCHEDULE_OVERRIDES];

export function useScheduleOverrides(weekStartDate: string) {
  return useSWR<ScheduleOverride[]>(
    `schedule-overrides-${weekStartDate}`,
    async () => {
      if (USE_MOCK) {
        // Return overrides for the given week (Mon–Sun from weekStartDate)
        const start = new Date(weekStartDate + 'T00:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return mockOverrides.filter((o) => {
          const d = new Date(o.effective_date + 'T00:00:00');
          return d >= start && d < end;
        });
      }
      return [];
    }
  );
}

export async function createOverride(
  data: Omit<ScheduleOverride, 'id' | 'created_at' | 'student'>
): Promise<ScheduleOverride> {
  const entry: ScheduleOverride = {
    ...data,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };
  if (USE_MOCK) {
    mockOverrides.push(entry);
  }
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    undefined,
    { revalidate: true }
  );
  return entry;
}

export async function removeOverride(overrideId: number): Promise<void> {
  if (USE_MOCK) {
    mockOverrides = mockOverrides.filter((o) => o.id !== overrideId);
  }
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    undefined,
    { revalidate: true }
  );
}
