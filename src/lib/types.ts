/* ═══════════════════════════════════════════
   TypeScript interfaces for all cb_* entities
   Matches database schemas + API response shapes
   ═══════════════════════════════════════════ */

// ── API Response Envelope ──────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// ── Students ───────────────────────────────

export interface Student {
  id: number;
  system_id: string;
  clickup_task_id: string | null;
  first_name: string;
  last_name: string;
  student_id: string | null;
  date_of_birth: string | null;
  grade_level: string | null;
  school: string | null;
  medical_notes: string | null;
  enrollment_status: 'Active' | 'On Hold' | 'Withdrawn' | 'Inactive';
  program_type: 'Paper' | 'Digital' | null;
  subjects: string; // "Math, Reading" — comma-separated
  enroll_date: string | null;
  classroom_position: 'Early Learners' | 'Main Classroom' | 'Upper Classroom' | null;
  class_schedule_days: string | null; // "Monday, Wednesday" — comma-separated
  class_time_sort_key: number | null; // 1500, 1530, etc.
  current_level_math: string | null;
  current_level_reading: string | null;
  ashr_math_status: 'Not Yet ASHR' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null;
  ashr_reading_status: 'Not Yet ASHR' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null;
  primary_contact_id: number | null;
  billing_contact_id: number | null;
  created_at: string;
  updated_at: string;
}

// Parsed subjects as array for UI consumption
export type SubjectType = 'Math' | 'Reading';

// ── Contacts ───────────────────────────────

export interface Contact {
  id: number;
  system_id: string;
  clickup_task_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  relationship_to_students: string | null;
  preferred_contact_method: 'Text' | 'Call' | 'Email' | null;
  portal_access_enabled: 0 | 1;
  wp_user_id: number | null;
  created_at: string;
  updated_at: string;
}

// ── Families (read-only for Operations — sales pipeline) ──

