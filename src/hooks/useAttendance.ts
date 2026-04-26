import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { Attendance, CheckInRequest, CheckOutRequest, RowAssignmentFlags } from '@/lib/types';

/**
 * Normalize an attendance row from the API.
 *
 * pending_class_prep arrives as a JSON-encoded string from GET /attendance
 * (same convention cb_row_assignments.flags uses). POST /attendance/checkin
 * returns it already parsed. Touching the field once at the SWR boundary keeps
 * downstream consumers from having to type-guard string-vs-object everywhere.
 */
function normalizeAttendance(a: Attendance): Attendance {
  if (typeof a.pending_class_prep === 'string') {
    let parsed: RowAssignmentFlags | null = null;
    try {
      parsed = JSON.parse(a.pending_class_prep) as RowAssignmentFlags;
    } catch {
      parsed = null;
    }
    return { ...a, pending_class_prep: parsed };
  }
  return a;
}

/** Fetch today's attendance records (date-filtered) */
export function useAttendance(date?: string, refreshInterval = 10000) {
  const d = date || getCenterToday();

  return useSWR<Attendance[]>(
    `attendance-${d}`,
    async () => {
      const rows = await api.attendance.today(d);
      return rows.map(normalizeAttendance);
    },
    { refreshInterval }
  );
}

/** Fetch all active (currently checked-in) attendance records regardless of date */
export function useActiveAttendance(refreshInterval = 5000) {
  return useSWR<Attendance[]>(
    'attendance-active',
    async () => {
      const rows = await api.attendance.active();
      return rows.map(normalizeAttendance);
    },
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

/** Check in a student.
 *  After the network success: push the new row into the SWR cache directly
 *  (so the UI feels instant on the same tablet) and trigger a revalidate so
 *  other consumers re-sync. The POST response already has pending_class_prep
 *  parsed, so no normalization needed for the local cache push. */
export async function checkInStudent(data: CheckInRequest, date?: string): Promise<Attendance> {
  const result = await api.attendance.checkIn(data);
  const d = date || getCenterToday();
  const append = (prev: Attendance[] | undefined): Attendance[] => {
    if (!prev) return [result];
    // Replace existing row if the API recycled an id (rare); otherwise append.
    const idx = prev.findIndex((a) => a.id === result.id);
    if (idx >= 0) {
      const next = prev.slice();
      next[idx] = result;
      return next;
    }
    return [...prev, result];
  };
  await Promise.all([
    mutate(`attendance-${d}`, append, { revalidate: false }),
    mutate('attendance-active', append, { revalidate: false }),
  ]);
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

/** Update an attendance record (undo check-out, adjust times, change duration,
 *  write lifecycle status, or replace pending_class_prep). After the network
 *  success: optimistically merge the response into both SWR caches so the
 *  same-tablet UI updates without waiting for the next poll. */
export async function updateAttendance(
  id: number,
  data: {
    check_in?: string;
    check_out?: string | null;
    session_duration_minutes?: number;
    status?: 'checked-in' | 'row-complete';
    pending_class_prep?: RowAssignmentFlags | null;
  },
  date?: string,
): Promise<Attendance> {
  const result = await api.attendance.update(id, data);
  const d = date || getCenterToday();
  const replace = (prev: Attendance[] | undefined): Attendance[] | undefined => {
    if (!prev) return prev;
    const idx = prev.findIndex((a) => a.id === id);
    if (idx < 0) return prev;
    const next = prev.slice();
    next[idx] = result;
    return next;
  };
  await Promise.all([
    mutate(`attendance-${d}`, replace, { revalidate: false }),
    mutate('attendance-active', replace, { revalidate: false }),
  ]);
  await revalidateAll(date);
  return result;
}

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest, date?: string): Promise<Attendance> {
  const result = await api.attendance.checkOut(data);
  await revalidateAll(date);
  return result;
}
