import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { Attendance, CheckInRequest, CheckOutRequest } from '@/lib/types';

/** Fetch today's attendance records (date-filtered) */
export function useAttendance(date?: string, refreshInterval = 10000) {
  const d = date || getCenterToday();

  return useSWR<Attendance[]>(
    `attendance-${d}`,
    async () => {
      return api.attendance.today(d);
    },
    { refreshInterval }
  );
}

/** Fetch all active (currently checked-in) attendance records regardless of date */
export function useActiveAttendance(refreshInterval = 5000) {
  return useSWR<Attendance[]>(
    'attendance-active',
    () => api.attendance.active(),
    { refreshInterval }
  );
}

/** Students currently checked in (check_out is null) — legacy helper */
export function useCheckedInStudents(date?: string, refreshInterval?: number) {
  const { data: attendance, ...rest } = useAttendance(date, refreshInterval);
  const checkedIn = attendance?.filter((a) => a.check_out === null);
  return { data: checkedIn, ...rest };
}

/** Revalidate both attendance caches */
async function revalidateAll(date?: string) {
  const d = date || getCenterToday();
  await Promise.all([
    mutate(`attendance-${d}`),
    mutate('attendance-active'),
  ]);
}

/** Check in a student */
export async function checkInStudent(data: CheckInRequest, date?: string): Promise<Attendance> {
  const result = await api.attendance.checkIn(data);
  await revalidateAll(date);
  return result;
}

/** Delete an attendance record (undo check-in). Treats 404 as already deleted. */
export async function deleteAttendance(id: number, date?: string): Promise<void> {
  try {
    await api.attendance.delete(id);
  } catch (err: unknown) {
    // 404 means the record is already gone (stale SWR cache) — just revalidate
    const e = err as Record<string, unknown>;
    const is404 = e?.status === 404 || (typeof e?.message === 'string' && e.message.includes('404'));
    if (!is404) throw err;
  }
  await revalidateAll(date);
}

/** Update an attendance record (undo check-out, adjust times, or change duration) */
export async function updateAttendance(id: number, data: { check_in?: string; check_out?: string | null; session_duration_minutes?: number }, date?: string): Promise<Attendance> {
  const result = await api.attendance.update(id, data);
  await revalidateAll(date);
  return result;
}

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest, date?: string): Promise<Attendance> {
  const result = await api.attendance.checkOut(data);
  await revalidateAll(date);
  return result;
}
