/* ═══════════════════════════════════════════
   Mock Data — realistic data matching cb_* schemas
   Used when NEXT_PUBLIC_USE_MOCK=true
   ═══════════════════════════════════════════ */

import type {
  Student,
  Contact,
  Staff,
  Attendance,
  TimeEntry,
  StudentNote,
  Book,
  BookLoan,
  RowAssignment,
  CenterSettings,
  StaffSlotAssignment,
  ScheduleOverride,
} from './types';
import { generateTimeSlots } from './types';

// ── Helpers ────────────────────────────────

const today = new Date().toISOString().split('T')[0];
const now = new Date().toISOString();

function todayAt(h: number, m: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function addMinutes(iso: string, mins: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function dateAt(dateStr: string, h: number, m: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function twoWeeksFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

// ── Students (matches cb_students schema) ──

export const MOCK_STUDENTS: Student[] = [
  {
    id: 1, system_id: 'STU-001', clickup_task_id: 'abc001',
    first_name: 'Alice', last_name: 'Johnson', student_id: 'KUM-10001',
    date_of_birth: '2016-03-15', grade_level: '3', school: 'Forest Hills Elementary',
    medical_notes: 'Peanut allergy', enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math, Reading',
    enroll_date: '2024-09-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1500,
    current_level_math: 'C', current_level_reading: 'BII',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 1, billing_contact_id: 1,
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 2, system_id: 'STU-002', clickup_task_id: 'abc002',
    first_name: 'Ben', last_name: 'Smith', student_id: 'KUM-10002',
    date_of_birth: '2017-07-22', grade_level: '2', school: 'Kenowa Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2024-10-15', classroom_position: 'Early Learners',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1530,
    current_level_math: 'B', current_level_reading: 'AI',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: null,
    primary_contact_id: 2, billing_contact_id: 2,
    created_at: '2024-10-15T00:00:00Z', updated_at: now,
  },
  {
    id: 3, system_id: 'STU-003', clickup_task_id: 'abc003',
    first_name: 'Charlie', last_name: 'Davis', student_id: 'KUM-10003',
    date_of_birth: '2015-01-10', grade_level: '4', school: 'Ada Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Reading',
    enroll_date: '2024-08-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1500,
    current_level_math: 'A', current_level_reading: '7A',
    ashr_math_status: null, ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 3, billing_contact_id: 3,
    created_at: '2024-08-01T00:00:00Z', updated_at: now,
  },
  {
    id: 4, system_id: 'STU-004', clickup_task_id: 'abc004',
    first_name: 'Diana', last_name: 'Prince', student_id: 'KUM-10004',
    date_of_birth: '2014-11-05', grade_level: '5', school: 'Forest Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math, Reading',
    enroll_date: '2023-09-01', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1500,
    current_level_math: 'E', current_level_reading: 'DI',
    ashr_math_status: 'Bronze', ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 4, billing_contact_id: 4,
    created_at: '2023-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 5, system_id: 'STU-005', clickup_task_id: 'abc005',
    first_name: 'Evan', last_name: 'Wright', student_id: 'KUM-10005',
    date_of_birth: '2013-05-18', grade_level: '6', school: 'East Grand Rapids MS',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2022-09-01', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1500,
    current_level_math: 'F', current_level_reading: 'EII',
    ashr_math_status: 'Silver', ashr_reading_status: null,
    primary_contact_id: 5, billing_contact_id: 5,
    created_at: '2022-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 6, system_id: 'STU-006', clickup_task_id: 'abc006',
    first_name: 'Fiona', last_name: 'Glenanne', student_id: 'KUM-10006',
    date_of_birth: '2015-09-12', grade_level: '4', school: 'Kenowa Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math, Reading',
    enroll_date: '2024-01-15', classroom_position: 'Main Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1500,
    current_level_math: 'CI', current_level_reading: 'CI',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 6, billing_contact_id: 6,
    created_at: '2024-01-15T00:00:00Z', updated_at: now,
  },
  {
    id: 7, system_id: 'STU-007', clickup_task_id: 'abc007',
    first_name: 'George', last_name: 'Miller', student_id: 'KUM-10007',
    date_of_birth: '2016-12-01', grade_level: '3', school: 'Forest Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2024-09-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1530,
    current_level_math: 'D', current_level_reading: 'B',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: null,
    primary_contact_id: 7, billing_contact_id: 7,
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 8, system_id: 'STU-008', clickup_task_id: 'abc008',
    first_name: 'Hannah', last_name: 'Abbott', student_id: 'KUM-10008',
    date_of_birth: '2017-04-28', grade_level: '2', school: 'Ada Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Reading',
    enroll_date: '2024-11-01', classroom_position: 'Early Learners',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1530,
    current_level_math: '2A', current_level_reading: '3A',
    ashr_math_status: null, ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 8, billing_contact_id: 8,
    created_at: '2024-11-01T00:00:00Z', updated_at: now,
  },
  {
    id: 9, system_id: 'STU-009', clickup_task_id: 'abc009',
    first_name: 'Ian', last_name: 'McKellen', student_id: 'KUM-10009',
    date_of_birth: '2014-08-15', grade_level: '5', school: 'East Grand Rapids MS',
    medical_notes: 'Asthma — inhaler in backpack', enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math, Reading',
    enroll_date: '2023-01-15', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1600,
    current_level_math: 'G', current_level_reading: 'F',
    ashr_math_status: 'Gold', ashr_reading_status: 'Bronze',
    primary_contact_id: 9, billing_contact_id: 9,
    created_at: '2023-01-15T00:00:00Z', updated_at: now,
  },
  {
    id: 10, system_id: 'STU-010', clickup_task_id: 'abc010',
    first_name: 'Jack', last_name: 'Sparrow', student_id: 'KUM-10010',
    date_of_birth: '2016-06-20', grade_level: '3', school: 'Kenowa Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2024-09-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1530,
    current_level_math: 'B', current_level_reading: 'C',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: null,
    primary_contact_id: 10, billing_contact_id: 10,
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 11, system_id: 'STU-011', clickup_task_id: 'abc011',
    first_name: 'Kelly', last_name: 'Clarkson', student_id: 'KUM-10011',
    date_of_birth: '2015-02-14', grade_level: '4', school: 'Forest Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Reading',
    enroll_date: '2024-03-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1500,
    current_level_math: 'C', current_level_reading: 'B',
    ashr_math_status: null, ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 11, billing_contact_id: 11,
    created_at: '2024-03-01T00:00:00Z', updated_at: now,
  },
  {
    id: 12, system_id: 'STU-012', clickup_task_id: 'abc012',
    first_name: 'Liam', last_name: 'Neeson', student_id: 'KUM-10012',
    date_of_birth: '2014-10-30', grade_level: '5', school: 'Ada Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2023-09-01', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1600,
    current_level_math: 'E', current_level_reading: 'D',
    ashr_math_status: 'Bronze', ashr_reading_status: null,
    primary_contact_id: 12, billing_contact_id: 12,
    created_at: '2023-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 13, system_id: 'STU-013', clickup_task_id: 'abc013',
    first_name: 'Mia', last_name: 'Farrow', student_id: 'KUM-10013',
    date_of_birth: '2017-12-05', grade_level: '2', school: 'Forest Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Reading',
    enroll_date: '2025-01-15', classroom_position: 'Early Learners',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1500,
    current_level_math: 'A', current_level_reading: '7A',
    ashr_math_status: null, ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 13, billing_contact_id: 13,
    created_at: '2025-01-15T00:00:00Z', updated_at: now,
  },
  {
    id: 14, system_id: 'STU-014', clickup_task_id: 'abc014',
    first_name: 'Noah', last_name: 'Ark', student_id: 'KUM-10014',
    date_of_birth: '2015-07-07', grade_level: '4', school: 'Kenowa Hills Elementary',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math, Reading',
    enroll_date: '2024-09-01', classroom_position: 'Main Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1600,
    current_level_math: 'C', current_level_reading: 'B',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: 'Not Yet ASHR',
    primary_contact_id: 14, billing_contact_id: 14,
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 15, system_id: 'STU-015', clickup_task_id: 'abc015',
    first_name: 'Olivia', last_name: 'Pope', student_id: 'KUM-10015',
    date_of_birth: '2014-03-25', grade_level: '5', school: 'East Grand Rapids MS',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Math',
    enroll_date: '2023-06-01', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Tuesday, Thursday', class_time_sort_key: 1630,
    current_level_math: 'D', current_level_reading: 'C',
    ashr_math_status: 'Not Yet ASHR', ashr_reading_status: null,
    primary_contact_id: 15, billing_contact_id: 15,
    created_at: '2023-06-01T00:00:00Z', updated_at: now,
  },
  {
    id: 16, system_id: 'STU-016', clickup_task_id: 'abc016',
    first_name: 'Peter', last_name: 'Parker', student_id: 'KUM-10016',
    date_of_birth: '2013-08-10', grade_level: '6', school: 'East Grand Rapids MS',
    medical_notes: null, enrollment_status: 'Active',
    program_type: 'Paper', subjects: 'Reading',
    enroll_date: '2022-01-15', classroom_position: 'Upper Classroom',
    class_schedule_days: 'Monday, Wednesday', class_time_sort_key: 1630,
    current_level_math: 'E', current_level_reading: 'F',
    ashr_math_status: null, ashr_reading_status: 'Silver',
    primary_contact_id: 16, billing_contact_id: 16,
    created_at: '2022-01-15T00:00:00Z', updated_at: now,
  },
];

// ── Contacts ───────────────────────────────

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 1, system_id: 'CON-001', clickup_task_id: 'con001',
    first_name: 'Sarah', last_name: 'Johnson',
    email: 'sarah.johnson@email.com', phone: '616-555-1001',
    relationship_to_students: 'Mother', preferred_contact_method: 'Text',
    portal_access_enabled: 1, wp_user_id: 42,
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 2, system_id: 'CON-002', clickup_task_id: 'con002',
    first_name: 'Tom', last_name: 'Smith',
    email: 'tom.smith@email.com', phone: '616-555-1002',
    relationship_to_students: 'Father', preferred_contact_method: 'Call',
    portal_access_enabled: 1, wp_user_id: 43,
    created_at: '2024-10-15T00:00:00Z', updated_at: now,
  },
  {
    id: 3, system_id: 'CON-003', clickup_task_id: 'con003',
    first_name: 'Maria', last_name: 'Davis',
    email: 'maria.davis@email.com', phone: '616-555-1003',
    relationship_to_students: 'Mother', preferred_contact_method: 'Email',
    portal_access_enabled: 1, wp_user_id: 44,
    created_at: '2024-08-01T00:00:00Z', updated_at: now,
  },
];

// ── Staff ──────────────────────────────────

export const MOCK_STAFF: Staff[] = [
  {
    id: 1, clickup_task_id: null,
    full_name: 'Bincy Thomas', email: 'bincy@kumon-grn.com', phone: '616-555-2001',
    address: null, date_of_birth: null,
    role: 'Owner', hire_date: '2020-01-01', wp_user_id: 2,
    pin: '1234', status: 'Active',
    created_at: '2020-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 2, clickup_task_id: null,
    full_name: 'Sarah Kim', email: 'sarah.k@kumon-grn.com', phone: '616-555-2002',
    address: null, date_of_birth: null,
    role: 'Instruction Manager', hire_date: '2022-06-01', wp_user_id: 10,
    pin: '2345', status: 'Active',
    created_at: '2022-06-01T00:00:00Z', updated_at: now,
  },
  {
    id: 3, clickup_task_id: null,
    full_name: 'Jane Doe', email: 'jane.d@kumon-grn.com', phone: '616-555-2003',
    address: null, date_of_birth: null,
    role: 'Teacher', hire_date: '2023-01-15', wp_user_id: 11,
    pin: '3456', status: 'Active',
    created_at: '2023-01-15T00:00:00Z', updated_at: now,
  },
  {
    id: 4, clickup_task_id: null,
    full_name: 'Mike Rodriguez', email: 'mike.r@kumon-grn.com', phone: '616-555-2004',
    address: null, date_of_birth: null,
    role: 'Teacher', hire_date: '2023-09-01', wp_user_id: 12,
    pin: '4567', status: 'Active',
    created_at: '2023-09-01T00:00:00Z', updated_at: now,
  },
  {
    id: 5, clickup_task_id: null,
    full_name: 'Leah Martin', email: 'leah.m@kumon-grn.com', phone: '616-555-2005',
    address: null, date_of_birth: null,
    role: 'Teacher', hire_date: '2024-01-15', wp_user_id: 13,
    pin: '5678', status: 'Active',
    created_at: '2024-01-15T00:00:00Z', updated_at: now,
  },
  {
    id: 6, clickup_task_id: null,
    full_name: 'Chris Park', email: 'chris.p@kumon-grn.com', phone: '616-555-2006',
    address: null, date_of_birth: null,
    role: 'Grader', hire_date: '2024-09-01', wp_user_id: null,
    pin: '6789', status: 'Inactive',
    created_at: '2024-09-01T00:00:00Z', updated_at: now,
  },
];

// ── Attendance (today's mock) ──────────────

export const MOCK_ATTENDANCE: Attendance[] = [
  {
    // Alice — Math+Reading, 60 min, checked in 3:10 PM, SMS sent
    id: 1, student_id: 1,
    check_in: todayAt(15, 10), check_out: null,
    scheduled_time: '3:30 PM', duration_minutes: null,
    checked_in_by: 'Sarah Kim', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 60,
    session_end_time: addMinutes(todayAt(15, 10), 60),
    sms_10min_sent: true,
    sms_10min_sent_at: addMinutes(todayAt(15, 10), 50),
    sms_recipient_phone: '616-555-1001',
    sms_recipient_name: 'Sarah',
    created_at: todayAt(15, 10),
  },
  {
    // Diana — Math+Reading, 60 min, checked in 3:20 PM, SMS not yet sent
    id: 2, student_id: 4,
    check_in: todayAt(15, 20), check_out: null,
    scheduled_time: '3:20 PM', duration_minutes: null,
    checked_in_by: 'barcode', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 60,
    session_end_time: addMinutes(todayAt(15, 20), 60),
    sms_10min_sent: false,
    sms_10min_sent_at: null,
    sms_recipient_phone: '616-555-1004',
    sms_recipient_name: 'Diana Sr.',
    created_at: todayAt(15, 20),
  },
  {
    // Fiona — Math+Reading, 60 min, checked in 3:04 PM, SMS sent
    id: 3, student_id: 6,
    check_in: todayAt(15, 4), check_out: null,
    scheduled_time: '3:04 PM', duration_minutes: null,
    checked_in_by: 'barcode', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 60,
    session_end_time: addMinutes(todayAt(15, 4), 60),
    sms_10min_sent: true,
    sms_10min_sent_at: addMinutes(todayAt(15, 4), 50),
    sms_recipient_phone: '616-555-1006',
    sms_recipient_name: 'Mrs. Glenanne',
    created_at: todayAt(15, 4),
  },
  {
    // Evan — Math only, 30 min, checked in 3:05 PM, SMS sent
    id: 4, student_id: 5,
    check_in: todayAt(15, 5), check_out: null,
    scheduled_time: '3:05 PM', duration_minutes: null,
    checked_in_by: 'barcode', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 30,
    session_end_time: addMinutes(todayAt(15, 5), 30),
    sms_10min_sent: true,
    sms_10min_sent_at: addMinutes(todayAt(15, 5), 20),
    sms_recipient_phone: '616-555-1005',
    sms_recipient_name: 'Mr. Wright',
    created_at: todayAt(15, 5),
  },
  {
    // Noah — Math+Reading, 60 min, checked in 3:08 PM, SMS not yet sent
    id: 5, student_id: 14,
    check_in: todayAt(15, 8), check_out: null,
    scheduled_time: '3:08 PM', duration_minutes: null,
    checked_in_by: 'barcode', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 60,
    session_end_time: addMinutes(todayAt(15, 8), 60),
    sms_10min_sent: false,
    sms_10min_sent_at: null,
    sms_recipient_phone: '616-555-1014',
    sms_recipient_name: 'Mrs. Ark',
    created_at: todayAt(15, 8),
  },
  {
    // Peter — Reading only, 30 min, checked in 3:01 PM, SMS sent
    id: 6, student_id: 16,
    check_in: todayAt(15, 1), check_out: null,
    scheduled_time: '3:01 PM', duration_minutes: null,
    checked_in_by: 'barcode', checked_out_by: null,
    source: 'barcode', notes: null,
    session_duration_minutes: 30,
    session_end_time: addMinutes(todayAt(15, 1), 30),
    sms_10min_sent: true,
    sms_10min_sent_at: addMinutes(todayAt(15, 1), 20),
    sms_recipient_phone: '616-555-1016',
    sms_recipient_name: 'Aunt May',
    created_at: todayAt(15, 1),
  },
];

// ── Time Entries (current pay period) ────────────

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  // Today — currently clocked in
  { id: 1, staff_id: 2, clock_in: todayAt(14, 45), clock_out: null, duration_minutes: null, source: 'kiosk', notes: null, created_at: todayAt(14, 45) },
  { id: 2, staff_id: 3, clock_in: todayAt(14, 50), clock_out: null, duration_minutes: null, source: 'barcode', notes: null, created_at: todayAt(14, 50) },
  { id: 3, staff_id: 4, clock_in: todayAt(15, 0), clock_out: null, duration_minutes: null, source: 'kiosk', notes: null, created_at: todayAt(15, 0) },
  { id: 4, staff_id: 5, clock_in: todayAt(15, 0), clock_out: null, duration_minutes: null, source: 'barcode', notes: null, created_at: todayAt(15, 0) },
  // Yesterday — completed
  { id: 5, staff_id: 1, clock_in: dateAt(daysAgo(1), 14, 0), clock_out: dateAt(daysAgo(1), 19, 0), duration_minutes: 300, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(1), 14, 0) },
  { id: 6, staff_id: 2, clock_in: dateAt(daysAgo(1), 14, 30), clock_out: dateAt(daysAgo(1), 18, 45), duration_minutes: 255, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(1), 14, 30) },
  { id: 7, staff_id: 3, clock_in: dateAt(daysAgo(1), 15, 0), clock_out: dateAt(daysAgo(1), 19, 15), duration_minutes: 255, source: 'barcode', notes: null, created_at: dateAt(daysAgo(1), 15, 0) },
  { id: 8, staff_id: 4, clock_in: dateAt(daysAgo(1), 15, 0), clock_out: dateAt(daysAgo(1), 18, 30), duration_minutes: 210, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(1), 15, 0) },
  // 3 days ago
  { id: 9, staff_id: 1, clock_in: dateAt(daysAgo(3), 14, 0), clock_out: dateAt(daysAgo(3), 19, 30), duration_minutes: 330, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(3), 14, 0) },
  { id: 10, staff_id: 2, clock_in: dateAt(daysAgo(3), 14, 30), clock_out: dateAt(daysAgo(3), 18, 30), duration_minutes: 240, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(3), 14, 30) },
  { id: 11, staff_id: 3, clock_in: dateAt(daysAgo(3), 15, 0), clock_out: dateAt(daysAgo(3), 19, 0), duration_minutes: 240, source: 'barcode', notes: null, created_at: dateAt(daysAgo(3), 15, 0) },
  { id: 12, staff_id: 5, clock_in: dateAt(daysAgo(3), 15, 0), clock_out: dateAt(daysAgo(3), 18, 0), duration_minutes: 180, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(3), 15, 0) },
  // 5 days ago
  { id: 13, staff_id: 1, clock_in: dateAt(daysAgo(5), 14, 0), clock_out: dateAt(daysAgo(5), 19, 0), duration_minutes: 300, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(5), 14, 0) },
  { id: 14, staff_id: 2, clock_in: dateAt(daysAgo(5), 14, 45), clock_out: dateAt(daysAgo(5), 18, 15), duration_minutes: 210, source: 'kiosk', notes: null, created_at: dateAt(daysAgo(5), 14, 45) },
  { id: 15, staff_id: 4, clock_in: dateAt(daysAgo(5), 15, 0), clock_out: dateAt(daysAgo(5), 18, 30), duration_minutes: 210, source: 'manual', notes: 'Forgot to clock in', created_at: dateAt(daysAgo(5), 15, 0) },
];

