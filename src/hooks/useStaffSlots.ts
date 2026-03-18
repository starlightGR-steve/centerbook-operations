import useSWR, { mutate } from 'swr';
import { MOCK_STAFF_SLOTS, MOCK_STAFF } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { StaffSlotAssignment } from '@/lib/types';

// In-memory store for demo mode only
let demoSlots: StaffSlotAssignment[] = [...MOCK_STAFF_SLOTS];

export function useStaffSlots(day?: string, timeSortKey?: number) {
  const { isDemoMode } = useDemoMode();
  const key = `staff-slots-${day || 'all'}-${timeSortKey || 'all'}`;

  return useSWR<StaffSlotAssignment[]>(key, async () => {
    if (!isDemoMode) return []; // No staff slots API yet — return empty in production
    let slots = demoSlots;
    if (day) slots = slots.filter((s) => s.day_of_week === day);
    if (timeSortKey) slots = slots.filter((s) => s.time_sort_key === timeSortKey);
    return slots.map((s) => ({
      ...s,
      staff: MOCK_STAFF.find((st) => st.id === s.staff_id),
    }));
  });
}

export function useAllStaffSlots() {
  const { isDemoMode } = useDemoMode();

  return useSWR<StaffSlotAssignment[]>('staff-slots-all-all', async () => {
    if (!isDemoMode) return []; // No staff slots API yet — return empty in production
    return demoSlots.map((s) => ({
      ...s,
      staff: MOCK_STAFF.find((st) => st.id === s.staff_id),
    }));
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
  if (isDemoModeActive()) {
    demoSlots.push(entry);
  }
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
  return entry;
}

export async function removeStaffFromSlot(assignmentId: number): Promise<void> {
  if (isDemoModeActive()) {
    demoSlots = demoSlots.filter((s) => s.id !== assignmentId);
  }
  mutate((key: string) => typeof key === 'string' && key.startsWith('staff-slots-'), undefined, { revalidate: true });
}
