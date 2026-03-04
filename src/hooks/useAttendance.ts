import useSWR, { mutate } from 'swr';
import { api, USE_MOCK } from '@/lib/api';
import { MOCK_ATTENDANCE, MOCK_STUDENTS } from '@/lib/mock-data';
import type { Attendance, CheckInRequest, CheckOutRequest } from '@/lib/types';

// In-memory mock store so mutations persist within session
let mockAttendance = [...MOCK_ATTENDANCE];

/** Fetch today's attendance records */
export function useAttendance(date?: string, refreshInterval = 10000) {
  const d = date || new Date().toISOString().split('T')[0];

  return useSWR<Attendance[]>(
    `attendance-${d}`,
    async () => {
      if (USE_MOCK) {
        return mockAttendance.map((a) => ({
          ...a,
          student: MOCK_STUDENTS.find((s) => s.id === a.student_id),
        }));
      }
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
  const now = new Date().toISOString();
  const sessionEnd = new Date(
    Date.now() + data.session_duration_minutes * 60000
  ).toISOString();

  if (USE_MOCK) {
    const entry: Attendance = {
      id: Date.now(),
      student_id: data.student_id,
      check_in: now,
      check_out: null,
      scheduled_time: null,
      duration_minutes: null,
      checked_in_by: data.checked_in_by || null,
      checked_out_by: null,
      source: data.source,
      notes: null,
      session_duration_minutes: data.session_duration_minutes,
      session_end_time: sessionEnd,
      sms_10min_sent: false,
      sms_10min_sent_at: null,
      sms_recipient_phone: null,
      sms_recipient_name: null,
      created_at: now,
    };
    mockAttendance.push(entry);
    const d = new Date().toISOString().split('T')[0];
    await mutate(`attendance-${d}`);
    return entry;
  }
  const result = await api.attendance.checkIn(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}

/** Check out a student */
export async function checkOutStudent(data: CheckOutRequest): Promise<Attendance> {
  const now = new Date().toISOString();

  if (USE_MOCK) {
    const idx = mockAttendance.findIndex(
      (a) => a.student_id === data.student_id && a.check_out === null
    );
    if (idx >= 0) {
      const checkIn = new Date(mockAttendance[idx].check_in);
      const duration = Math.floor((Date.now() - checkIn.getTime()) / 60000);
      mockAttendance[idx] = {
        ...mockAttendance[idx],
        check_out: now,
        checked_out_by: data.checked_out_by || null,
        duration_minutes: duration,
      };
      const d = new Date().toISOString().split('T')[0];
      await mutate(`attendance-${d}`);
      return mockAttendance[idx];
    }
    // Fallback
    const entry: Attendance = {
      id: Date.now(),
      student_id: data.student_id,
      check_in: now,
      check_out: now,
      scheduled_time: null,
      duration_minutes: 0,
      checked_in_by: null,
      checked_out_by: data.checked_out_by || null,
      source: 'kiosk',
      notes: null,
      session_duration_minutes: 60,
      session_end_time: now,
      sms_10min_sent: false,
      sms_10min_sent_at: null,
      sms_recipient_phone: null,
      sms_recipient_name: null,
      created_at: now,
    };
    const d = new Date().toISOString().split('T')[0];
    await mutate(`attendance-${d}`);
    return entry;
  }
  const result = await api.attendance.checkOut(data);
  const d = new Date().toISOString().split('T')[0];
  await mutate(`attendance-${d}`);
  return result;
}
