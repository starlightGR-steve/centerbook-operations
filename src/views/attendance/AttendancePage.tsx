'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Scan, Search, X, UserCheck, Clock, Pencil, Send, CheckCircle2,
  AlertTriangle, Plus, Check, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  Trash2, Phone, Bath, RefreshCw, HelpCircle,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import AttendanceEditModal from '@/components/AttendanceEditModal';
import ExcusedAbsenceModal from '@/components/attendance/ExcusedAbsenceModal';
import SubjectBadges from '@/components/SubjectBadges';
import CheckInPopup from '@/views/kiosk/CheckInPopup';
import type { CheckInOptions } from '@/views/kiosk/CheckInPopup';
import CheckOutConfirmPopup from '@/views/kiosk/CheckOutConfirmPopup';
import UndoToast from '@/components/ui/UndoToast';
import type { UndoToastItem } from '@/components/ui/UndoToast';
import { useStudents, useStudentContacts } from '@/hooks/useStudents';
import {
  useAttendance, useActiveAttendance,
  checkInStudent, checkOutStudent, deleteAttendance, updateAttendance,
} from '@/hooks/useAttendance';
import { useCenterSettings } from '@/hooks/useCenterSettings';
import { api } from '@/lib/api';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock, clockInStaff, clockOutStaff } from '@/hooks/useTimeclock';
import { useClassroomAssignmentsActive, updateStudentFlags, removeStudentFromRow } from '@/hooks/useRows';
import { buildClassPrepFlags, hasAnyClassPrep } from '@/lib/classPrep';
import { useAbsences } from '@/hooks/useAbsences';
import {
  getTimeRemaining, getSessionDuration, formatTimeKey, formatTime, parseSubjects, normalizeSortKey,
} from '@/lib/types';
import type { Student, Staff, TimeEntry, Attendance } from '@/lib/types';
import styles from './AttendancePage.module.css';

/* ── Constants ── */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ROLE_ORDER: Record<string, number> = {
  owner: 0, instruction_manager: 1, center_manager: 2,
  project_manager: 3, admin: 4, teacher: 5, grader: 6,
};

/* ── Helpers ── */

function getToday(): string {
  return DAY_NAMES[new Date().getDay()];
}

function formatRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function staffDisplayName(staff: Staff): string {
  if (staff.first_name || staff.last_name) {
    return `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  }
  return staff.full_name || 'Unknown';
}

/** Resolve scheduled minutes-since-midnight from class_time_sort_key, going through
 *  normalizeSortKey first so legacy 12-hour-without-AM/PM values (e.g. 430 for
 *  "4:30 PM") are interpreted correctly. Returns null if no schedule on file. */
function scheduledMinutesFromKey(student: Student): number | null {
  const normalized = normalizeSortKey(student.class_time_sort_key);
  if (normalized === null) return null;
  return Math.floor(normalized / 100) * 60 + (normalized % 100);
}

function isNoShow(student: Student): boolean {
  const scheduledMinutes = scheduledMinutesFromKey(student);
  if (scheduledMinutes === null) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes - scheduledMinutes >= 15;
}

function minutesLate(student: Student): number {
  const scheduledMinutes = scheduledMinutesFromKey(student);
  if (scheduledMinutes === null) return 0;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, nowMinutes - scheduledMinutes);
}

function parseExistingFlags(flags: unknown): { flags: string[]; checklist: string[]; teacherNote: string } {
  if (!flags || typeof flags !== 'object') return { flags: [], checklist: [], teacherNote: '' };
  const f = flags as Record<string, unknown>;
  const flagKeys: string[] = [];
  const checklist: string[] = [];
  for (const [key, val] of Object.entries(f)) {
    if (key === 'tasks' && typeof val === 'object' && val !== null) {
      for (const [tk, tv] of Object.entries(val as Record<string, unknown>)) {
        if (tk === 'custom' && typeof tv === 'string') checklist.push(`__custom__:${tv}`);
        else if (tv === true) checklist.push(tk);
      }
    } else if (key !== 'teacher_note' && key !== 'teacher_notes' && val === true) {
      flagKeys.push(key);
    }
  }
  // Extract teacher note: prefer new array, fall back to legacy string
  let teacherNote = '';
  if (Array.isArray(f.teacher_notes)) {
    const undone = (f.teacher_notes as Array<{ text: string; done: boolean }>).filter((n) => !n.done);
    teacherNote = undone.map((n) => n.text).join('\n');
  } else if (typeof f.teacher_note === 'string') {
    teacherNote = f.teacher_note;
  }
  return { flags: flagKeys, checklist, teacherNote };
}

/* ── Column identifiers (used for tabs + collapse persistence) ── */
type ColumnKey = 'expected' | 'checkedIn' | 'awaiting' | 'checkedOut' | 'noShow';
type MobileTab = ColumnKey;

const COLLAPSE_STORAGE_KEY = 'attendance.collapsedColumns';
const DEFAULT_COLLAPSED: ColumnKey[] = ['expected', 'noShow'];

function loadCollapsed(): Set<ColumnKey> {
  if (typeof window === 'undefined') return new Set(DEFAULT_COLLAPSED);
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (raw === null) return new Set(DEFAULT_COLLAPSED);
    const parsed = JSON.parse(raw) as ColumnKey[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set(DEFAULT_COLLAPSED);
  }
}

/* ── Permission / preference helpers ── */
/* Read graceful-fallback fields; backend ships these under task 86agxw8n3.
 * Until then, return 'unknown' so cards render the amber "Not Set" state. */
type CheckoutPreference =
  | { kind: 'parent' }
  | { kind: 'independent'; exit: 'front' | 'back' | 'unknown' }
  | { kind: 'unknown' };

function getCheckoutPreference(student: Student): CheckoutPreference {
  const pref = (student as Student & { checkout_preference?: string }).checkout_preference;
  const exit = (student as Student & { exit_direction?: string }).exit_direction;
  if (pref === 'parent_pickup' || pref === 'parent') return { kind: 'parent' };
  if (pref === 'independent') {
    if (exit === 'front') return { kind: 'independent', exit: 'front' };
    if (exit === 'back') return { kind: 'independent', exit: 'back' };
    return { kind: 'independent', exit: 'unknown' };
  }
  return { kind: 'unknown' };
}

type BathroomPref = 'independent' | 'supervised' | 'unknown';
function getBathroomPreference(student: Student): BathroomPref {
  const v = (student as Student & { bathroom_preference?: string }).bathroom_preference;
  if (v === 'independent') return 'independent';
  if (v === 'supervised') return 'supervised';
  return 'unknown';
}

type SmsConsent = 'on' | 'opted_out' | 'no_reply';
/** Defaults to 'no_reply' when sms_opt_in isn't surfaced. The StudentContact
 * shape doesn't carry sms_opt_in today; landing here cleanly is the graceful
 * fallback called out in blocker 2. */
function getSmsConsent(contact: Record<string, unknown> | null | undefined): SmsConsent {
  if (!contact) return 'no_reply';
  const v = contact.sms_opt_in;
  if (v === 1) return 'on';
  if (v === 0) return 'opted_out';
  return 'no_reply';
}

/** Wait time in minutes since session_end_time / now-vs-overtime moment. */
function getWaitMinutes(att: Attendance, student: Student): number {
  const remaining = getTimeRemaining(student.subjects, att.check_in, {
    scheduleDetail: student.schedule_detail,
    sessionDurationMinutes: att.session_duration_minutes,
  });
  return Math.max(0, -remaining);
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function AttendancePage() {
  /* ── State ── */
  const [scan, setScan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimeclock, setShowTimeclock] = useState(false);
  const [time, setTime] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [scanError, setScanError] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('expected');

  // Check-in popup
  const [checkInPopupStudent, setCheckInPopupStudent] = useState<Student | null>(null);
  const [checkInEditPrep, setCheckInEditPrep] = useState<{
    flags: string[];
    checklist: string[];
    teacherNote: string;
    session_duration_minutes?: number | string | null;
  } | null>(null);

  // Search dropdown (all active students)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Undo toast
  const [undoToast, setUndoToast] = useState<UndoToastItem | null>(null);
  const toastIdRef = useRef(0);

  // Edit attendance modal
  const [editAttendance, setEditAttendance] = useState<{
    attendance: Attendance; studentName: string;
  } | null>(null);

  // No-show / Awaiting Pickup SMS state
  const [sentMissedYou, setSentMissedYou] = useState<Set<string>>(new Set());

  // Excused absence modal
  const [excuseModalStudent, setExcuseModalStudent] = useState<Student | null>(null);

  // Check-out confirm popup (scanner-triggered)
  const [checkOutPopupStudent, setCheckOutPopupStudent] = useState<Student | null>(null);
  const [checkOutPopupAttendance, setCheckOutPopupAttendance] = useState<Attendance | null>(null);

  // Move dropdown + time prompt
  const [moveMenuOpen, setMoveMenuOpen] = useState<string | null>(null);
  const [moveMenuPos, setMoveMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [moveTimePrompt, setMoveTimePrompt] = useState<{
    studentId: number;
    studentName: string;
    target: 'checkedIn' | 'checkedOut';
    existingAttendanceId?: number;
  } | null>(null);
  const [moveCheckInTime, setMoveCheckInTime] = useState('');
  const [moveCheckOutTime, setMoveCheckOutTime] = useState('');

  // Column collapse persistence (per tablet — no client-side user id available)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<ColumnKey>>(() => loadCollapsed());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        COLLAPSE_STORAGE_KEY,
        JSON.stringify(Array.from(collapsedColumns)),
      );
    } catch { /* ignore quota / disabled storage */ }
  }, [collapsedColumns]);
  const toggleColumn = (key: ColumnKey) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Text-parent dropdown anchor
  const [textMenuOpen, setTextMenuOpen] = useState<string | null>(null);
  const [textMenuPos, setTextMenuPos] = useState<{ top: number; right: number } | null>(null);

  // SMS popup
  const [smsPopup, setSmsPopup] = useState<{ student: Student; mode: 'pickup' | 'bathroom' } | null>(null);

  // Check-out confirmation (tap-checkout safety dialog).
  // openedAtMs is captured at open-time so the rendered "elapsed minutes" and
  // "check-out time" stay stable across re-renders (React purity rule).
  const [checkOutConfirm, setCheckOutConfirm] = useState<{
    student: Student;
    attendance: Attendance;
    openedAtMs: number;
  } | null>(null);

  // Remove from board (destructive confirmation + toast)
  const [removeConfirm, setRemoveConfirm] = useState<{
    student: Student;
    attendanceId: number | null;
  } | null>(null);
  const [removeToast, setRemoveToast] = useState<string | null>(null);
  const removeToastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Data hooks ── */
  const { data: allStudents } = useStudents();
  const { data: centerSettings } = useCenterSettings();
  const centerTz = centerSettings?.timezone || 'America/Detroit';
  const centerToday = new Date().toLocaleDateString('en-CA', { timeZone: centerTz });
  const { data: allAttendance } = useAttendance(centerToday);
  const { data: activeAttendance } = useActiveAttendance();
  const { data: activeStaff } = useActiveStaff();
  const { data: timeEntries } = useTimeclock();
  const { data: todayAbsences, mutate: mutateAbsences } = useAbsences();
  // 86ah0ex1k: session-scoped — Edit Class Prep needs the active assignment
  // (not a date-keyed lookup) so flags survive midnight and don't depend on
  // synthetic 'Unassigned' placeholders that no longer exist.
  const { data: assignments } = useClassroomAssignmentsActive();

  const today = getToday();
  const todayDay = today;

  /* ── Live clock ── */
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Auto-focus scanner ── */
  useEffect(() => {
    inputRef.current?.focus();
    const refocus = setInterval(() => {
      if (
        document.activeElement !== inputRef.current &&
        document.activeElement !== searchRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        inputRef.current?.focus();
      }
    }, 3000);
    return () => clearInterval(refocus);
  }, []);

  /* ── Derived data ── */

  // Active check-in IDs (currently checked in, regardless of date)
  const activeAttendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    if (activeAttendance) {
      for (const a of activeAttendance) map.set(a.student_id, a);
    }
    return map;
  }, [activeAttendance]);

  // All attendance IDs for today (including checked out)
  const allAttendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    if (allAttendance) {
      for (const a of allAttendance) map.set(a.student_id, a);
    }
    // Also include active check-ins (may be from a previous day)
    if (activeAttendance) {
      for (const a of activeAttendance) {
        if (!map.has(a.student_id)) map.set(a.student_id, a);
      }
    }
    return map;
  }, [allAttendance, activeAttendance]);

  const checkedInIds = useMemo(
    () => new Set(activeAttendance?.map((a) => a.student_id) ?? []),
    [activeAttendance]
  );

  // Students scheduled today
  const scheduledToday = useMemo(() => {
    if (!allStudents) return [];
    return allStudents.filter((s) => {
      if (s.enrollment_status !== 'Active') return false;
      if (!s.class_schedule_days) return false;
      return s.class_schedule_days.split(',').map((d) => d.trim()).includes(todayDay);
    });
  }, [allStudents, todayDay]);

  // Column 1: Expected — scheduled today, no attendance record at all
  const expectedStudents = useMemo(() => {
    const result = scheduledToday.filter((s) => !allAttendanceMap.has(s.id) && !isNoShow(s));
    return result;
  }, [scheduledToday, allAttendanceMap]);

  // Active attendance rows joined with student records (computed once, then split
  // by lifecycle status into Checked In vs Awaiting Pickup).
  const activeAttendanceJoined = useMemo(() => {
    if (!activeAttendance || !allStudents) return [];
    return activeAttendance
      .filter((a) => a.check_out === null)
      .map((a) => ({
        attendance: a,
        student: a.student || allStudents.find((s) => s.id === a.student_id),
      }))
      .filter((x): x is { attendance: Attendance; student: Student } => !!x.student);
  }, [activeAttendance, allStudents]);

  // Column 2: Checked In — status === 'checked-in' (or absent for legacy rows).
  // Sorted least-time-remaining first so the cards most in need of attention
  // (warning yellow → overtime red) bubble up. The clock drives border state
  // only, never column membership.
  const checkedInStudents = useMemo(() => {
    return activeAttendanceJoined
      .filter(({ attendance: a }) => (a.status ?? 'checked-in') === 'checked-in')
      .sort((a, b) => {
        const ra = getTimeRemaining(a.student.subjects, a.attendance.check_in, {
          scheduleDetail: a.student.schedule_detail,
          sessionDurationMinutes: a.attendance.session_duration_minutes,
        });
        const rb = getTimeRemaining(b.student.subjects, b.attendance.check_in, {
          scheduleDetail: b.student.schedule_detail,
          sessionDurationMinutes: b.attendance.session_duration_minutes,
        });
        return ra - rb;
      });
  }, [activeAttendanceJoined]);

  // Column 3: Awaiting Pickup — status === 'row-complete' (set when a teacher
  // taps Done in Live Class, or when staff manually move a card here).
  // Longest-waiting first.
  const awaitingPickupStudents = useMemo(() => {
    return activeAttendanceJoined
      .filter(({ attendance: a }) => a.status === 'row-complete')
      .sort((a, b) => getWaitMinutes(b.attendance, b.student) - getWaitMinutes(a.attendance, a.student));
  }, [activeAttendanceJoined]);

  // Column 4: Checked Out — today's records with check_out set, excluding active check-ins
  const checkedOutStudents = useMemo(() => {
    if (!allAttendance || !allStudents) return [];
    return allAttendance
      .filter((a) => a.check_in && a.check_out && !activeAttendanceMap.has(a.student_id))
      .map((a) => ({
        attendance: a,
        student: a.student || allStudents.find((s) => s.id === a.student_id),
      }))
      .filter((x): x is { attendance: Attendance; student: Student } => !!x.student);
  }, [allAttendance, allStudents, activeAttendanceMap]);

  // Excused student IDs from absence records
  const excusedIds = useMemo(() => {
    if (!todayAbsences) return new Set<number>();
    return new Set(todayAbsences.map((a) => a.student_id));
  }, [todayAbsences]);

  // Column 4: No-Show — scheduled 15+ min ago, no attendance record, not excused
  const noShowStudents = useMemo(
    () => scheduledToday.filter(
      (s) => isNoShow(s) && !allAttendanceMap.has(s.id) && !excusedIds.has(s.id)
    ),
    [scheduledToday, allAttendanceMap, excusedIds]
  );

  // Staff sorted by role, excluding superusers
  const sortedStaff = useMemo(() => {
    if (!activeStaff) return [];
    return [...activeStaff]
      .filter((s) => s.role !== 'superuser')
      .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
  }, [activeStaff]);

  // Staff clocked-in map
  const clockedInMap = useMemo(() => {
    const map = new Map<number, TimeEntry>();
    if (timeEntries) {
      for (const e of timeEntries) {
        if (e.clock_out === null) map.set(e.staff_id, e);
      }
    }
    return map;
  }, [timeEntries]);

  // Search dropdown results — all active students not already checked in
  const searchDropdownResults = useMemo(() => {
    if (!searchQuery.trim() || !allStudents) return [];
    const q = searchQuery.toLowerCase();
    return allStudents
      .filter((s) => {
        if (s.enrollment_status !== 'Active') return false;
        if (checkedInIds.has(s.id)) return false;
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        return full.includes(q) || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [allStudents, searchQuery, checkedInIds]);

  /* ── Search filter ── */
  const matchesSearch = useCallback((name: string) => {
    if (!searchQuery.trim()) return true;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  const filteredExpected = useMemo(
    () => expectedStudents.filter((s) => matchesSearch(`${s.first_name} ${s.last_name}`)),
    [expectedStudents, matchesSearch]
  );
  const filteredCheckedIn = useMemo(
    () => checkedInStudents.filter((x) => matchesSearch(`${x.student.first_name} ${x.student.last_name}`)),
    [checkedInStudents, matchesSearch]
  );
  const filteredAwaiting = useMemo(
    () => awaitingPickupStudents.filter((x) => matchesSearch(`${x.student.first_name} ${x.student.last_name}`)),
    [awaitingPickupStudents, matchesSearch]
  );
  const filteredCheckedOut = useMemo(
    () => checkedOutStudents.filter((x) => matchesSearch(`${x.student!.first_name} ${x.student!.last_name}`)),
    [checkedOutStudents, matchesSearch]
  );
  const filteredNoShow = useMemo(
    () => noShowStudents.filter((s) => matchesSearch(`${s.first_name} ${s.last_name}`)),
    [noShowStudents, matchesSearch]
  );

  /* ── Barcode scan handler ── */
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim() || !allStudents) return;

    // If a popup is already open, ignore scan
    if (checkInPopupStudent || checkOutPopupStudent) return;

    const query = scan.trim();
    const queryLower = query.toLowerCase();

    // 1. Try API barcode lookup first
    let student: Student | undefined;
    try {
      student = await api.students.byBarcode(query);
    } catch {
      // 404 or error — fall through to local search
    }

    // 2. Fall back to local search (student_id, folder_barcode, name)
    if (!student) {
      student = allStudents.find(
        (s) =>
          s.folder_barcode?.toLowerCase() === queryLower ||
          s.student_id?.toLowerCase() === queryLower ||
          s.first_name.toLowerCase() === queryLower ||
          `${s.first_name} ${s.last_name}`.toLowerCase() === queryLower
      );
    }

    if (!student) {
      setAnnouncement('Student not found');
      setScanError('Student not found');
      setScan('');
      setTimeout(() => setScanError(''), 3000);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const activeRecord = activeAttendanceMap.get(student.id);
    if (activeRecord) {
      // Student is currently checked in — open checkout confirm popup
      setCheckOutPopupStudent(student);
      setCheckOutPopupAttendance(activeRecord);
    } else {
      setCheckInPopupStudent(student);
    }
    setScan('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  /* ── Edit class prep for already-checked-in student ──
   *  Two sources:
   *    1. classroom_assignments.flags — if the student has been assigned to
   *       a row in Live Class. Prep was merged here at assignment time.
   *    2. cb_attendance.pending_class_prep — if no assignment exists yet,
   *       this is where check-in-time prep still lives.
   *  handleCheckInConfirm in edit mode dispatches the save target the same way. */
  const handleEditPrep = (student: Student) => {
    const assignment = assignments?.find((a) => a.student_id === student.id);
    const currentAttendance = activeAttendanceMap.get(student.id);
    const sourceFlags = assignment?.flags ?? currentAttendance?.pending_class_prep ?? null;
    setCheckInEditPrep({
      ...parseExistingFlags(sourceFlags),
      session_duration_minutes: currentAttendance?.session_duration_minutes ?? null,
    });
    setCheckInPopupStudent(student);
  };

  /* ── Check-in confirm from popup ── */
  const handleCheckInConfirm = async (options: CheckInOptions) => {
    // Edit mode: only update flags, don't create a new check-in record
    if (checkInEditPrep) {
      const prepInput = {
        selectedFlags: options.selectedFlags,
        selectedChecklist: options.selectedChecklist,
        noteForTeacher: options.noteForTeacher,
        teacherNotes: options.teacherNotes,
      };
      const flags = buildClassPrepFlags(prepInput);
      // Dispatch the save based on whether the student has been assigned to
      // a row yet. If yes, classroom_assignments.flags is the live source of
      // truth (server cleared pending_class_prep at assignment time). If no,
      // we PATCH the attendance row's pending_class_prep so the data survives
      // until assignment.
      const editAttendance = activeAttendanceMap.get(options.studentId);
      const editAttId = editAttendance?.id;
      const editAssignment = assignments?.find((a) => a.student_id === options.studentId);
      try {
        if (editAssignment) {
          // 86ah0ex1k: pass attendance_id so the PATCH targets the active
          // session-bound assignment row directly under v2.51.0+; backend
          // falls back to date-scoped lookup when omitted.
          await updateStudentFlags(options.studentId, flags, undefined, editAttId);
        } else if (editAttId !== undefined) {
          // Cross-tablet path: write to cb_attendance.pending_class_prep so a
          // teacher on a different tablet sees the edit on their next SWR poll.
          await updateAttendance(editAttId, { pending_class_prep: flags });
        }
      } catch (err) {
        console.error('handleEditPrep: failed to save edit', err);
      }
      // Bug 86agkv2wu fix: Update Class Prep also persists session_duration_minutes when changed.
      // Number() coercion both sides: WordPress returns numeric columns as strings, so a raw
      // !== check against a number always fires and the backend rejects the empty PUT with 400.
      const currentAttendance = activeAttendanceMap.get(options.studentId);
      if (
        currentAttendance &&
        options.sessionMinutes !== undefined &&
        Number(options.sessionMinutes) !== Number(currentAttendance.session_duration_minutes)
      ) {
        try {
          await updateAttendance(currentAttendance.id, {
            session_duration_minutes: Number(options.sessionMinutes),
          });
        } catch (err) {
          console.error('handleEditPrep: failed to update session duration', err);
        }
      }
      setCheckInPopupStudent(null);
      setCheckInEditPrep(null);
      return;
    }

    const studentName = checkInPopupStudent
      ? `${checkInPopupStudent.first_name} ${checkInPopupStudent.last_name}`
      : 'Student';

    // Cross-tablet class-prep persistence ships server-side as of mu-plugin
    // v2.55.0. The popup payload goes directly on the check-in body; the
    // backend stores it on cb_attendance.pending_class_prep, then merges into
    // cb_row_assignments.flags on POST /classroom/assignments. No more
    // per-tablet localStorage staging.
    const prepInput = {
      selectedFlags: options.selectedFlags,
      selectedChecklist: options.selectedChecklist,
      noteForTeacher: options.noteForTeacher,
      teacherNotes: options.teacherNotes,
    };
    let result: Awaited<ReturnType<typeof checkInStudent>>;
    try {
      result = await checkInStudent({
        student_id: options.studentId,
        source: 'kiosk',
        checked_in_by: 'kiosk',
        session_duration_minutes: options.sessionMinutes,
        ...(hasAnyClassPrep(prepInput) ? { pending_class_prep: buildClassPrepFlags(prepInput) } : {}),
      });
    } catch (err) {
      console.error('handleCheckInConfirm: checkInStudent failed', err);
      setCheckInPopupStudent(null);
      return;
    }
    const flagSaveFailed = false;

    setCheckInPopupStudent(null);
    // 86ah0mqee bug 4: clear the search bar after a successful check-in so the
    // next student doesn't have to manually clear stale filter state.
    setSearchQuery('');
    setShowSearchDropdown(false);
    setAnnouncement(`${studentName} checked in`);
    setUndoToast({
      id: ++toastIdRef.current,
      message: flagSaveFailed
        ? `${studentName} checked in — class prep may not have saved`
        : `${studentName} checked in`,
      onUndo: async () => {
        await deleteAttendance(result.id);
        try { await removeStudentFromRow(options.studentId); } catch { /* noop */ }
      },
    });
  };

  /* ── Shared checkout handler (green arrow + scanner popup) ── */
  const handleCheckOut = async (studentId: number) => {
    const student = allStudents?.find((s) => s.id === studentId);
    const existing = activeAttendanceMap.get(studentId);
    await checkOutStudent({ student_id: studentId }, centerToday);
    try { await removeStudentFromRow(studentId); } catch { /* noop */ }
    if (student && existing) {
      const name = `${student.first_name} ${student.last_name}`;
      setAnnouncement(`${name} checked out`);
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} checked out`,
        onUndo: async () => {
          await updateAttendance(existing.id, { check_out: null }, centerToday);
        },
      });
    }
  };

  /* ── Move to Expected (delete attendance record) ── */
  const handleMoveToExpected = async (studentId: number, attendanceId: number) => {
    closeMoveMenu();
    const student = allStudents?.find((s) => s.id === studentId);
    const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
    try {
      await deleteAttendance(attendanceId);
      // Backend auto-clears row assignments; remove from local cache too
      try { await removeStudentFromRow(studentId); } catch { /* noop */ }
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} moved to Expected`,
        onUndo: async () => {
          const duration = student
            ? getSessionDuration(student.subjects, { scheduleDetail: student.schedule_detail })
            : 30;
          await checkInStudent({ student_id: studentId, source: 'manual', checked_in_by: 'staff', session_duration_minutes: duration });
        },
      });
    } catch {
      setAnnouncement('Failed to move student. Please try again.');
    }
  };

  /* ── Move Checked Out → Checked In or Awaiting Pickup (clear check_out + status) ── */
  const handleMoveFromCheckedOut = async (
    studentId: number,
    attendanceId: number,
    target: 'checked-in' | 'row-complete',
  ) => {
    closeMoveMenu();
    const student = allStudents?.find((s) => s.id === studentId);
    const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
    const label = target === 'row-complete' ? 'Awaiting Pickup' : 'Checked In';
    try {
      await updateAttendance(attendanceId, { check_out: null, status: target });
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} moved to ${label}`,
        onUndo: async () => {
          await checkOutStudent({ student_id: studentId });
        },
      });
    } catch {
      setAnnouncement('Failed to move student. Please try again.');
    }
  };

  /* ── Status flip for active rows (Checked In ↔ Awaiting Pickup) ── */
  const handleSetStatus = async (
    studentId: number,
    attendanceId: number,
    target: 'checked-in' | 'row-complete',
  ) => {
    closeMoveMenu();
    const student = allStudents?.find((s) => s.id === studentId);
    const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
    const previous = target === 'checked-in' ? 'row-complete' : 'checked-in';
    const label = target === 'row-complete' ? 'Awaiting Pickup' : 'Checked In';
    try {
      await updateAttendance(attendanceId, { status: target });
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} moved to ${label}`,
        onUndo: async () => {
          await updateAttendance(attendanceId, { status: previous });
        },
      });
    } catch {
      setAnnouncement('Failed to move student. Please try again.');
    }
  };

  /* ── Staff timeclock ── */
  const handleClockIn = async (staffId: number) => {
    await clockInStaff({ staff_id: staffId, source: 'kiosk' });
  };
  const handleClockOut = async (staffId: number) => {
    await clockOutStaff({ staff_id: staffId });
  };

  /* ── Send pickup-reminder / missed-you SMS ── */
  const handleMissedYou = async (student: Student) => {
    const sid = String(student.id);
    try {
      const res = await fetch('/api/attendance/missed-you', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, contactId: student.primary_contact_id }),
      });
      const data = await res.json();
      if (res.ok || data.error === 'Endpoint not yet available') {
        setSentMissedYou((prev) => new Set(prev).add(sid));
      }
    } catch {
      // silent
    }
  };

  /* ── Time remaining helper ── */
  const getRemaining = (student: Student, checkInTime: string, sessionDurationMinutes?: number): number => {
    return getTimeRemaining(student.subjects, checkInTime, {
      scheduleDetail: student.schedule_detail,
      sessionDurationMinutes,
    });
  };

  const remainingClass = (mins: number): string => {
    if (mins <= 0) return styles.overtime;
    if (mins <= 5) return styles.warning;
    return '';
  };

  const waitClass = (mins: number): string => {
    if (mins >= 10) return styles.overtime;
    if (mins >= 5) return styles.warning;
    return '';
  };

  const dismissRemoveToast = () => {
    if (removeToastTimerRef.current) clearTimeout(removeToastTimerRef.current);
    setRemoveToast(null);
  };

  /* ── Confirmed remove from board (destructive) ── */
  const confirmRemoveFromBoard = async () => {
    if (!removeConfirm) return;
    const { student, attendanceId } = removeConfirm;
    const name = `${student.first_name} ${student.last_name}`;
    setRemoveConfirm(null);
    try {
      if (attendanceId !== null) {
        await deleteAttendance(attendanceId);
        try { await removeStudentFromRow(student.id); } catch { /* noop */ }
      }
    } catch {
      setAnnouncement('Failed to remove. Please try again.');
      return;
    }
    setRemoveToast(`${name} removed from attendance board`);
    if (removeToastTimerRef.current) clearTimeout(removeToastTimerRef.current);
    removeToastTimerRef.current = setTimeout(() => setRemoveToast(null), 4000);
  };

  /* ── Confirmed checkout from card tap (safety-dialog flow) ── */
  const confirmCheckOutFromDialog = async () => {
    if (!checkOutConfirm) return;
    const studentId = checkOutConfirm.student.id;
    setCheckOutConfirm(null);
    await handleCheckOut(studentId);
  };

  /* ── Text Parent dropdown trigger ── */
  const toggleTextMenu = (menuKey: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (textMenuOpen === menuKey) {
      setTextMenuOpen(null);
      setTextMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTextMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setTextMenuOpen(menuKey);
  };
  const closeTextMenu = () => {
    setTextMenuOpen(null);
    setTextMenuPos(null);
  };

  /* ── Move between columns ── */
  const toggleMoveMenu = (menuKey: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (moveMenuOpen === menuKey) {
      setMoveMenuOpen(null);
      setMoveMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMoveMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMoveMenuOpen(menuKey);
  };

  const closeMoveMenu = () => {
    setMoveMenuOpen(null);
    setMoveMenuPos(null);
  };

  const handleMoveWithTime = (
    target: 'checkedIn' | 'checkedOut',
    studentId: number,
    studentName: string,
    attendanceId?: number,
  ) => {
    closeMoveMenu();
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setMoveCheckInTime(`${hh}:${mm}`);
    setMoveCheckOutTime(`${hh}:${mm}`);
    setMoveTimePrompt({ studentId, studentName, target, existingAttendanceId: attendanceId });
  };

  const handleMoveConfirm = async () => {
    if (!moveTimePrompt) return;
    const { studentId, target, existingAttendanceId } = moveTimePrompt;
    const student = allStudents?.find((s) => s.id === studentId);
    const duration = student
      ? getSessionDuration(student.subjects, { scheduleDetail: student.schedule_detail })
      : 30;

    try {
      if (target === 'checkedIn') {
        // Check in the student (ignore custom time — API creates with current time)
        if (!existingAttendanceId) {
          await checkInStudent({ student_id: studentId, source: 'manual', checked_in_by: 'staff', session_duration_minutes: duration });
        }
      } else {
        // Move to Checked Out: check in first if needed, then check out
        if (!existingAttendanceId) {
          await checkInStudent({ student_id: studentId, source: 'manual', checked_in_by: 'staff', session_duration_minutes: duration });
        }
        await checkOutStudent({ student_id: studentId });
        try { await removeStudentFromRow(studentId); } catch { /* noop */ }
      }
    } catch { /* silent */ }

    setMoveTimePrompt(null);
    setMoveCheckInTime('');
    setMoveCheckOutTime('');
  };

  const isLoading = !allStudents || !allAttendance;

  /* ═══════════════════════════════════════════
     BOARD RENDERER (factored out of the JSX so refs/closures land cleanly
     in handler scope rather than being captured by an inline IIFE).
     ═══════════════════════════════════════════ */
  const renderBoard = () => {
    const COLUMN_ORDER: ColumnKey[] = ['expected', 'checkedIn', 'awaiting', 'checkedOut', 'noShow'];
    const COLUMN_META: Record<ColumnKey, { label: string; count: number; modifier: string }> = {
      expected:   { label: 'Expected',         count: filteredExpected.length,   modifier: styles.colExpected },
      checkedIn:  { label: 'Checked In',       count: filteredCheckedIn.length,  modifier: styles.colCheckedIn },
      awaiting:   { label: 'Awaiting Pickup',  count: filteredAwaiting.length,   modifier: styles.colAwaiting },
      checkedOut: { label: 'Checked Out',      count: filteredCheckedOut.length, modifier: styles.colCheckedOut },
      noShow:     { label: 'No-Show',          count: filteredNoShow.length,     modifier: styles.colNoShow },
    };

    const gridTemplate = COLUMN_ORDER
      .map((k) => (collapsedColumns.has(k) ? 'var(--strip-w)' : '1fr'))
      .join(' ');

    const renderHeader = (key: ColumnKey, collapsed: boolean) => {
      const meta = COLUMN_META[key];
      return (
        <button
          type="button"
          className={`${styles.colHeader} ${meta.modifier}`}
          onClick={() => toggleColumn(key)}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${meta.label}`}
        >
          <span className={styles.colHeaderCaret}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </span>
          <span className={styles.colHeaderLabel}>{meta.label}</span>
          <span className={styles.colBadge}>{meta.count}</span>
        </button>
      );
    };

    const renderStrip = (key: ColumnKey) => {
      const meta = COLUMN_META[key];
      return (
        <button
          key={key}
          type="button"
          className={`${styles.column} ${styles.strip} ${meta.modifier}`}
          onClick={() => toggleColumn(key)}
          aria-expanded={false}
          aria-label={`Expand ${meta.label}`}
        >
          <span className={styles.stripCaret}><ChevronRight size={14} /></span>
          <span className={styles.stripLabel}>{meta.label}</span>
          <span className={styles.stripBadge}>{meta.count}</span>
        </button>
      );
    };

    const renderPermissionStack = (s: Student) => {
      const pref = getCheckoutPreference(s);
      if (pref.kind === 'parent') {
        return <p className={styles.permLine}>Parent Pickup</p>;
      }
      if (pref.kind === 'independent') {
        return (
          <>
            <p className={styles.permLine}>Independent</p>
            {pref.exit === 'unknown' ? (
              <p className={`${styles.permSub} ${styles.permWarn}`}>Exit Not Set</p>
            ) : (
              <p className={styles.permSub}>{pref.exit === 'front' ? 'Exit Front' : 'Exit Back'}</p>
            )}
          </>
        );
      }
      return <p className={`${styles.permLine} ${styles.permWarn}`}>Checkout Not Set</p>;
    };

    const renderSentBadge = (att: Attendance) => {
      if (!att.sms_10min_sent || !att.sms_10min_sent_at) return null;
      return (
        <span className={styles.sentInline}>
          <Check size={11} /> Sent {formatTime(att.sms_10min_sent_at)}
        </span>
      );
    };

    const renderMoveMenu = (
      sourceKey: ColumnKey,
      menuKey: string,
      student: Student,
      attendanceId: number | null,
    ) => {
      if (moveMenuOpen !== menuKey || !moveMenuPos) return null;
      const studentName = `${student.first_name} ${student.last_name}`;
      const items: Array<{ label: string; onClick: () => void }> = [];

      if (sourceKey === 'expected') {
        items.push(
          { label: 'Move to Checked In',   onClick: () => handleMoveWithTime('checkedIn', student.id, studentName) },
          { label: 'Move to Checked Out',  onClick: () => handleMoveWithTime('checkedOut', student.id, studentName) },
          { label: 'Mark Excused',         onClick: () => { closeMoveMenu(); setExcuseModalStudent(student); } },
        );
      } else if (sourceKey === 'checkedIn') {
        items.push(
          { label: 'Move to Awaiting Pickup', onClick: () => { if (attendanceId !== null) handleSetStatus(student.id, attendanceId, 'row-complete'); } },
          { label: 'Move to Checked Out',     onClick: () => { closeMoveMenu(); handleCheckOut(student.id); } },
          { label: 'Move to No-Show',         onClick: () => { if (attendanceId !== null) handleMoveToExpected(student.id, attendanceId); setExcuseModalStudent(student); } },
        );
      } else if (sourceKey === 'awaiting') {
        items.push(
          { label: 'Move to Checked In',  onClick: () => { if (attendanceId !== null) handleSetStatus(student.id, attendanceId, 'checked-in'); } },
          { label: 'Move to Checked Out', onClick: () => { closeMoveMenu(); handleCheckOut(student.id); } },
        );
      } else if (sourceKey === 'checkedOut') {
        items.push(
          { label: 'Move to Awaiting Pickup', onClick: () => { if (attendanceId !== null) handleMoveFromCheckedOut(student.id, attendanceId, 'row-complete'); } },
          { label: 'Move to Checked In',      onClick: () => { if (attendanceId !== null) handleMoveFromCheckedOut(student.id, attendanceId, 'checked-in'); } },
        );
      } else if (sourceKey === 'noShow') {
        items.push(
          { label: 'Move to Checked In',  onClick: () => handleMoveWithTime('checkedIn', student.id, studentName) },
          { label: 'Move to Checked Out', onClick: () => handleMoveWithTime('checkedOut', student.id, studentName) },
        );
      }

      return createPortal(
        <div className={styles.moveMenu} style={{ top: moveMenuPos.top, right: moveMenuPos.right }}>
          {items.map((item, i) => (
            <button key={i} className={styles.moveMenuItem} onClick={(e) => { e.stopPropagation(); item.onClick(); }}>
              <ChevronRight size={12} className={styles.moveMenuChevron} />
              <span>{item.label}</span>
            </button>
          ))}
          {sourceKey !== 'expected' && (
            <>
              <div className={styles.moveMenuDivider} />
              <button
                className={`${styles.moveMenuItem} ${styles.moveMenuItemDanger}`}
                onClick={(e) => { e.stopPropagation(); closeMoveMenu(); setRemoveConfirm({ student, attendanceId }); }}
              >
                <Trash2 size={12} />
                <span>Remove from board</span>
              </button>
            </>
          )}
        </div>,
        document.body,
      );
    };

    const renderTextMenu = (menuKey: string, student: Student) => {
      if (textMenuOpen !== menuKey || !textMenuPos) return null;
      const bath = getBathroomPreference(student);
      const bathDisabled = bath === 'independent';
      return createPortal(
        <div className={styles.textMenu} style={{ top: textMenuPos.top, right: textMenuPos.right }}>
          <button
            className={styles.textMenuItem}
            onClick={(e) => { e.stopPropagation(); closeTextMenu(); setSmsPopup({ student, mode: 'pickup' }); }}
          >
            <span className={`${styles.textMenuIcon} ${styles.textMenuIconPickup}`}><Clock size={14} /></span>
            <span>Send pickup reminder</span>
          </button>
          <button
            className={`${styles.textMenuItem} ${bathDisabled ? styles.textMenuItemDisabled : ''}`}
            disabled={bathDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (bathDisabled) return;
              closeTextMenu();
              setSmsPopup({ student, mode: 'bathroom' });
            }}
          >
            <span className={`${styles.textMenuIcon} ${styles.textMenuIconBath}`}><Bath size={14} /></span>
            <span className={styles.textMenuItemBody}>
              Send bathroom text
              {bathDisabled && <span className={styles.textMenuItemSub}>Student goes independently</span>}
            </span>
          </button>
        </div>,
        document.body,
      );
    };

    const renderColumnBody = (key: ColumnKey) => {
      switch (key) {
        case 'expected':
          if (filteredExpected.length === 0) return <p className={styles.emptyCol}>All students accounted for.</p>;
          return filteredExpected.map((s) => (
            <div key={s.id} className={styles.attendanceCard}>
              <div className={styles.cardTop}>
                <a
                  href={`/students/${s.id}`}
                  className={styles.cardName}
                  onClick={(e) => e.stopPropagation()}
                >
                  {s.first_name} {s.last_name}
                </a>
                <span className={styles.cardScheduled}>{formatTimeKey(s.class_time_sort_key)}</span>
              </div>
              <div className={styles.cardActionsRow}>
                <button
                  className={styles.btnExcused}
                  onClick={() => setExcuseModalStudent(s)}
                >
                  Excused
                </button>
                <button
                  className={styles.btnPlusCircle}
                  onClick={() => setCheckInPopupStudent(s)}
                  aria-label={`Check in ${s.first_name} ${s.last_name}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ));

        case 'checkedIn':
          if (filteredCheckedIn.length === 0) return <p className={styles.emptyCol}>No students checked in yet.</p>;
          return filteredCheckedIn.map(({ attendance: att, student: s }) => {
            const remaining = getRemaining(s, att.check_in, att.session_duration_minutes);
            const stateClass = remainingClass(remaining);
            const menuKey = `checkedin-${att.id}`;
            const studentName = `${s.first_name} ${s.last_name}`;
            const timerValue = remaining > 0 ? remaining : Math.abs(remaining);
            const timerUnit = remaining > 0 ? 'min' : 'over';
            return (
              <div
                key={att.id}
                className={`${styles.attendanceCard} ${styles.cardTappable} ${stateClass}`}
                onClick={() => handleEditPrep(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditPrep(s); } }}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{studentName}</span>
                  <span className={styles.cardTimer}>
                    <span className={styles.cardTimerNum}>{timerValue}</span>
                    <span className={styles.cardTimerUnit}>{timerUnit}</span>
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  <div className={styles.permStack}>{renderPermissionStack(s)}</div>
                  {renderSentBadge(att)}
                </div>
                <div className={styles.cardActionsRow}>
                  <span className={styles.cardTimeLine}>
                    In {formatTime(att.check_in)}
                    <button
                      className={styles.editBtnInline}
                      onClick={(e) => { e.stopPropagation(); setEditAttendance({ attendance: att, studentName }); }}
                      aria-label={`Edit attendance for ${studentName}`}
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                  <div className={styles.cardCircleActions}>
                    <button
                      className={styles.iconCircleBtn}
                      onClick={(e) => { e.stopPropagation(); toggleMoveMenu(menuKey, e); }}
                      aria-label="Move student"
                    >
                      <RefreshCw size={14} />
                    </button>
                    {renderMoveMenu('checkedIn', menuKey, s, att.id)}
                    <button
                      className={`${styles.iconCircleBtn} ${styles.iconCircleBtnSuccess}`}
                      onClick={(e) => { e.stopPropagation(); setCheckOutConfirm({ student: s, attendance: att, openedAtMs: Date.now() }); }}
                      aria-label={`Check out ${studentName}`}
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          });

        case 'awaiting':
          if (filteredAwaiting.length === 0) return <p className={styles.emptyCol}>No one waiting for pickup.</p>;
          return filteredAwaiting.map(({ attendance: att, student: s }) => {
            const wait = getWaitMinutes(att, s);
            const stateClass = waitClass(wait);
            const menuKey = `awaiting-${att.id}`;
            const textKey = `text-${att.id}`;
            const studentName = `${s.first_name} ${s.last_name}`;
            return (
              <div key={att.id} className={`${styles.attendanceCard} ${stateClass}`}>
                <div className={styles.cardTop}>
                  <a
                    href={`/students/${s.id}`}
                    className={styles.cardName}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {studentName}
                  </a>
                  {wait < 5 ? (
                    <span className={styles.doneBadge}>DONE</span>
                  ) : (
                    <span className={styles.cardTimer}>
                      <span className={styles.cardTimerNum}>{wait}</span>
                      <span className={styles.cardTimerUnit}>WAIT</span>
                    </span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  <div className={styles.permStack}>{renderPermissionStack(s)}</div>
                  {renderSentBadge(att)}
                </div>
                <div className={styles.cardActionsRow}>
                  <span className={styles.cardTimeLine}>
                    In {formatTime(att.check_in)}
                    <button
                      className={styles.editBtnInline}
                      onClick={(e) => { e.stopPropagation(); setEditAttendance({ attendance: att, studentName }); }}
                      aria-label={`Edit attendance for ${studentName}`}
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                  <div className={styles.cardCircleActions}>
                    <button
                      className={styles.btnTextOutlined}
                      onClick={(e) => { e.stopPropagation(); toggleTextMenu(textKey, e); }}
                      aria-label={`Text ${studentName}'s parent`}
                    >
                      <Send size={12} />
                      <span>Text</span>
                      <ChevronDown size={12} className={textMenuOpen === textKey ? styles.caretOpen : ''} />
                    </button>
                    {renderTextMenu(textKey, s)}
                    <button
                      className={styles.iconCircleBtn}
                      onClick={(e) => { e.stopPropagation(); toggleMoveMenu(menuKey, e); }}
                      aria-label="Move student"
                    >
                      <RefreshCw size={14} />
                    </button>
                    {renderMoveMenu('awaiting', menuKey, s, att.id)}
                    <button
                      className={`${styles.iconCircleBtn} ${styles.iconCircleBtnSuccess}`}
                      onClick={(e) => { e.stopPropagation(); setCheckOutConfirm({ student: s, attendance: att, openedAtMs: Date.now() }); }}
                      aria-label={`Check out ${studentName}`}
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          });

        case 'checkedOut':
          if (filteredCheckedOut.length === 0) return <p className={styles.emptyCol}>No students checked out yet.</p>;
          return filteredCheckedOut.map(({ attendance: att, student: s }) => {
            const menuKey = `checkedout-${att.id}`;
            const studentName = `${s.first_name} ${s.last_name}`;
            return (
              <div key={att.id} className={styles.attendanceCard}>
                <div className={styles.cardTop}>
                  <a
                    href={`/students/${s.id}`}
                    className={styles.cardName}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {studentName}
                  </a>
                </div>
                <div className={styles.cardActionsRow}>
                  <div className={styles.timesStack}>
                    <span>In {formatTime(att.check_in)}</span>
                    <span>Out {formatTime(att.check_out!)}
                      <button
                        className={styles.editBtnInline}
                        onClick={() => setEditAttendance({ attendance: att, studentName })}
                        aria-label={`Edit attendance for ${studentName}`}
                      >
                        <Pencil size={12} />
                      </button>
                    </span>
                  </div>
                  <div className={styles.cardCircleActions}>
                    <button
                      className={styles.iconCircleBtn}
                      onClick={(e) => toggleMoveMenu(menuKey, e)}
                      aria-label="Move student"
                    >
                      <RefreshCw size={14} />
                    </button>
                    {renderMoveMenu('checkedOut', menuKey, s, att.id)}
                  </div>
                </div>
              </div>
            );
          });

        case 'noShow':
          if (filteredNoShow.length === 0) return <p className={styles.emptyCol}>No no-shows.</p>;
          return filteredNoShow.map((s) => {
            const sid = String(s.id);
            const isSent = sentMissedYou.has(sid);
            const late = minutesLate(s);
            const menuKey = `noshow-${s.id}`;
            const textKey = `text-noshow-${s.id}`;
            const studentName = `${s.first_name} ${s.last_name}`;
            return (
              <div key={s.id} className={styles.attendanceCard}>
                <div className={styles.cardTop}>
                  <a
                    href={`/students/${s.id}`}
                    className={styles.cardName}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {studentName}
                  </a>
                  <span className={styles.cardTimer}>
                    <span className={`${styles.cardTimerNum} ${styles.cardTimerNumDanger}`}>{late}</span>
                    <span className={`${styles.cardTimerUnit} ${styles.cardTimerUnitDanger}`}>LATE</span>
                  </span>
                </div>
                <p className={styles.cardScheduledLine}>Scheduled {formatTimeKey(s.class_time_sort_key)}</p>
                <div className={styles.cardActionsRow}>
                  {isSent ? (
                    <span className={styles.sentBadge}>
                      <CheckCircle2 size={12} /> Sent
                    </span>
                  ) : (
                    <button
                      className={styles.btnTextOutlined}
                      onClick={(e) => { e.stopPropagation(); toggleTextMenu(textKey, e); }}
                      aria-label={`Text ${studentName}'s parent`}
                    >
                      <Send size={12} />
                      <span>Text</span>
                      <ChevronDown size={12} className={textMenuOpen === textKey ? styles.caretOpen : ''} />
                    </button>
                  )}
                  {renderTextMenu(textKey, s)}
                  <button
                    className={styles.btnGrayOutlined}
                    onClick={() => setExcuseModalStudent(s)}
                  >
                    Excused
                  </button>
                  <button
                    className={styles.iconCircleBtn}
                    onClick={(e) => toggleMoveMenu(menuKey, e)}
                    aria-label="Move student"
                  >
                    <RefreshCw size={14} />
                  </button>
                  {renderMoveMenu('noShow', menuKey, s, allAttendanceMap.get(s.id)?.id ?? null)}
                </div>
              </div>
            );
          });
      }
    };

    return (
      <div
        className={styles.columns}
        data-testid="attendance-columns"
        style={{ gridTemplateColumns: gridTemplate } as React.CSSProperties}
      >
        {COLUMN_ORDER.map((key) => {
          const collapsed = collapsedColumns.has(key);
          const meta = COLUMN_META[key];
          const mobileHidden = mobileTab !== key ? styles.mobileHidden : '';
          if (collapsed) {
            return (
              <div key={key} className={mobileHidden}>
                {renderStrip(key)}
              </div>
            );
          }
          return (
            <div key={key} className={`${styles.column} ${meta.modifier} ${mobileHidden}`}>
              {renderHeader(key, false)}
              <div className={styles.colBody}>
                {renderColumnBody(key)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <div className={styles.page}>
      {/* ── Zone A: Header Bar ── */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoSquare}>CB</div>
          <span className={styles.logoTitle}>
            the <strong>CENTER BOOK</strong>
          </span>
        </div>

        <form onSubmit={handleScan} className={styles.scanForm}>
          <div className={styles.scanInputWrap}>
            <Scan size={18} className={styles.scanIcon} />
            <input
              ref={inputRef}
              type="text"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan folder barcode..."
              className={styles.scanInput}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="none"
            />
            {scanError && <span className={styles.scanError}>{scanError}</span>}
          </div>
        </form>

        <div className={styles.headerRight}>
          <button
            className={`${styles.timeclockToggle} ${showTimeclock ? styles.timeclockToggleActive : ''}`}
            onClick={() => setShowTimeclock((v) => !v)}
          >
            <UserCheck size={16} />
            <span className={styles.timeclockToggleLabel}>Staff Timeclock</span>
          </button>
          <span className={styles.liveClock}>{time}</span>
        </div>
      </header>

      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* ── Zone B: Staff Timeclock Panel ── */}
      {showTimeclock && (
        <div className={styles.timeclockPanel}>
          <div className={styles.timeclockInner}>
            {sortedStaff.length === 0 ? (
              <p className={styles.timeclockEmpty}>No staff loaded</p>
            ) : (
              sortedStaff.map((staff) => {
                const isClockedIn = clockedInMap.has(staff.id);
                return (
                  <div key={staff.id} className={styles.staffCard}>
                    <div className={styles.staffInfo}>
                      <span className={styles.staffName}>{staffDisplayName(staff)}</span>
                      <span className={styles.staffRole}>{formatRole(staff.role)}</span>
                    </div>
                    {isClockedIn ? (
                      <button className={styles.clockOutBtn} onClick={() => handleClockOut(staff.id)}>
                        Clock Out
                      </button>
                    ) : (
                      <button className={styles.clockInBtn} onClick={() => handleClockIn(staff.id)}>
                        Clock In
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Zone C: Search Bar ── */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder="Search students to filter or check in..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>
              <X size={16} />
            </button>
          )}
        </div>
        {showSearchDropdown && searchDropdownResults.length > 0 && (
          <div className={styles.searchDropdown}>
            {searchDropdownResults.map((s) => (
              <button
                key={s.id}
                className={styles.searchDropdownItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setCheckInPopupStudent(s);
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
              >
                {s.first_name} {s.last_name}
                <SubjectBadges subjects={parseSubjects(s.subjects)} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile Tab Bar ── */}
      <div className={styles.mobileTabBar}>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'expected' ? styles.mobileTabExpected : ''}`}
          onClick={() => setMobileTab('expected')}
        >
          Expected ({filteredExpected.length})
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'checkedIn' ? styles.mobileTabCheckedIn : ''}`}
          onClick={() => setMobileTab('checkedIn')}
        >
          In ({filteredCheckedIn.length})
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'awaiting' ? styles.mobileTabAwaiting : ''}`}
          onClick={() => setMobileTab('awaiting')}
        >
          Pickup ({filteredAwaiting.length})
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'checkedOut' ? styles.mobileTabCheckedOut : ''}`}
          onClick={() => setMobileTab('checkedOut')}
        >
          Out ({filteredCheckedOut.length})
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'noShow' ? styles.mobileTabNoShow : ''}`}
          onClick={() => setMobileTab('noShow')}
        >
          No-Show ({filteredNoShow.length})
        </button>
      </div>

      {/* ── Zone D: Five-Column Board ── */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCol}>
                <div className={styles.skeletonHeader} />
                {[0, 1, 2].map((j) => <div key={j} className={styles.skeletonCard} />)}
              </div>
            ))}
          </div>
        ) : (
          // renderBoard's onClick handlers reference helpers that mutate
          // toastIdRef inside their event-handler bodies — not during render.
          // The react-hooks/refs rule traces those statically and false-positives.
          // eslint-disable-next-line react-hooks/refs
          renderBoard()
        )}
      </div>

      {/* ── CheckIn Popup ── */}
      {checkInPopupStudent && (
        <CheckInPopup
          student={checkInPopupStudent}
          onClose={() => { setCheckInPopupStudent(null); setCheckInEditPrep(null); }}
          onConfirm={handleCheckInConfirm}
          existingPrep={checkInEditPrep ?? undefined}
        />
      )}

      {/* ── CheckOut Confirm Popup (scanner-triggered) ── */}
      {checkOutPopupStudent && checkOutPopupAttendance && (
        <CheckOutConfirmPopup
          student={checkOutPopupStudent}
          attendance={checkOutPopupAttendance}
          onConfirm={async () => {
            await handleCheckOut(checkOutPopupStudent.id);
            setCheckOutPopupStudent(null);
            setCheckOutPopupAttendance(null);
            setScan('');
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          onClose={() => {
            setCheckOutPopupStudent(null);
            setCheckOutPopupAttendance(null);
            setScan('');
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />
      )}

      {/* ── Edit Attendance Modal ── */}
      {editAttendance && (
        <AttendanceEditModal
          attendance={editAttendance.attendance}
          studentName={editAttendance.studentName}
          onClose={() => setEditAttendance(null)}
        />
      )}

      {/* ── Excused Absence Modal ── */}
      {excuseModalStudent && (
        <ExcusedAbsenceModal
          student={excuseModalStudent}
          onClose={() => setExcuseModalStudent(null)}
          onSave={() => mutateAbsences()}
        />
      )}

      {/* ── Move Time Prompt ── */}
      {moveTimePrompt && (
        <Modal
          open
          onClose={() => { setMoveTimePrompt(null); setMoveCheckInTime(''); setMoveCheckOutTime(''); }}
          title={`Move to ${moveTimePrompt.target === 'checkedIn' ? 'Checked In' : 'Checked Out'}`}
          subtitle={moveTimePrompt.studentName}
          maxWidth="360px"
        >
          <div className={styles.moveTimeForm}>
            <div className={styles.moveTimeField}>
              <label className={styles.moveTimeLabel}>Check-in Time</label>
              <input
                type="time"
                className={styles.moveTimeInput}
                value={moveCheckInTime}
                onChange={(e) => setMoveCheckInTime(e.target.value)}
              />
            </div>
            {moveTimePrompt.target === 'checkedOut' && (
              <div className={styles.moveTimeField}>
                <label className={styles.moveTimeLabel}>Check-out Time</label>
                <input
                  type="time"
                  className={styles.moveTimeInput}
                  value={moveCheckOutTime}
                  onChange={(e) => setMoveCheckOutTime(e.target.value)}
                />
              </div>
            )}
            <div className={styles.moveTimeActions}>
              <button
                className={styles.cancelSmBtn}
                onClick={() => { setMoveTimePrompt(null); setMoveCheckInTime(''); setMoveCheckOutTime(''); }}
              >
                Cancel
              </button>
              <button className={styles.saveExcuseBtn} onClick={handleMoveConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Check-out Confirmation Dialog ── */}
      {checkOutConfirm && (() => {
        const { student, attendance, openedAtMs } = checkOutConfirm;
        const studentName = `${student.first_name} ${student.last_name}`;
        const elapsed = Math.max(0, Math.floor((openedAtMs - new Date(attendance.check_in).getTime()) / 60000));
        const nowDisplay = new Date(openedAtMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        return (
          <Modal
            open
            onClose={() => setCheckOutConfirm(null)}
            title={`Check out ${studentName}?`}
            maxWidth="380px"
          >
            <div className={styles.confirmBody}>
              <div className={`${styles.confirmIcon} ${styles.confirmIconSuccess}`}>
                <LogOut size={20} />
              </div>
              <p className={styles.confirmText}>
                {studentName.split(' ')[0]} has been here for <strong>{elapsed} minutes</strong>. Check-out will be recorded at the current time.
              </p>
              <div className={styles.confirmContextBox}>
                <span className={styles.confirmContextLabel}>CHECK-OUT TIME</span>
                <span className={styles.confirmContextValue}>{nowDisplay}</span>
              </div>
              <div className={styles.confirmActions}>
                <button className={styles.btnGhost} onClick={() => setCheckOutConfirm(null)}>Cancel</button>
                <button className={styles.btnSuccess} onClick={confirmCheckOutFromDialog}>Check Out</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── Remove from Board Confirmation Dialog ── */}
      {removeConfirm && (() => {
        const studentName = `${removeConfirm.student.first_name} ${removeConfirm.student.last_name}`;
        return (
          <Modal
            open
            onClose={() => setRemoveConfirm(null)}
            title={`Remove ${studentName} from today's attendance?`}
            maxWidth="400px"
          >
            <div className={styles.confirmBody}>
              <div className={`${styles.confirmIcon} ${styles.confirmIconDanger}`}>
                <AlertTriangle size={20} />
              </div>
              <p className={styles.confirmText}>
                {studentName.split(' ')[0]} will no longer appear on the attendance board. Use this when a record was created in error (wrong student scanned, wrong button pressed). This does not cancel her session or remove her from the class schedule.
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.btnGhost} onClick={() => setRemoveConfirm(null)}>Cancel</button>
                <button className={styles.btnDanger} onClick={confirmRemoveFromBoard}>Remove</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── SMS Popup (3 consent states) ── */}
      {smsPopup && (
        <SmsPopup
          student={smsPopup.student}
          mode={smsPopup.mode}
          onClose={() => setSmsPopup(null)}
          onSend={async () => {
            await handleMissedYou(smsPopup.student);
            setSmsPopup(null);
          }}
        />
      )}

      {/* ── Undo Toast ── */}
      <UndoToast item={undoToast} onDismiss={() => setUndoToast(null)} />

      {/* ── Remove-from-Board Confirmation Toast (separate from Undo) ── */}
      {removeToast && createPortal(
        <div className={styles.removeToast} role="status" onClick={dismissRemoveToast}>
          <CheckCircle2 size={14} />
          <span>{removeToast}</span>
        </div>,
        document.body,
      )}

      {/* Close move menu on outside click */}
      {moveMenuOpen && createPortal(
        <div className={styles.moveBackdrop} onClick={closeMoveMenu} />,
        document.body
      )}

      {/* Close text menu on outside click */}
      {textMenuOpen && createPortal(
        <div className={styles.moveBackdrop} onClick={closeTextMenu} />,
        document.body,
      )}

      {/* Close search dropdown on outside click */}
      {showSearchDropdown && (
        <div className={styles.walkInBackdrop} onClick={() => setShowSearchDropdown(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SMS POPUP — 3 consent states (on / opted_out / no_reply)
   ═══════════════════════════════════════════ */

interface SmsPopupProps {
  student: Student;
  mode: 'pickup' | 'bathroom';
  onClose: () => void;
  onSend: () => void;
}

function SmsPopup({ student, mode, onClose, onSend }: SmsPopupProps) {
  const { data: contacts } = useStudentContacts(student.id);
  const pickupParent = useMemo(() => {
    if (!contacts || contacts.length === 0) return null;
    const primary = contacts.find((c) => c.is_primary_contact);
    return primary ?? contacts[0];
  }, [contacts]);

  const consent = getSmsConsent(pickupParent as Record<string, unknown> | null);
  const firstName = student.first_name;
  const fullParentName = pickupParent ? `${pickupParent.first_name} ${pickupParent.last_name}` : '—';
  const phone = pickupParent?.phone ?? '';

  const subtitle = mode === 'pickup'
    ? `Pickup reminder for ${firstName} ${student.last_name}`
    : `Bathroom text for ${firstName} ${student.last_name}`;

  const messagePreview = mode === 'pickup'
    ? `Hi ${pickupParent?.first_name ?? ''}, this is a reminder that ${firstName} is ready to be picked up at Kumon Grand Rapids North.`
    : `Hi ${pickupParent?.first_name ?? ''}, ${firstName} is using the restroom at Kumon Grand Rapids North.`;

  return (
    <Modal open onClose={onClose} title={`Text ${firstName}'s parent`} subtitle={subtitle} maxWidth="420px">
      <div className={styles.smsBody}>
        <div className={`${styles.parentBlock} ${styles[`parentBlock_${consent}`]}`}>
          <div className={styles.parentBlockText}>
            <span className={styles.parentBlockLabel}>PICKUP PARENT</span>
            <span className={styles.parentBlockName}>{fullParentName}</span>
            {phone && <span className={styles.parentBlockPhone}>{phone}</span>}
          </div>
          <span className={`${styles.consentBadge} ${styles[`consentBadge_${consent}`]}`}>
            {consent === 'on' && (<><Check size={11} /> SMS on</>)}
            {consent === 'opted_out' && 'Opted out'}
            {consent === 'no_reply' && 'No reply'}
          </span>
        </div>

        {consent === 'on' && (
          <div className={styles.smsPreview}>
            <span className={styles.smsPreviewLabel}>MESSAGE PREVIEW</span>
            <p className={styles.smsPreviewBody}>{messagePreview}</p>
          </div>
        )}

        {consent === 'opted_out' && (
          <>
            <div className={styles.callBlock}>
              <Phone size={16} />
              <div>
                <div className={styles.callBlockTitle}>Call {fullParentName}</div>
                {phone && <div className={styles.callBlockPhone}>{phone}</div>}
              </div>
            </div>
            <p className={styles.smsHelperWarn}>
              The Ops app can&rsquo;t place phone calls. Staff use the office phone to call this number.
            </p>
          </>
        )}

        {consent === 'no_reply' && (
          <>
            <p className={styles.smsHelper}>We don&rsquo;t have SMS consent on file yet.</p>
            <button
              className={styles.btnOutlined}
              onClick={() => {
                /* TODO(86agxw8n3): wire to existing SMS consent capture flow once it ships. */
                onClose();
              }}
            >
              <HelpCircle size={14} /> Get SMS consent
            </button>
            {phone && (
              <p className={styles.smsHelperSm}>
                Or use the office phone to call <strong>{phone}</strong> directly.
              </p>
            )}
          </>
        )}

        <div className={styles.confirmActions}>
          <button className={styles.btnGhost} onClick={onClose}>
            {consent === 'opted_out' ? 'Close' : 'Cancel'}
          </button>
          {consent === 'on' && (
            <button className={styles.btnAccent} onClick={onSend}>
              <Send size={14} /> Send Text
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
