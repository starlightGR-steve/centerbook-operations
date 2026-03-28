import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ScheduleOverride } from '@/lib/types';

function overridesKey(weekStart: string) {
  return `schedule-overrides-${weekStart}`;
}

/** Compute ISO Monday date string for a given YYYY-MM-DD date */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon, ...6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/** Fetch schedule overrides for a week. Returns same SWR result shape as before. */
export function useScheduleOverrides(weekStartDate: string) {
  return useSWR<ScheduleOverride[]>(
    weekStartDate ? overridesKey(weekStartDate) : null,
    () => api.scheduleOverrides.list(weekStartDate),
    { dedupingInterval: 10000 }
  );
}

/** Create a schedule override (add / remove / move). Optimistic update with DB persistence. */
export async function createOverride(
  data: Omit<ScheduleOverride, 'id' | 'created_at' | 'student'>
): Promise<ScheduleOverride> {
  const weekStart = getWeekStart(data.effective_date);
  const key = overridesKey(weekStart);

  // Optimistic: append a placeholder entry immediately
  const optimistic: ScheduleOverride = {
    ...data,
    id: -Date.now(),
    created_at: new Date().toISOString(),
  };
  mutate(
    key,
    (current: ScheduleOverride[] | undefined) => [...(current || []), optimistic],
    { revalidate: false }
  );

  try {
    const result = await api.scheduleOverrides.create({
      student_id: data.student_id,
      override_type: data.override_type,
      original_day: data.original_day,
      original_time: data.original_time,
      new_day: data.new_day,
      new_time: data.new_time,
      effective_date: data.effective_date,
      week_start: weekStart,
      reason: data.reason,
    });
    mutate(key); // revalidate with real DB id
    return result;
  } catch (err) {
    console.error('Failed to create schedule override:', err);
    mutate(key); // revert optimistic on failure
    throw err;
  }
}

/** Remove a schedule override by id. Optimistic removal with DB delete. */
export async function removeOverride(overrideId: number): Promise<void> {
  // Optimistically remove from all cached weeks
  mutate(
    (key: unknown) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    (current: ScheduleOverride[] | undefined) =>
      (current || []).filter((o) => o.id !== overrideId),
    { revalidate: false }
  );

  try {
    await api.scheduleOverrides.remove(overrideId);
  } catch (err) {
    console.error('Failed to remove schedule override:', err);
    // Revert optimistic by revalidating all cached weeks
    mutate(
      (key: unknown) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
      undefined,
      { revalidate: true }
    );
    throw err;
  }

  // Confirm server state after successful delete
  mutate(
    (key: unknown) => typeof key === 'string' && key.startsWith('schedule-overrides-'),
    undefined,
    { revalidate: true }
  );
}
