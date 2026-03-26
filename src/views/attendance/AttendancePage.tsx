'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Scan, Search, X, UserCheck, Clock, Pencil, Send, CheckCircle2,
  AlertTriangle, CalendarPlus, Plus, Check, ArrowRight, ChevronDown,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import AttendanceEditModal from '@/components/AttendanceEditModal';
import ExcusedAbsenceModal from '@/components/attendance/ExcusedAbsenceModal';
import SubjectBadges from '@/components/SubjectBadges';
import CheckInPopup from '@/views/kiosk/CheckInPopup';
import type { CheckInOptions } from '@/views/kiosk/CheckInPopup';
import UndoToast from '@/components/ui/UndoToast';
import type { UndoToastItem } from '@/components/ui/UndoToast';
import { useStudents } from '@/hooks/useStudents';
import {
  useAttendance, useCheckedInStudents,
  checkInStudent, checkOutStudent, deleteAttendance, updateAttendance,
} from '@/hooks/useAttendance';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock, clockInStaff, clockOutStaff } from '@/hooks/useTimeclock';
import { assignStudentToRow, updateStudentFlags, removeStudentFromRow } from '@/hooks/useRows';
import { useAbsences } from '@/hooks/useAbsences';
import {
  getTimeRemaining, getSessionDuration, formatTimeKey, formatTime, parseSubjects,
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

function isNoShow(student: Student): boolean {
  if (!student.class_time_sort_key) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes =
    Math.floor(student.class_time_sort_key / 100) * 60 +
    (student.class_time_sort_key % 100);
  return nowMinutes - scheduledMinutes >= 15;
}

function minutesLate(student: Student): number {
  if (!student.class_time_sort_key) return 0;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes =
    Math.floor(student.class_time_sort_key / 100) * 60 +
    (student.class_time_sort_key % 100);
  return Math.max(0, nowMinutes - scheduledMinutes);
}

/* ── Mobile tab names ── */
type MobileTab = 'expected' | 'checkedIn' | 'checkedOut' | 'noShow';

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

  // Search dropdown (all active students)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Undo toast
  const [undoToast, setUndoToast] = useState<UndoToastItem | null>(null);
  const toastIdRef = useRef(0);

  // Edit attendance modal
  const [editAttendance, setEditAttendance] = useState<{
    attendance: Attendance; studentName: string;
  } | null>(null);

  // No-show inline panels
  const [missedYouConfirm, setMissedYouConfirm] = useState<string | null>(null);
  const [sentMissedYou, setSentMissedYou] = useState<Set<string>>(new Set());
  const [sendingMissedYou, setSendingMissedYou] = useState<Set<string>>(new Set());

  // Excused absence modal
  const [excuseModalStudent, setExcuseModalStudent] = useState<Student | null>(null);

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

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Data hooks ── */
  const { data: allStudents } = useStudents();
  const { data: allAttendance } = useAttendance();
  const { data: checkedIn } = useCheckedInStudents(undefined, 5000);
  const { data: activeStaff } = useActiveStaff();
  const { data: timeEntries } = useTimeclock();
  const { data: todayAbsences, mutate: mutateAbsences } = useAbsences();

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

  // All attendance IDs for today (including checked out)
  const allAttendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    if (allAttendance) {
      for (const a of allAttendance) map.set(a.student_id, a);
    }
    return map;
  }, [allAttendance]);

  const checkedInIds = useMemo(
    () => new Set(checkedIn?.map((a) => a.student_id) ?? []),
    [checkedIn]
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
  const expectedStudents = useMemo(
    () => scheduledToday.filter((s) => !allAttendanceMap.has(s.id) && !isNoShow(s)),
    [scheduledToday, allAttendanceMap]
  );

  // Column 2: Checked In — has check_in and no check_out
  const checkedInStudents = useMemo(() => {
    if (!checkedIn || !allStudents) return [];
    return checkedIn
      .filter((a) => a.check_out === null)
      .map((a) => ({
        attendance: a,
        student: a.student || allStudents.find((s) => s.id === a.student_id),
      }))
      .filter((x) => !!x.student)
      .sort((a, b) => (a.attendance.check_in || '').localeCompare(b.attendance.check_in || ''));
  }, [checkedIn, allStudents]);

  // Column 3: Checked Out — has check_in AND check_out
  const checkedOutStudents = useMemo(() => {
    if (!allAttendance || !allStudents) return [];
    return allAttendance
      .filter((a) => a.check_in && a.check_out)
      .map((a) => ({
        attendance: a,
        student: a.student || allStudents.find((s) => s.id === a.student_id),
      }))
      .filter((x) => !!x.student);
  }, [allAttendance, allStudents]);

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

  // Excused students shown below no-show column
  const excusedList = useMemo(
    () => scheduledToday.filter(
      (s) => !allAttendanceMap.has(s.id) && excusedIds.has(s.id)
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
    () => checkedInStudents.filter((x) => matchesSearch(`${x.student!.first_name} ${x.student!.last_name}`)),
    [checkedInStudents, matchesSearch]
  );
  const filteredCheckedOut = useMemo(
    () => checkedOutStudents.filter((x) => matchesSearch(`${x.student!.first_name} ${x.student!.last_name}`)),
    [checkedOutStudents, matchesSearch]
  );
  const filteredNoShow = useMemo(
    () => noShowStudents.filter((s) => matchesSearch(`${s.first_name} ${s.last_name}`)),
    [noShowStudents, matchesSearch]
  );
  const filteredExcused = useMemo(
    () => excusedList.filter((s) => matchesSearch(`${s.first_name} ${s.last_name}`)),
    [excusedList, matchesSearch]
  );

  /* ── Barcode scan handler ── */
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim() || !allStudents) return;

    const query = scan.trim().toLowerCase();
    const student = allStudents.find(
      (s) =>
        s.student_id?.toLowerCase() === query ||
        s.first_name.toLowerCase() === query ||
        `${s.first_name} ${s.last_name}`.toLowerCase() === query
    );

    if (!student) {
      setAnnouncement('Student not found');
      setScanError('Student not found');
      setScan('');
      setTimeout(() => setScanError(''), 3000);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const isIn = checkedIn?.some((a) => a.student_id === student.id);
    if (isIn) {
      const existing = checkedIn?.find((a) => a.student_id === student.id);
      await checkOutStudent({ student_id: student.id });
      try { await removeStudentFromRow(student.id); } catch { /* noop */ }
      setAnnouncement(`${student.first_name} ${student.last_name} checked out`);
      if (existing) {
        setUndoToast({
          id: ++toastIdRef.current,
          message: `${student.first_name} ${student.last_name} checked out`,
          onUndo: async () => {
            await updateAttendance(existing.id, { check_out: null });
          },
        });
      }
    } else {
      setCheckInPopupStudent(student);
    }
    setScan('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  /* ── Check-in confirm from popup ── */
  const handleCheckInConfirm = async (options: CheckInOptions) => {
    console.log('handleCheckInConfirm called', options.studentId);
    const studentName = checkInPopupStudent
      ? `${checkInPopupStudent.first_name} ${checkInPopupStudent.last_name}`
      : 'Student';

    let result: Awaited<ReturnType<typeof checkInStudent>>;
    try {
      console.log('handleCheckInConfirm: calling checkInStudent');
      result = await checkInStudent({
        student_id: options.studentId,
        source: 'kiosk',
        checked_in_by: 'kiosk',
        session_duration_minutes: options.sessionMinutes,
      });
      console.log('handleCheckInConfirm: checkInStudent returned', result?.id);
    } catch (err) {
      console.error('handleCheckInConfirm: checkInStudent failed', err);
      setCheckInPopupStudent(null);
      return;
    }

    // Persist flags from check-in prep
    const hasData = options.selectedFlags.length > 0 || options.selectedChecklist.length > 0 || !!options.noteForTeacher;
    if (hasData) {
      const flags: Record<string, unknown> = {};
      options.selectedFlags.forEach((key) => { flags[key] = true; });
      const tasks: Record<string, unknown> = {};
      options.selectedChecklist.forEach((key) => {
        if (key.startsWith('__custom__:')) tasks.custom = key.slice(11);
        else tasks[key] = true;
      });
      if (Object.keys(tasks).length > 0) flags.tasks = tasks;
      if (options.noteForTeacher) flags.teacher_note = options.noteForTeacher;
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        await assignStudentToRow({
          student_id: options.studentId,
          row_label: 'Unassigned',
          session_date: todayDate,
          assigned_by: 'kiosk',
        });
        await updateStudentFlags(options.studentId, flags, todayDate);
      } catch (err) {
        console.error('handleCheckInConfirm: failed to persist check-in flags', err);
      }
    }

    setCheckInPopupStudent(null);
    setAnnouncement(`${studentName} checked in`);
    setUndoToast({
      id: ++toastIdRef.current,
      message: `${studentName} checked in`,
      onUndo: async () => {
        await deleteAttendance(result.id);
        try { await removeStudentFromRow(options.studentId); } catch { /* noop */ }
      },
    });
  };

  /* ── Check out from checked-in card ── */
  const handleCheckOut = async (studentId: number) => {
    const student = allStudents?.find((s) => s.id === studentId);
    const existing = checkedIn?.find((a) => a.student_id === studentId);
    await checkOutStudent({ student_id: studentId });
    try { await removeStudentFromRow(studentId); } catch { /* noop */ }
    if (student && existing) {
      const name = `${student.first_name} ${student.last_name}`;
      setAnnouncement(`${name} checked out`);
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} checked out`,
        onUndo: async () => {
          await updateAttendance(existing.id, { check_out: null });
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

  /* ── Move Checked Out → Checked In (clear check_out) ── */
  const handleMoveToCheckedIn = async (studentId: number, attendanceId: number) => {
    closeMoveMenu();
    const student = allStudents?.find((s) => s.id === studentId);
    const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
    try {
      await updateAttendance(attendanceId, { check_out: null });
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${name} moved to Checked In`,
        onUndo: async () => {
          await checkOutStudent({ student_id: studentId });
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

  /* ── We Missed You ── */
  const handleMissedYou = async (student: Student) => {
    const sid = String(student.id);
    setSendingMissedYou((prev) => new Set(prev).add(sid));
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
    } finally {
      setSendingMissedYou((prev) => { const next = new Set(prev); next.delete(sid); return next; });
      setMissedYouConfirm(null);
    }
  };

  /* ── Time remaining helper ── */
  const getRemaining = (student: Student, checkInTime: string): number => {
    return getTimeRemaining(student.subjects, checkInTime, {
      scheduleDetail: student.schedule_detail,
    });
  };

  const remainingClass = (mins: number): string => {
    if (mins <= 0) return styles.overtime;
    if (mins <= 5) return styles.warning;
    return '';
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

      {/* ── Zone D: Four-Column Grid ── */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCol}>
                <div className={styles.skeletonHeader} />
                {[0, 1, 2].map((j) => <div key={j} className={styles.skeletonCard} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.columns}>

            {/* ── Column 1: Expected (orange) ── */}
            <div className={`${styles.column} ${mobileTab !== 'expected' ? styles.mobileHidden : ''}`}>
              <div className={`${styles.colHeader} ${styles.colHeaderExpected}`}>
                <Clock size={16} />
                <span>Expected</span>
                <span className={styles.colBadge}>{filteredExpected.length}</span>
              </div>
              <div className={styles.colBody}>
                {filteredExpected.length === 0 ? (
                  <p className={styles.emptyCol}>All students accounted for.</p>
                ) : (
                  filteredExpected.map((s) => {
                    const menuKey = `expected-${s.id}`;
                    return (
                      <div key={s.id} className={styles.attendanceCard}>
                        <button
                          className={styles.cardClickableInner}
                          onClick={() => setCheckInPopupStudent(s)}
                          aria-label={`Check in ${s.first_name} ${s.last_name}`}
                        >
                          <div className={styles.cardTop}>
                            <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                            <Plus size={14} className={styles.checkInIcon} />
                          </div>
                          <p className={styles.cardTime}>
                            Scheduled {formatTimeKey(s.class_time_sort_key)}
                          </p>
                        </button>
                        <div className={styles.cardBottom}>
                          <div />
                          <div className={styles.moveWrap}>
                            <button
                              className={styles.moveTrigger}
                              onClick={(e) => toggleMoveMenu(menuKey, e)}
                            >
                              Move <ChevronDown size={12} />
                            </button>
                            {moveMenuOpen === menuKey && moveMenuPos && (
                              <div className={styles.moveMenu} style={{ top: moveMenuPos.top, right: moveMenuPos.right }}>
                                <button className={styles.moveMenuItem} onClick={() => handleMoveWithTime('checkedIn', s.id, `${s.first_name} ${s.last_name}`)}>
                                  Checked In
                                </button>
                                <button className={styles.moveMenuItem} onClick={() => handleMoveWithTime('checkedOut', s.id, `${s.first_name} ${s.last_name}`)}>
                                  Checked Out
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Column 2: Checked In (green) ── */}
            <div className={`${styles.column} ${mobileTab !== 'checkedIn' ? styles.mobileHidden : ''}`}>
              <div className={`${styles.colHeader} ${styles.colHeaderCheckedIn}`}>
                <CheckCircle2 size={16} />
                <span>Checked In</span>
                <span className={styles.colBadge}>{filteredCheckedIn.length}</span>
              </div>
              <div className={styles.colBody}>
                {filteredCheckedIn.length === 0 ? (
                  <p className={styles.emptyCol}>No students checked in yet.</p>
                ) : (
                  filteredCheckedIn.map(({ attendance: att, student: s }) => {
                    if (!s) return null;
                    const remaining = getRemaining(s, att.check_in);
                    const remClass = remainingClass(remaining);
                    const menuKey = `checkedin-${att.id}`;
                    return (
                      <div key={att.id} className={`${styles.attendanceCard} ${remClass}`}>
                        <div className={styles.cardTop}>
                          <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                          <div className={styles.cardActions}>
                            <button
                              className={styles.editBtn}
                              onClick={() => setEditAttendance({ attendance: att, studentName: `${s.first_name} ${s.last_name}` })}
                              aria-label={`Edit attendance for ${s.first_name} ${s.last_name}`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className={styles.checkOutArrowBtn}
                              onClick={() => handleCheckOut(att.student_id)}
                              aria-label={`Check out ${s.first_name} ${s.last_name}`}
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                        <p className={styles.cardTime}>
                          In {formatTime(att.check_in)}
                        </p>
                        <div className={styles.cardBottom}>
                          <span className={`${styles.remainingBadge} ${remClass}`}>
                            {remaining <= 0 ? `${Math.abs(remaining)}min over` : `${remaining}min left`}
                          </span>
                          <div className={styles.moveWrap}>
                            <button
                              className={styles.moveTrigger}
                              onClick={(e) => toggleMoveMenu(menuKey, e)}
                            >
                              Move <ChevronDown size={12} />
                            </button>
                            {moveMenuOpen === menuKey && moveMenuPos && (
                              <div className={styles.moveMenu} style={{ top: moveMenuPos.top, right: moveMenuPos.right }}>
                                <button className={styles.moveMenuItem} onClick={() => handleMoveToExpected(att.student_id, att.id)}>
                                  Expected
                                </button>
                                <button className={styles.moveMenuItem} onClick={() => { closeMoveMenu(); handleCheckOut(att.student_id); }}>
                                  Checked Out
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Column 3: Checked Out (neutral) ── */}
            <div className={`${styles.column} ${mobileTab !== 'checkedOut' ? styles.mobileHidden : ''}`}>
              <div className={`${styles.colHeader} ${styles.colHeaderCheckedOut}`}>
                <Check size={16} />
                <span>Checked Out</span>
                <span className={styles.colBadge}>{filteredCheckedOut.length}</span>
              </div>
              <div className={styles.colBody}>
                {filteredCheckedOut.length === 0 ? (
                  <p className={styles.emptyCol}>No students checked out yet.</p>
                ) : (
                  filteredCheckedOut.map(({ attendance: att, student: s }) => {
                    if (!s) return null;
                    const menuKey = `checkedout-${att.id}`;
                    return (
                      <div key={att.id} className={styles.attendanceCard}>
                        <div className={styles.cardTop}>
                          <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                          <button
                            className={styles.editBtn}
                            onClick={() => setEditAttendance({ attendance: att, studentName: `${s.first_name} ${s.last_name}` })}
                            aria-label={`Edit attendance for ${s.first_name} ${s.last_name}`}
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                        <p className={styles.cardTime}>
                          In {formatTime(att.check_in)} — Out {formatTime(att.check_out!)}
                        </p>
                        <div className={styles.cardBottom}>
                          <div />
                          <div className={styles.moveWrap}>
                            <button
                              className={styles.moveTrigger}
                              onClick={(e) => toggleMoveMenu(menuKey, e)}
                            >
                              Move <ChevronDown size={12} />
                            </button>
                            {moveMenuOpen === menuKey && moveMenuPos && (
                              <div className={styles.moveMenu} style={{ top: moveMenuPos.top, right: moveMenuPos.right }}>
                                <button className={styles.moveMenuItem} onClick={() => handleMoveToCheckedIn(att.student_id, att.id)}>
                                  Checked In
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Column 4: No-Show (red) ── */}
            <div className={`${styles.column} ${mobileTab !== 'noShow' ? styles.mobileHidden : ''}`}>
              <div className={`${styles.colHeader} ${styles.colHeaderNoShow}`}>
                <AlertTriangle size={16} />
                <span>No-Show</span>
                <span className={styles.colBadge}>{filteredNoShow.length}</span>
              </div>
              <div className={styles.colBody}>
                {filteredNoShow.map((s) => {
                  const sid = String(s.id);
                  const isSent = sentMissedYou.has(sid);
                  const isSending = sendingMissedYou.has(sid);
                  const late = minutesLate(s);
                  const menuKey = `noshow-${s.id}`;
                  const noShowAtt = allAttendanceMap.get(s.id);

                  return (
                    <div key={s.id} className={styles.attendanceCard}>
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                        <div className={styles.cardActions}>
                          {noShowAtt && (
                            <button
                              className={styles.editBtn}
                              onClick={() => setEditAttendance({ attendance: noShowAtt, studentName: `${s.first_name} ${s.last_name}` })}
                              aria-label={`Edit attendance for ${s.first_name} ${s.last_name}`}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          <span className={styles.lateBadge}>{late}min late</span>
                        </div>
                      </div>
                      <p className={styles.cardTime}>
                        Expected {formatTimeKey(s.class_time_sort_key)}
                      </p>

                      {/* We Missed You */}
                      {missedYouConfirm === sid ? (
                        <div className={styles.missedYouPanel}>
                          <p className={styles.panelText}>Send &quot;We Missed You&quot; text?</p>
                          <div className={styles.panelActions}>
                            <button
                              className={styles.sendTextBtn}
                              onClick={() => handleMissedYou(s)}
                              disabled={isSending}
                            >
                              <Send size={12} /> {isSending ? 'Sending...' : 'Send Text'}
                            </button>
                            <button className={styles.cancelSmBtn} onClick={() => setMissedYouConfirm(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noShowActions}>
                          {isSent ? (
                            <span className={styles.sentBadge}>
                              <CheckCircle2 size={12} /> Sent
                            </span>
                          ) : (
                            <button
                              className={styles.missedYouBtn}
                              onClick={() => setMissedYouConfirm(sid)}
                            >
                              <Send size={12} /> We Missed You
                            </button>
                          )}
                          <button
                            className={styles.excuseBtn}
                            onClick={() => setExcuseModalStudent(s)}
                          >
                            Mark Excused
                          </button>
                        </div>
                      )}
                      <div className={styles.cardBottom}>
                        <div />
                        <div className={styles.moveWrap}>
                          <button
                            className={styles.moveTrigger}
                            onClick={(e) => toggleMoveMenu(menuKey, e)}
                          >
                            Move <ChevronDown size={12} />
                          </button>
                          {moveMenuOpen === menuKey && moveMenuPos && (
                            <div className={styles.moveMenu} style={{ top: moveMenuPos.top, right: moveMenuPos.right }}>
                              <button className={styles.moveMenuItem} onClick={() => handleMoveWithTime('checkedIn', s.id, `${s.first_name} ${s.last_name}`)}>
                                Checked In
                              </button>
                              <button className={styles.moveMenuItem} onClick={() => handleMoveWithTime('checkedOut', s.id, `${s.first_name} ${s.last_name}`)}>
                                Checked Out
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Excused students */}
                {filteredExcused.map((s) => {
                  const absence = todayAbsences?.find((a) => a.student_id === s.id);
                  return (
                    <div key={s.id} className={`${styles.attendanceCard} ${styles.cardExcused}`}>
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                        <span className={styles.excusedBadge}>Excused</span>
                      </div>
                      <p className={styles.cardTime}>
                        {formatTimeKey(s.class_time_sort_key)} — {absence?.reason || 'excused'}
                      </p>
                      {absence?.homework_out && (
                        <p className={styles.excuseDetail}>Homework in pickup bin</p>
                      )}
                      {absence?.makeup_scheduled && absence.makeup_date && (
                        <p className={styles.makeupLine}>
                          <CalendarPlus size={11} /> Makeup: {absence.makeup_date} {absence.makeup_time || ''}
                        </p>
                      )}
                    </div>
                  );
                })}

                {filteredNoShow.length === 0 && filteredExcused.length === 0 && (
                  <p className={styles.emptyCol}>No absences yet.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── CheckIn Popup ── */}
      {checkInPopupStudent && (
        <CheckInPopup
          student={checkInPopupStudent}
          onClose={() => setCheckInPopupStudent(null)}
          onConfirm={handleCheckInConfirm}
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

      {/* ── Undo Toast ── */}
      <UndoToast item={undoToast} onDismiss={() => setUndoToast(null)} />

      {/* Close move menu on outside click */}
      {moveMenuOpen && (
        <div className={styles.moveBackdrop} onClick={closeMoveMenu} />
      )}

      {/* Close search dropdown on outside click */}
      {showSearchDropdown && (
        <div className={styles.walkInBackdrop} onClick={() => setShowSearchDropdown(false)} />
      )}
    </div>
  );
}