// ── Student Notes ──────────────────────────

export const MOCK_NOTES: StudentNote[] = [
  {
    id: 1, student_id: 1,
    author_type: 'portal', author_name: 'Sarah Johnson', author_id: 1,
    content: 'Alice felt she struggled with word problems last night. Could she get extra practice?',
    note_date: today, visibility: 'staff',
    created_at: todayAt(8, 15),
  },
  {
    id: 2, student_id: 1,
    author_type: 'admin', author_name: 'Bincy Thomas', author_id: 1,
    content: 'Please ensure she completes a timed test for Math C today.',
    note_date: today, visibility: 'staff',
    created_at: todayAt(14, 30),
  },
  {
    id: 3, student_id: 1,
    author_type: 'staff', author_name: 'Sarah Kim', author_id: 2,
    content: 'Alice did a great job staying focused in Reading today. Completed 5 pages.',
    note_date: today, visibility: 'staff',
    created_at: todayAt(15, 45),
  },
  {
    id: 4, student_id: 4,
    author_type: 'staff', author_name: 'Jane Doe', author_id: 3,
    content: 'Diana is progressing well through E level. Consider advancing to F next week.',
    note_date: today, visibility: 'staff',
    created_at: todayAt(15, 30),
  },
  {
    id: 5, student_id: 9,
    author_type: 'portal', author_name: 'Parent', author_id: null,
    content: 'Ian was coughing this morning. He has his inhaler with him.',
    note_date: today, visibility: 'staff',
    created_at: todayAt(7, 45),
  },
];

