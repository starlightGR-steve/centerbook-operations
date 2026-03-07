import useSWR, { mutate } from 'swr';
import { MOCK_SCHEDULE_OVERRIDES } from '@/lib/mock-data';
import type { ScheduleOverride } from '@/lib/types';

// In-memory store — future: replace with api.scheduleOverrides.*
let overrides: ScheduleOverride[] = [...MOCK_SCHEDULE_OVERRIDES];

export function useScheduleOverrides(weekStartDate: string) {
  return useSWR<ScheduleOverride[]>(
    `schedule-overrides-${weekStartDate}`,
    async () => {
      // Return overrides for the given week (Mon–Sun from weekStartDate)
      const start = new Date(weekStartDate + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return overrides.filter((o) => {
        const d = new Date(o.effective_date + 'T00:00:00');
        return d >= start && d < end;
      });
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
  overrides.push(entry);
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    undefined,
    { revalidate: true }
  );
  return entry;
}

export async function removeOverride(overrideId: number): Promise<void> {
  overrides = overrides.filter((o) => o.id !== overrideId);
  mutate(
    (key: string) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    undefined,
    { revalidate: true }
  );
}
