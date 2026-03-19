import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_ATTENDANCE, MOCK_STUDENTS } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { Attendance, CheckInRequest, CheckOutRequest } from '@/lib/types';

/** Fetch today's attendance records */
export function useAttendance(date?: string, refreshInterval = 10000) {
  const d = date || new Date().toISOString().split('T')[0];
  const { isDemoMode } = useDemoMode();

  return useSWR<Attendance[]>(
    isDemoMode ? `demo-attendance-${d}` : `attendance-${d}`,
    async () => {
      if (isDemoMode) {
        // Attach student objects to attendance records
        return MOCK_ATTENDANCE.map((a) => ({
          ...a,
          student: MOCK_STUDENTS.find((s) => s.id === a.student_id),
        }));
      }
      return api.attendance.today(d);
    },
    { refreshInterval: isDemoMode ? 0 : refreshInterval, revalidateOnFocus: !isDemoMode }
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
  if (isDemoModeActive()) {
    const d = new Date().toISOString().split('T')[0];
    mutate(`demo-attendance-${d}`);
    return { id: Date.now(), ...data, check_in: new Date().toISOString(), check_out: null, scheduled_time: null, duration_minutes: null, checked_in_by: data.checked_in_by || null, checked_out_by: null, notes: null, session_end_time: null, sms_10min_sent: false, sms_10min_sent_at: null, sms_recipient_phone: null, sms_recipient_name: null, created_at: new Date().toISOString() } as Attendance;
  }
  const result = await api.attendance.checkIn(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}

/** Delete an attendance record (undo check-in) */
export async function deleteAttendance(id: number): Promise<void> {
  await api.attendance.delete(id);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
}

/** Update an attendance record (undo check-out or adjust times) */
export async function updateAttendance(id: number, data: { check_in?: string; check_out?: string | null }): Promise<Attendance> {
  const result = await api.attendance.update(id, data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest): Promise<Attendance> {
  if (isDemoModeActive()) {
    const d = new Date().toISOString().split('T')[0];
    mutate(`demo-attendance-${d}`);
    return { id: Date.now(), student_id: data.student_id, check_in: new Date().toISOString(), check_out: new Date().toISOString(), scheduled_time: null, duration_minutes: 30, checked_in_by: null, checked_out_by: data.checked_out_by || null, source: 'manual', notes: null, session_duration_minutes: 30, session_end_time: null, sms_10min_sent: false, sms_10min_sent_at: null, sms_recipient_phone: null, sms_recipient_name: null, created_at: new Date().toISOString() } as Attendance;
  }
  const result = await api.attendance.checkOut(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}