// ── Library Books ──────────────────────────

export const MOCK_BOOKS: Book[] = [
  {
    id: 1, title: 'Bob Books: Set 1', author: 'Bobby Lynn Maslen',
    isbn: '978-0439845007', barcode: 'LIB-001',
    category: 'Early Reader', reading_level: '7A-2A',
    status: 'checked-out',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 2, title: 'Frog and Toad Are Friends', author: 'Arnold Lobel',
    isbn: '978-0064440202', barcode: 'LIB-002',
    category: 'Early Reader', reading_level: 'AI-AII',
    status: 'available',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 3, title: 'Elephant & Piggie: I Really Like Slop!', author: 'Mo Willems',
    isbn: '978-1484722619', barcode: 'LIB-003',
    category: 'Early Reader', reading_level: 'AI-BI',
    status: 'available',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 4, title: 'Biscuit Finds a Friend', author: 'Alyssa Satin Capucilli',
    isbn: '978-0064442435', barcode: 'LIB-004',
    category: 'Early Reader', reading_level: '7A-AI',
    status: 'available',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 5, title: 'Green Eggs and Ham', author: 'Dr. Seuss',
    isbn: '978-0394800165', barcode: 'LIB-005',
    category: 'Early Reader', reading_level: 'AI-AII',
    status: 'available',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 6, title: 'Charlotte\'s Web', author: 'E.B. White',
    isbn: '978-0064400558', barcode: 'LIB-006',
    category: 'Chapter Book', reading_level: 'CI-DI',
    status: 'checked-out',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
  {
    id: 7, title: 'Magic Tree House #1', author: 'Mary Pope Osborne',
    isbn: '978-0679824114', barcode: 'LIB-007',
    category: 'Chapter Book', reading_level: 'BII-CI',
    status: 'available',
    created_at: '2024-01-01T00:00:00Z', updated_at: now,
  },
];

// ── Book Loans ─────────────────────────────

export const MOCK_BOOK_LOANS: BookLoan[] = [
  // Outstanding loans
  {
    id: 1, book_id: 1, student_id: 2,
    checked_out_at: dateAt(daysAgo(3), 15, 30), due_date: twoWeeksFromNow(),
    returned_at: null, checked_out_by: 'Sarah Kim', returned_to: null,
    created_at: dateAt(daysAgo(3), 15, 30),
  },
  {
    id: 2, book_id: 6, student_id: 9,
    checked_out_at: dateAt(daysAgo(10), 16, 0), due_date: daysAgo(3), // Overdue!
    returned_at: null, checked_out_by: 'Jane Doe', returned_to: null,
    created_at: dateAt(daysAgo(10), 16, 0),
  },
  // Returned loans (history)
  {
    id: 3, book_id: 2, student_id: 1,
    checked_out_at: dateAt(daysAgo(20), 15, 0), due_date: daysAgo(6),
    returned_at: dateAt(daysAgo(8), 15, 30), checked_out_by: 'Sarah Kim', returned_to: 'Jane Doe',
    created_at: dateAt(daysAgo(20), 15, 0),
  },
  {
    id: 4, book_id: 5, student_id: 4,
    checked_out_at: dateAt(daysAgo(15), 16, 0), due_date: daysAgo(1),
    returned_at: dateAt(daysAgo(5), 15, 45), checked_out_by: 'Mike Rodriguez', returned_to: 'Sarah Kim',
    created_at: dateAt(daysAgo(15), 16, 0),
  },
  {
    id: 5, book_id: 7, student_id: 3,
    checked_out_at: dateAt(daysAgo(25), 15, 30), due_date: daysAgo(11),
    returned_at: dateAt(daysAgo(12), 16, 0), checked_out_by: 'Jane Doe', returned_to: 'Leah Martin',
    created_at: dateAt(daysAgo(25), 15, 30),
  },
  {
    id: 6, book_id: 3, student_id: 8,
    checked_out_at: dateAt(daysAgo(7), 15, 15), due_date: daysAgo(0),
    returned_at: dateAt(daysAgo(2), 16, 30), checked_out_by: 'Leah Martin', returned_to: 'Sarah Kim',
    created_at: dateAt(daysAgo(7), 15, 15),
  },
];

// ── Row Assignments (today) ────────────────

export const MOCK_ROW_ASSIGNMENTS: RowAssignment[] = [
  { id: 1, student_id: 1, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 2, student_id: 4, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 3, student_id: 6, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 4, student_id: 14, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 5, student_id: 16, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 6, student_id: 5, row_number: 3, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 7, student_id: 2, row_number: 1, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 8, student_id: 3, row_number: 1, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 9, student_id: 7, row_number: 2, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 10, student_id: 8, row_number: 2, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 11, student_id: 9, row_number: 4, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 12, student_id: 10, row_number: 4, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 13, student_id: 11, row_number: 5, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 14, student_id: 12, row_number: 5, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 15, student_id: 13, row_number: 6, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
  { id: 16, student_id: 15, row_number: 6, assigned_date: today, assigned_by: 2, created_at: todayAt(14, 0) },
];

// ── Center Settings ──────────────────────
// Capacity set to 8 for mock mode so stoplight colors are visible with 16 students

export const MOCK_CENTER_SETTINGS: CenterSettings = {
  center_capacity: 8,
  operating_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  time_slots: generateTimeSlots({
    Monday: { start: 1500, end: 1900 },
    Tuesday: { start: 1500, end: 1800 },
    Wednesday: { start: 1500, end: 1800 },
    Thursday: { start: 1500, end: 1900 },
  }),
  staff_student_ratio: 3,
};

// ── Staff Slot Assignments (recurring weekly schedule) ──

export const MOCK_STAFF_SLOTS: StaffSlotAssignment[] = [
  // Monday
  { id: 1, staff_id: 2, day_of_week: 'Monday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 2, staff_id: 3, day_of_week: 'Monday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 3, staff_id: 4, day_of_week: 'Monday', time_sort_key: 1530, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 4, staff_id: 3, day_of_week: 'Monday', time_sort_key: 1600, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 5, staff_id: 5, day_of_week: 'Monday', time_sort_key: 1630, effective_from: '2025-01-01', effective_to: null, created_at: now },
  // Tuesday
  { id: 6, staff_id: 2, day_of_week: 'Tuesday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 7, staff_id: 4, day_of_week: 'Tuesday', time_sort_key: 1530, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 8, staff_id: 3, day_of_week: 'Tuesday', time_sort_key: 1600, effective_from: '2025-01-01', effective_to: null, created_at: now },
  // Wednesday
  { id: 9, staff_id: 2, day_of_week: 'Wednesday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 10, staff_id: 3, day_of_week: 'Wednesday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 11, staff_id: 4, day_of_week: 'Wednesday', time_sort_key: 1530, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 12, staff_id: 5, day_of_week: 'Wednesday', time_sort_key: 1600, effective_from: '2025-01-01', effective_to: null, created_at: now },
  // Thursday
  { id: 13, staff_id: 2, day_of_week: 'Thursday', time_sort_key: 1500, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 14, staff_id: 4, day_of_week: 'Thursday', time_sort_key: 1530, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 15, staff_id: 3, day_of_week: 'Thursday', time_sort_key: 1600, effective_from: '2025-01-01', effective_to: null, created_at: now },
  { id: 16, staff_id: 5, day_of_week: 'Thursday', time_sort_key: 1630, effective_from: '2025-01-01', effective_to: null, created_at: now },
];

// ── Schedule Overrides (this week) ──────

function thisWeekDate(dayOffset: number): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset + dayOffset);
  return d.toISOString().split('T')[0];
}

export const MOCK_SCHEDULE_OVERRIDES: ScheduleOverride[] = [
  {
    // Ben (TuTh 1530) → makeup class on Monday at 1530
    id: 1, student_id: 2, override_type: 'add',
    original_day: null, original_time: null,
    new_day: 'Monday', new_time: 1530,
    effective_date: thisWeekDate(0), // Monday
    reason: 'Makeup class',
    created_at: now,
  },
  {
    // Alice (MW 1500) → absent Wednesday for vacation
    id: 2, student_id: 1, override_type: 'remove',
    original_day: 'Wednesday', original_time: 1500,
    new_day: null, new_time: null,
    effective_date: thisWeekDate(2), // Wednesday
    reason: 'Family vacation',
    created_at: now,
  },
  {
    // Liam (MW 1600) → moved to 1530 on Monday
    id: 3, student_id: 12, override_type: 'move',
    original_day: 'Monday', original_time: 1600,
    new_day: 'Monday', new_time: 1530,
    effective_date: thisWeekDate(0), // Monday
    reason: 'Schedule conflict',
    created_at: now,
  },
];
