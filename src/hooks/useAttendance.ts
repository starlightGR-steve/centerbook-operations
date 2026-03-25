import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Attendance, CheckInRequest, CheckOutRequest } from '@/lib/types';

/** Fetch today's attendance records */
export function useAttendance(date?: string, refreshInterval = 10000) {
  const d = date || new Date().toISOString().split('T')[0];

  return useSWR<Attendance[]>(
    `attendance-${d}`,
    async () => {
      return api.attendance.today(d);
    },
    { refreshInterval }
  );
}

/** Students currently checked in (check_out is null) */
export function useCheckedInStudents(date?: string, refreshInterval?: number) {
  const { data: attendance, ...rest } = useAttendance(date, refreshInterval);
  const checkedIn = attendance?.filter((a) => a.check_out === null);
  return { data: checkedIn, ...rest };
}

/** Check in a student */
export async function checkInStudent(data: CheckInRequest): Promise<Attendance> {
  const result = await api.attendance.checkIn(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}

/** Delete an attendance record (undo check-in). Treats 404 as already deleted. */
export async function deleteAttendance(id: number): Promise<void> {
  try {
    await api.attendance.delete(id);
  } catch (err: unknown) {
    // 404 means the record is already gone (stale SWR cache) — just revalidate
    const e = err as Record<string, unknown>;
    const is404 = e?.status === 404 || (typeof e?.message === 'string' && e.message.includes('404'));
    if (!is404) throw err;
  }
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
}

/** Update an attendance record (undo check-out, adjust times, or change duration) */
export async function updateAttendance(id: number, data: { check_in?: string; check_out?: string | null; session_duration_minutes?: number }): Promise<Attendance> {
  const result = await api.attendance.update(id, data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest): Promise<Attendance> {
  const result = await api.attendance.checkOut(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}
