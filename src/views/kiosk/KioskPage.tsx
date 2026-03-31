'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Scan, ArrowRight, Users, UserCheck, Plus, CheckCircle, Search, X, Pencil } from 'lucide-react';
import AttendanceEditModal from '@/components/AttendanceEditModal';
import SubjectBadges from '@/components/SubjectBadges';
import { useStudents } from '@/hooks/useStudents';
import { useCheckedInStudents, checkInStudent, checkOutStudent, deleteAttendance, updateAttendance } from '@/hooks/useAttendance';
import { updateStudentFlags, removeStudentFromRow } from '@/hooks/useRows';
import UndoToast from '@/components/ui/UndoToast';
import type { UndoToastItem } from '@/components/ui/UndoToast';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock, clockInStaff, clockOutStaff } from '@/hooks/useTimeclock';
import { getSessionDuration, formatTimeKey, formatTime } from '@/lib/types';
import type { Student, Staff, TimeEntry } from '@/lib/types';
import KioskSkeleton from './KioskSkeleton';
import CheckInPopup from './CheckInPopup';
import type { CheckInOptions } from './CheckInPopup';
import styles from './KioskPage.module.css';

const ROLE_ORDER: Record<string, number> = {
  'owner': 0,
  'instruction_manager': 1,
  'center_manager': 2,
  'project_manager': 3,
  'admin': 4,
  'teacher': 5,
  'grader': 6,
};

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function staffDisplayName(staff: Staff): string {
  if (staff.first_name || staff.last_name) {
    return `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  }
  return staff.full_name || 'Unknown';
}

export default function KioskPage() {
  const [scan, setScan] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [time, setTime] = useState('');
  const [checkInStudent_popup, setCheckInStudentPopup] = useState<Student | null>(null);
  const [nameSearch, setNameSearch] = useState('');
  const [undoToast, setUndoToast] = useState<UndoToastItem | null>(null);
  const [editAttendance, setEditAttendance] = useState<{ attendance: import('@/lib/types').Attendance; studentName: string } | null>(null);
  const toastIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 5000);
  const { data: activeStaff } = useActiveStaff();
  const { data: timeEntries } = useTimeclock();

  // Live clock
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-focus scanner input (skip if search input is focused)
  useEffect(() => {
    inputRef.current?.focus();
    const refocus = setInterval(() => {
      if (document.activeElement !== inputRef.current && document.activeElement !== searchRef.current) {
        inputRef.current?.focus();
      }
    }, 3000);
    return () => clearInterval(refocus);
  }, []);

  // Get today's day name
  const todayDay = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  // Students scheduled for today who haven't checked in (sorted by last name)
  const awaitingCheckIn = useMemo(() => {
    if (!allStudents || !checkedIn) return [];
    const checkedInIds = new Set(checkedIn.map((a) => a.student_id));
    return allStudents
      .filter((s) => {
        if (!s.class_schedule_days) return false;
        const days = s.class_schedule_days.split(',').map((d) => d.trim());
        return days.includes(todayDay) && !checkedInIds.has(s.id);
      })
      .sort((a, b) =>
        a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
      );
  }, [allStudents, checkedIn, todayDay]);

  // Sorted checked-in students by arrival time
  const sortedCheckedIn = useMemo(() => {
    if (!checkedIn || !allStudents) return [];
    return [...checkedIn].sort((a, b) => {
      return (a.check_in || '').localeCompare(b.check_in || '');
    });
  }, [checkedIn, allStudents]);

  // Name search filter
  const matchesSearch = useCallback((s: Student) => {
    if (!nameSearch.trim()) return true;
    const q = nameSearch.toLowerCase();
    const full = `${s.first_name} ${s.last_name}`.toLowerCase();
    const reversed = `${s.last_name} ${s.first_name}`.toLowerCase();
    return full.includes(q) || reversed.includes(q) || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
  }, [nameSearch]);

  const filteredAwaiting = useMemo(
    () => awaitingCheckIn.filter(matchesSearch),
    [awaitingCheckIn, matchesSearch]
  );

  const filteredCheckedIn = useMemo(
    () => sortedCheckedIn.filter((a) => {
      const s = a.student || allStudents?.find((st) => st.id === a.student_id);
      return s ? matchesSearch(s) : true;
    }),
    [sortedCheckedIn, matchesSearch, allStudents]
  );

  // Full roster search results (all active students)
  const checkedInIds = useMemo(() => new Set(checkedIn?.map((a) => a.student_id) ?? []), [checkedIn]);

  const searchResults = useMemo(() => {
    if (!nameSearch.trim() || !allStudents) return [];
    return allStudents
      .filter(matchesSearch)
      .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
  }, [allStudents, matchesSearch, nameSearch]);

  // Staff sorted by role order
  const sortedStaff = useMemo(() => {
    if (!activeStaff) return [];
    return [...activeStaff]
      .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
  }, [activeStaff]);

  // Map of staff_id -> clocked-in entry
  const clockedInMap = useMemo(() => {
    const map = new Map<number, TimeEntry>();
    if (timeEntries) {
      for (const e of timeEntries) {
        if (e.clock_out === null) map.set(e.staff_id, e);
      }
    }
    return map;
  }, [timeEntries]);

  // Handle barcode scan (Enter key)
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
      const result = await checkInStudent({
        student_id: student.id,
        source: 'barcode',
        session_duration_minutes: getSessionDuration(student.subjects),
      });
      setAnnouncement(`${student.first_name} ${student.last_name} checked in`);
      setUndoToast({
        id: ++toastIdRef.current,
        message: `${student.first_name} ${student.last_name} checked in`,
        onUndo: async () => {
          await deleteAttendance(result.id);
          try { await removeStudentFromRow(student.id); } catch { /* may not have assignment */ }
        },
      });
    }
    setScan('');
  };

  const handleManualCheckIn = (student: Student) => {
    setCheckInStudentPopup(student);
  };

  const handleCheckInConfirm = async (options: CheckInOptions) => {
    const studentName = checkInStudent_popup
      ? `${checkInStudent_popup.first_name} ${checkInStudent_popup.last_name}`
      : 'Student';

    const result = await checkInStudent({
      student_id: options.studentId,
      source: 'kiosk',
      checked_in_by: 'kiosk',
      session_duration_minutes: options.sessionMinutes,
    });

    // Persist flags from check-in prep to row assignment
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
        const today = new Date().toISOString().split('T')[0];
        await updateStudentFlags(options.studentId, flags, today);
      } catch {
        // Non-critical -- flags will be set manually in row view
      }
    }

    setCheckInStudentPopup(null);
    setAnnouncement(`${studentName} checked in`);
    setUndoToast({
      id: ++toastIdRef.current,
      message: `${studentName} checked in`,
      onUndo: async () => {
        await deleteAttendance(result.id);
        try { await removeStudentFromRow(options.studentId); } catch { /* may not have assignment */ }
      },
    });
  };

  const handleCheckOut = async (studentId: number) => {
    const student = getStudent(studentId);
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

  const handleClockIn = async (staffId: number) => {
    await clockInStaff({ staff_id: staffId, source: 'kiosk' });
  };

  const handleClockOut = async (staffId: number) => {
    await clockOutStaff({ staff_id: staffId });
  };

  const getStudent = (id: number) => allStudents?.find((s) => s.id === id);

  if (!allStudents) {
    return <KioskSkeleton />;
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.logoBlock}>
          <img
            src="https://thecenterbookgr.com/wp-content/uploads/2026/01/Kumon-Grand-Rapids-North-Logo_RBG.png"
            alt="The Center Book — Kumon Grand Rapids North"
            className={styles.logoImg}
          />
        </div>

        <form onSubmit={handleScan} className={styles.scannerWrap}>
          <div className={styles.scannerInputWrap}>
            <span className={styles.scannerIcon}><Scan size={18} /></span>
            <input
              ref={inputRef}
              type="text"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan folder barcode..."
              className={styles.scannerInput}
            />
          </div>
        </form>

        <span className={styles.clock}>{time}</span>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* ── Name Search ── */}
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} />
        <input
          ref={searchRef}
          type="text"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          placeholder="Search student name..."
          className={styles.searchInput}
        />
        {nameSearch && (
          <button className={styles.searchClear} onClick={() => setNameSearch('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Search Results (when searching) ── */}
      {nameSearch.trim() ? (
        <div className={styles.searchResultsWrap}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Search size={18} />
              Search Results ({searchResults.length})
            </div>
            <div className={styles.cardBody}>
              {searchResults.length === 0 ? (
                <div className={styles.empty}>No students match &quot;{nameSearch}&quot;</div>
              ) : (
                searchResults.map((s) => {
                  const isIn = checkedInIds.has(s.id);
                  const detail = s.schedule_detail?.[todayDay];
                  return (
                    <button
                      key={s.id}
                      className={styles.expectedRow}
                      onClick={() => !isIn && handleManualCheckIn(s)}
                      disabled={isIn}
                      style={isIn ? { opacity: 0.5, cursor: 'default' } : undefined}
                    >
                      <div className={styles.expectedLeft}>
                        <span className={styles.expectedName}>
                          {s.last_name}, {s.first_name}
                        </span>
                        <div className={styles.expectedBadges}>
                          <SubjectBadges subjects={s.subjects} />
                          {isIn && <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, color: 'var(--green)' }}>Checked in</span>}
                        </div>
                      </div>
                      <div className={styles.expectedRight}>
                        {detail ? (
                          <span className={styles.expectedTime}>{detail.start}</span>
                        ) : (
                          <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 500, color: '#92400e', background: 'rgba(234,179,8,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            Not scheduled
                          </span>
                        )}
                        {!isIn && <span className={styles.expectedPlus}><Plus size={16} /></span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className={styles.columns}>
        {/* Column 1 — Expected Students */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <ArrowRight size={18} />
            Expected Students
          </div>
          <div className={styles.cardBody}>
            {awaitingCheckIn.length === 0 ? (
              <div className={styles.empty}>All students checked in</div>
            ) : (
              awaitingCheckIn.map((s) => (
                <button
                  key={s.id}
                  className={styles.expectedRow}
                  onClick={() => handleManualCheckIn(s)}
                  aria-label={`Check in ${s.last_name}, ${s.first_name}`}
                >
                  <div className={styles.expectedLeft}>
                    <span className={styles.expectedName}>
                      {s.last_name}, {s.first_name}
                    </span>
                    <div className={styles.expectedBadges}>
                      <SubjectBadges subjects={s.subjects} />
                    </div>
                  </div>
                  <div className={styles.expectedRight}>
                    {s.class_time_sort_key && (
                      <span className={styles.expectedTime}>
                        {formatTimeKey(s.class_time_sort_key)}
                      </span>
                    )}
                    <span className={styles.expectedPlus}>
                      <Plus size={18} />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 2 — Here Now */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Users size={18} />
            Here Now
          </div>
          <div className={styles.cardBody}>
            {sortedCheckedIn.length === 0 ? (
              <div className={styles.empty}>No students checked in yet</div>
            ) : (
              sortedCheckedIn.map((a) => {
                const student = a.student || getStudent(a.student_id);
                if (!student) return null;
                return (
                  <div key={a.id} className={styles.hereRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={styles.hereName}>
                        {student.first_name} {student.last_name}
                      </p>
                      <p className={styles.hereArrival}>
                        Arrived {formatTime(a.check_in)}
                      </p>
                    </div>
                    <button
                      className={styles.hereEdit}
                      onClick={() => setEditAttendance({ attendance: a, studentName: `${student.first_name} ${student.last_name}` })}
                      aria-label={`Edit attendance for ${student.first_name} ${student.last_name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={styles.hereCheck}
                      onClick={() => handleCheckOut(a.student_id)}
                      aria-label={`Check out ${student.first_name} ${student.last_name}`}
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3 — Staff Timeclock */}
        <div className={`${styles.card} ${styles.cardDark}`}>
          <div className={`${styles.cardHeader} ${styles.cardHeaderDark}`}>
            <UserCheck size={18} />
            Staff Timeclock
          </div>
          <div className={styles.cardBody}>
            {sortedStaff.length === 0 ? (
              <div className={`${styles.empty} ${styles.emptyDark}`}>No staff loaded</div>
            ) : (
              sortedStaff.map((staff) => {
                const isClockedIn = clockedInMap.has(staff.id);
                return (
                  <div key={staff.id} className={styles.staffRow}>
                    <div className={styles.staffInfo}>
                      <p className={styles.staffName}>
                        {staffDisplayName(staff)}
                      </p>
                      <p className={styles.staffRole}>{formatRole(staff.role)}</p>
                    </div>
                    {isClockedIn ? (
                      <button
                        className={styles.clockOutBtn}
                        onClick={() => handleClockOut(staff.id)}
                      >
                        Clock Out
                      </button>
                    ) : (
                      <button
                        className={styles.clockInBtn}
                        onClick={() => handleClockIn(staff.id)}
                      >
                        Clock In
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {checkInStudent_popup && (
        <CheckInPopup
          student={checkInStudent_popup}
          onClose={() => setCheckInStudentPopup(null)}
          onConfirm={handleCheckInConfirm}
        />
      )}

      {editAttendance && (
        <AttendanceEditModal
          attendance={editAttendance.attendance}
          studentName={editAttendance.studentName}
          onClose={() => setEditAttendance(null)}
        />
      )}

      <UndoToast item={undoToast} onDismiss={() => setUndoToast(null)} />
    </div>
  );
}
