import useSWR, { mutate } from 'swr';
import { USE_MOCK } from '@/lib/api';
import { MOCK_STAFF_SLOTS, MOCK_STAFF } from '@/lib/mock-data';
import type { StaffSlotAssignment } from '@/lib/types';

/** In-memory mock store */
let mockStaffSlots: StaffSlotAssignment[] = [...MOCK_STAFF_SLOTS];

export function useStaffSlots(day?: string, timeSortKey?: number) {
  const key = `staff-slots-${day || 'all'}-${timeSortKey || 'all'}`;

  return useSWR<StaffSlotAssignment[]>(key, async () => {
    if (USE_MOCK) {
      let slots = mockStaffSlots;
      if (day) slots = slots.filter((s) => s.day_of_week === day);
      if (timeSortKey) slots = slots.filter((s) => s.time_sort_key === timeSortKey);
      return slots.map((s) => ({
        ...s,
        staff: MOCK_STAFF.find((st) => st.id === s.staff_id),
      }));
    }
    // Future: api call
    return [];
  });
}

export function useAllStaffSlots() {
  return useSWR<StaffSlotAssignment[]>('staff-slots-all-all', async () => {
    if (USE_MOCK) {
      return mockStaffSlots.map((s) => ({
        ...s,
        staff: MOCK_STAFF.find((st) => st.id === s.staff_id),
      }));
    }
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
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: null,
    created_at: new Date().toISOString(),
  };
  if (USE_MOCK) {
    mockStaffSlots.push(entry);
  }
  // Revalidate all staff slot keys
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
  return entry;
}

export async function removeStaffFromSlot(assignmentId: number): Promise<void> {
  if (USE_MOCK) {
    mockStaffSlots = mockStaffSlots.filter((s) => s.id !== assignmentId);
  }
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
}
