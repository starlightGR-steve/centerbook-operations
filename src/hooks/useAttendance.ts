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

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest): Promise<Attendance> {
  const result = await api.attendance.checkOut(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}