export interface Family {
  id: number;
  system_id: string;
  clickup_task_id: string | null;
  lead_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Staff ──────────────────────────────────

export type StaffRole =
  | 'Owner'
  | 'Instruction Manager'
  | 'Center Manager'
  | 'Project Manager'
  | 'Teacher'
  | 'Grader';

export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';

export interface Staff {
  id: number;
  clickup_task_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  role: StaffRole;
  hire_date: string | null;
  wp_user_id: number | null;
  pin: string | null; // 4-digit PIN for kiosk auth
  status: StaffStatus;
  created_at: string;
  updated_at: string;
}

// ── Attendance (Kiosk) ─────────────────────

export interface Attendance {
  id: number;
  student_id: number;
  check_in: string; // ISO datetime
  check_out: string | null; // NULL = still checked in
  scheduled_time: string | null; // "3:00 PM"
  duration_minutes: number | null; // Calculated on check-out
  checked_in_by: string | null;
  checked_out_by: string | null;
  source: 'kiosk' | 'manual' | 'barcode';
  notes: string | null;
  // SMS notification fields
  session_duration_minutes: number; // 30 or 60, derived from subjects
  session_end_time: string | null; // Computed: check_in + duration
  sms_10min_sent: boolean; // Prevents duplicate sends
  sms_10min_sent_at: string | null; // When the SMS was sent
  sms_recipient_phone: string | null; // Cached from primary contact
  sms_recipient_name: string | null; // Cached from primary contact
  created_at: string;
  // Joined fields (populated by API)
  student?: Student;
}

export interface CheckInRequest {
  student_id: number;
  source: 'kiosk' | 'manual' | 'barcode';
  checked_in_by?: string;
  session_duration_minutes: number; // Frontend sends this based on subjects
}

export interface CheckOutRequest {
  student_id: number;
  checked_out_by?: string;
}

// ── Time Entries (Staff Timeclock) ──────────

export interface TimeEntry {
  id: number;
  staff_id: number;
  clock_in: string;
  clock_out: string | null; // NULL = currently clocked in
  duration_minutes: number | null;
  source: 'kiosk' | 'manual' | 'barcode';
  notes: string | null;
  created_at: string;
  // Joined fields
  staff?: Staff;
}

export interface ClockInRequest {
  staff_id: number;
  source: 'kiosk' | 'manual' | 'barcode';
}

export interface ClockOutRequest {
  staff_id: number;
}

// ── Classroom Layout ─────────────────────────

export type ClassroomPositionName = 'Early Learners' | 'Main Classroom' | 'Upper Classroom';

export interface ClassroomRow {
  id: string;               // "el1", "m1", "upper"
  label: string;            // "EL Row 1", "Row 1", "Upper Row"
  tables: number;           // tables in this row
  seatsPerTable: number;    // seats per table
  teacher: string;          // assigned teacher name
  ratio?: string;           // e.g. "1:2" for EL rows
  advanced?: boolean;       // Upper Classroom flag
}

export interface ClassroomSection {
  id: string;               // "sec-el", "sec-main", "sec-upper"
  name: ClassroomPositionName;
  desc: string;
  color: string;            // CSS color
  rows: ClassroomRow[];
}

// ── Student Notes ──────────────────────────

export type NoteAuthorType = 'staff' | 'admin' | 'portal';
export type NoteVisibility = 'internal' | 'staff' | 'parent';

export interface StudentNote {
  id: number;
  student_id: number;
  author_type: NoteAuthorType;
  author_name: string;
  author_id: number | null;
  content: string;
  note_date: string; // YYYY-MM-DD
  visibility: NoteVisibility;
  created_at: string;
}

export interface CreateNoteRequest {
  student_id: number;
  content: string;
  author_type: NoteAuthorType;
  author_name: string;
  author_id?: number;
  note_date: string;
  visibility?: NoteVisibility;
}

// ── Library ────────────────────────────────

export type BookStatus = 'available' | 'checked-out' | 'lost' | 'retired';

export interface Book {
  id: number;
  title: string;
  author: string | null;
  isbn: string | null;
  barcode: string | null;
  category: string | null;
  reading_level: string | null;
  status: BookStatus;
  created_at: string;
  updated_at: string;
}

export interface BookLoan {
  id: number;
  book_id: number;
  student_id: number;
  checked_out_at: string;
  due_date: string | null;
  returned_at: string | null; // NULL = still out
  checked_out_by: string | null;
  returned_to: string | null;
  created_at: string;
  // Joined fields
  book?: Book;
  student?: Student;
}

export interface CheckoutBookRequest {
  book_id: number;
  student_id: number;
  checked_out_by?: string;
}

export interface ReturnBookRequest {
  book_id: number;
  returned_to?: string;
}

// ── Row Assignments ────────────────────────

export interface RowAssignment {
  id: number;
  student_id: number;
  row_number: number; // 1-6
  assigned_date: string; // YYYY-MM-DD
  assigned_by: number | null;
  created_at: string;
  // Joined fields
  student?: Student;
}

export interface AssignRowRequest {
  student_id: number;
  row_number: number;
  date: string; // YYYY-MM-DD
}

// ── Center Settings (Logistics) ──────────

export interface CenterSettings {
  center_capacity: number;
  operating_days: string[];
  time_slots: TimeSlot[];
  staff_student_ratio: number;
}

export interface TimeSlot {
  sort_key: number; // 1500, 1530, 1600...
  display: string; // "3:00 PM", "3:30 PM"
  open_days: string[]; // Which days this slot is open
}

// ── Staff Slot Assignments (Logistics) ────

export interface StaffSlotAssignment {
  id: number;
  staff_id: number;
  day_of_week: string; // "Monday", "Tuesday", etc.
  time_sort_key: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  // Joined
  staff?: Staff;
}

// ── Schedule Overrides (Logistics) ────────

export interface ScheduleOverride {
  id: number;
  student_id: number;
  override_type: 'add' | 'remove' | 'move';
  original_day: string | null;
  original_time: number | null;
  new_day: string | null;
  new_time: number | null;
  effective_date: string; // YYYY-MM-DD
  reason: string | null;
  created_at: string;
  // Joined
  student?: Student;
}

// ── Capacity Grid (computed) ─────────────

export interface CapacityCell {
  day: string;
  date: string;
  timeSortKey: number;
  timeDisplay: string;
  isOpen: boolean;
  studentCount: number;
  staffAssigned: number;
  staffRecommended: number;
  utilization: number; // 0-100
  stoplightColor: 'green' | 'yellow' | 'red';
  isUnderstaffed: boolean;
  // Classroom position breakdowns
  elCount: number;
  mcCount: number;
  ucCount: number;
}

export interface CapacityGridData {
  cells: CapacityCell[][]; // [row (time)][col (day)]
  timeSlots: TimeSlot[];
  days: { name: string; date: string }[];
  capacity: number;
  weekLabel: string;
}

// ── Utility Types ──────────────────────────

/** Parse comma-separated subjects string into typed array */
export function parseSubjects(subjects: string): SubjectType[] {
  return subjects
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is SubjectType => s === 'Math' || s === 'Reading');
}

