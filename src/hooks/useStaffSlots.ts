import useSWR, { mutate } from 'swr';
import { getCenterToday } from '@/lib/dates';
import type { StaffSlotAssignment } from '@/lib/types';

// No staff slots API yet — return empty arrays in production

export function useStaffSlots(day?: string, timeSortKey?: number) {
  const key = `staff-slots-${day || 'all'}-${timeSortKey || 'all'}`;

  return useSWR<StaffSlotAssignment[]>(key, async () => {
    return [];
  });
}

export function useAllStaffSlots() {
  return useSWR<StaffSlotAssignment[]>('staff-slots-all-all', async () => {
    return [];
  });
}

export async function assignStaffToSlot(
  staffId: number,
  day: string,
  timeSortKey: number
): Promise<StaffSlotAssignment> {
  const entry: StaffSlotAssignment = {
    id: Date.now(),
    staff_id: staffId,
    day_of_week: day,
    time_sort_key: timeSortKey,
    effective_from: getCenterToday(),
    effective_to: null,
    created_at: new Date().toISOString(),
  };
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
  return entry;
}

export async function removeStaffFromSlot(assignmentId: number): Promise<void> {
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
}
