'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Scan, Search, X, UserCheck, Clock, Pencil, Send, CheckCircle2,
  AlertTriangle, CalendarPlus, Plus, Check,
} from 'lucide-react';
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
import { updateStudentFlags, removeStudentFromRow } from '@/hooks/useRows';
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
  const [mobileTab, setMobileTab] = useState<MobileTab>('expected');

  // Check-in popup
  const [checkInPopupStudent, setCheckInPopupStudent] = useState<Student | null>(null);

  // Walk-in
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInSearch, setWalkInSearch] = useState('');

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

  // Walk-in search results (all active students not already checked in or expected)
  const walkInResults = useMemo(() => {
    if (!walkInSearch.trim() || !allStudents) return [];
    const q = walkInSearch.toLowerCase();
    return allStudents
      .filter((s) => {
        if (s.enrollment_status !== 'Active') return false;
        if (checkedInIds.has(s.id)) return false;
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        return full.includes(q) || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [allStudents, walkInSearch, checkedInIds]);

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
      setScan('');
      return;
    }

    const isIn = checkedIn?.some((a) => a.student_id === student.id);
    if (isIn) {
      const existing = checkedIn?.find((a) => a.student_id === student.id);
      await checkOutStudent({ student_id: student.id });
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
  };

  /* ── Check-in confirm from popup ── */
  const handleCheckInConfirm = async (options: CheckInOptions) => {
    const studentName = checkInPopupStudent
      ? `${checkInPopupStudent.first_name} ${checkInPopupStudent.last_name}`
      : 'Student';

    const result = await checkInStudent({
      student_id: options.studentId,
      source: 'kiosk',
      checked_in_by: 'kiosk',
      session_duration_minutes: options.sessionMinutes,
    });

    // Persist flags
    const hasFlags = options.selectedFlags.length > 0 || options.selectedChecklist.length > 0;
    if (hasFlags) {
      const flags: Record<string, unknown> = {};
      if (options.selectedFlags.includes('New Concept')) flags.new_concept = true;
      if (options.selectedFlags.includes('Needs Help')) flags.needs_help = true;
      if (options.selectedFlags.includes('Work with Amy')) flags.work_with_amy = true;
      const tasks: Record<string, unknown> = {};
      options.selectedChecklist.forEach((item) => {
        if (item.includes('Sound Cards')) tasks.sound_cards = true;
        else if (item.includes('Flash Cards')) tasks.flash_cards = true;
        else if (item.includes('Spelling')) tasks.spelling = true;
        else tasks.custom = item;
      });
      if (Object.keys(tasks).length > 0) flags.tasks = tasks;
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        await updateStudentFlags(options.studentId, flags, todayDate);
      } catch {
        // Non-critical
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
    if (student && existing) {
      setAnnouncement(`${student.first_name} ${student.last_name} checked out`);
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${student.first_name} ${student.last_name} checked out`,
        onUndo: async () => {
          await updateAttendance(existing.id, { check_out: null });
        },
      });
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

      {/* ── Zone C: Search Bar + Walk-in ── */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.walkInWrap}>
          <button className={styles.walkInBtn} onClick={() => setShowWalkIn((v) => !v)}>
            <Plus size={14} /> Walk-in
          </button>
          {showWalkIn && (
            <div className={styles.walkInDropdown}>
              <input
                type="text"
                value={walkInSearch}
                onChange={(e) => setWalkInSearch(e.target.value)}
                placeholder="Search student..."
                className={styles.walkInInput}
                autoFocus
              />
              {walkInResults.map((s) => (
                <button
                  key={s.id}
                  className={styles.walkInResult}
                  onClick={() => {
                    setCheckInPopupStudent(s);
                    setShowWalkIn(false);
                    setWalkInSearch('');
                  }}
                >
                  {s.first_name} {s.last_name}
                  <SubjectBadges subjects={parseSubjects(s.subjects)} />
                </button>
              ))}
              {walkInSearch.trim() && walkInResults.length === 0 && (
                <p className={styles.walkInEmpty}>No students found</p>
              )}
            </div>
          )}
        </div>
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
                  filteredExpected.map((s) => (
                    <button
                      key={s.id}
                      className={styles.cardClickable}
                      onClick={() => setCheckInPopupStudent(s)}
                      aria-label={`Check in ${s.first_name} ${s.last_name}`}
                    >
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                      </div>
                      <p className={styles.cardTime}>
                        Scheduled {formatTimeKey(s.class_time_sort_key)}
                      </p>
                    </button>
                  ))
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
                          </div>
                        </div>
                        <p className={styles.cardTime}>
                          In {formatTime(att.check_in)}
                        </p>
                        <div className={styles.cardBottom}>
                          <span className={`${styles.remainingBadge} ${remClass}`}>
                            {remaining <= 0 ? `${Math.abs(remaining)}min over` : `${remaining}min left`}
                          </span>
                          <button
                            className={styles.checkOutBtn}
                            onClick={() => handleCheckOut(att.student_id)}
                          >
                            Check Out
                          </button>
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
                          In {formatTime(att.check_in)}
                          <button
                            className={styles.editBtnInline}
                            onClick={() => setEditAttendance({ attendance: att, studentName: `${s.first_name} ${s.last_name}` })}
                          >
                            <Pencil size={10} />
                          </button>
                        </p>
                        <p className={styles.cardTime}>
                          Out {formatTime(att.check_out!)}
                          <button
                            className={styles.editBtnInline}
                            onClick={() => setEditAttendance({ attendance: att, studentName: `${s.first_name} ${s.last_name}` })}
                          >
                            <Pencil size={10} />
                          </button>
                        </p>
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

                  return (
                    <div key={s.id} className={styles.attendanceCard}>
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>{s.first_name} {s.last_name}</h4>
                        <span className={styles.lateBadge}>{late}min late</span>
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

      {/* ── Undo Toast ── */}
      <UndoToast item={undoToast} onDismiss={() => setUndoToast(null)} />

      {/* Close walk-in dropdown on outside click */}
      {showWalkIn && (
        <div className={styles.walkInBackdrop} onClick={() => { setShowWalkIn(false); setWalkInSearch(''); }} />
      )}
    </div>
  );
}