/** Parse comma-separated days string into array */
export function parseScheduleDays(days: string | null): string[] {
  if (!days) return [];
  return days.split(',').map((d) => d.trim());
}

/** Format class_time_sort_key (1530) to display string ("3:30 PM") */
export function formatTimeKey(key: number | null): string {
  if (key === null) return '';
  const h = Math.floor(key / 100);
  const m = key % 100;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Get session duration in minutes based on subjects (30 min per subject) */
export function getSessionDuration(subjects: string | string[]): number {
  const parsed =
    typeof subjects === 'string'
      ? subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : subjects;
  return parsed.length * 30;
}

/** Get time remaining in minutes from check-in time and subjects */
export function getTimeRemaining(
  subjects: string | string[],
  checkInTime: string | Date
): number {
  const duration = getSessionDuration(subjects);
  const checkIn = new Date(checkInTime);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - checkIn.getTime()) / 60000);
  return Math.max(0, duration - elapsed);
}

/** Format time as "3:10 PM" from ISO string */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Logistics Utility Functions ──────────

/** Format time sort key (1500 → "3:00 PM") */
export function formatTimeSortKey(key: number): string {
  const h24 = Math.floor(key / 100);
  const m = key % 100;
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Bucket a class_time_sort_key into the nearest 30-min slot (e.g., 1515 → 1500) */
export function bucketTimeKey(key: number): number {
  const h = Math.floor(key / 100);
  const m = key % 100;
  const bucketed = Math.floor(m / 30) * 30;
  return h * 100 + bucketed;
}

/** Generate time slots from per-day operating hours */
export function generateTimeSlots(
  dayHours: Record<string, { start: number; end: number }>
): TimeSlot[] {
  const allKeys = new Set<number>();
  for (const { start, end } of Object.values(dayHours)) {
    for (let key = start; key < end; ) {
      allKeys.add(key);
      // Increment by 30 minutes in HHMM format
      const h = Math.floor(key / 100);
      const m = key % 100;
      const next = m + 30 >= 60 ? (h + 1) * 100 + (m + 30 - 60) : key + 30;
      key = next;
    }
  }

  return Array.from(allKeys)
    .sort((a, b) => a - b)
    .map((key) => ({
      sort_key: key,
      display: formatTimeSortKey(key),
      open_days: Object.entries(dayHours)
        .filter(([, { start, end }]) => key >= start && key < end)
        .map(([day]) => day),
    }));
}

/** Get Monday–Thursday dates for the week containing a reference date */
export function getWeekDates(
  referenceDate: Date,
  operatingDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
): { name: string; date: string }[] {
  const d = new Date(referenceDate);
  // Adjust to Monday (day 1). Sunday=0 → offset 6, Mon=1 → 0, etc.
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);

  const dayIndex: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
  };

  return operatingDays.map((name) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + (dayIndex[name] || 0));
    return { name, date: dd.toISOString().split('T')[0] };
  });
}

/** Format a week date range label ("March 3–6, 2026") */
export function formatWeekLabel(days: { name: string; date: string }[]): string {
  if (days.length === 0) return '';
  const first = new Date(days[0].date + 'T12:00:00');
  const last = new Date(days[days.length - 1].date + 'T12:00:00');
  const month = first.toLocaleDateString('en-US', { month: 'long' });
  const year = first.getFullYear();
  if (first.getMonth() === last.getMonth()) {
    return `${month} ${first.getDate()}–${last.getDate()}, ${year}`;
  }
  const lastMonth = last.toLocaleDateString('en-US', { month: 'long' });
  return `${month} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${year}`;
}

/** Stoplight color from utilization percentage */
export function getStoplightColor(utilization: number): 'green' | 'yellow' | 'red' {
  if (utilization >= 90) return 'red';
  if (utilization >= 60) return 'yellow';
  return 'green';
}

/** Recommended staff count from student count and ratio */
export function getRecommendedStaff(studentCount: number, ratio: number): number {
  if (studentCount === 0) return 0;
  return Math.ceil(studentCount / ratio);
}
