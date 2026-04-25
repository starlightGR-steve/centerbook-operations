'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import { AlertCircle } from 'lucide-react';
import { useSessionAdjust } from '@/context/SessionAdjustContext';
import ClassroomOverview from './ClassroomOverview';
import StudentDetailPanel from './StudentDetailPanel';
import { useStudents } from '@/hooks/useStudents';
import { useActiveAttendance, updateAttendance } from '@/hooks/useAttendance';
import { useClassroomAssignmentsActive, useClassroomTeachers, buildOverridesMap, buildFlagsMap, assignStudentToRow, assignTeacherToRow, removeStudentFromRow, updateStudentFlags, getAttendanceIdForStudent } from '@/hooks/useRows';
import { readPendingClassPrep, clearPendingClassPrep } from '@/lib/pendingClassPrep';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { useClassroomConfig } from '@/hooks/useClassroomConfig';
import { CLASSROOM_CONFIG } from '@/lib/classroom-config';
import { getCenterToday } from '@/lib/dates';
import { api } from '@/lib/api';
import type { Student, Attendance, ClassroomSection, ClassroomRow, RowAssignmentFlags } from '@/lib/types';
import { getTimeRemaining, getSessionDuration, getTeacherNotes } from '@/lib/types';
import RowsSkeleton from './RowsSkeleton';
import ClassroomSetup from './ClassroomSetup';
import AddStudentPicker from './AddStudentPicker';
import RowViewCard, { type TeacherNoteSummary } from '@/components/classroom/RowViewCard';
import TimePopover from '@/components/classroom/TimePopover';
import SwipeShell, { type RowSummary } from '@/components/classroom/SwipeShell';
import RowMetaBar from '@/components/classroom/RowMetaBar';
import AssignStudentPicker from '@/components/classroom/AssignStudentPicker';
import PositionedPortal from '@/components/classroom/PositionedPortal';
import styles from './RowsPage.module.css';

interface FlatRow extends ClassroomRow {
  section: string;
  seats: number;
  testingSeats: number;
}

function buildRows(sections: ClassroomSection[]): FlatRow[] {
  return sections.flatMap((sec) =>
    sec.rows.map((r) => ({
      ...r,
      section: sec.name,
      seats: r.tables * r.seatsPerTable,
      testingSeats: r.testing_seats ?? 0,
    }))
  );
}

function buildAssignments(
  checkedIn: Student[],
  rows: FlatRow[],
  rowOverrides: Record<string, string>
): Record<string, Student[]> {
  const assignments: Record<string, Student[]> = {};
  rows.forEach((r) => (assignments[r.id] = []));
  // Only place students with explicit row assignments — NEVER auto-distribute
  checkedIn.forEach((s) => {
    const rowId = rowOverrides[String(s.id)];
    if (rowId && assignments[rowId] !== undefined) {
      assignments[rowId].push(s);
    }
  });
  return assignments;
}

export default function RowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL is the source of truth for which row is open in Row View. Missing param
  // means we render the Whole Class Overview; an unknown param falls back to row 0
  // and the URL gets rewritten in an effect below.
  const rowParam = searchParams.get('row');
  const selectedRowId = rowParam;
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [dragStudent, setDragStudent] = useState<Student | null>(null);
  const [overviewStudent, setOverviewStudent] = useState<Student | null>(null);
  const [addToRowLabel, setAddToRowLabel] = useState<string | null>(null);
  const [addToTestingRowLabel, setAddToTestingRowLabel] = useState<string | null>(null);
  const [movingStudent, setMovingStudent] = useState<number | null>(null);
  const [pickerRowLabel, setPickerRowLabel] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Live Class feature state
  // Local optimistic flag overrides (cleared on SWR revalidation)
  const [optimisticFlags, setOptimisticFlags] = useState<Record<number, RowAssignmentFlags>>({});
  const [flagSaveError, setFlagSaveError] = useState<string | null>(null);
  const { optimistic: sessionOptimistic } = useSessionAdjust();
  const [sessionPopoverStudent, setSessionPopoverStudent] = useState<number | null>(null);
  // expandedNoteStudent removed in Step 1: pertinent_note now surfaces via Detail Panel (wired in Step 6).

  // Per-card refs for portal anchor lookup. Map<studentId, cardSlot DOM node>.
  // Populated via callback ref inside renderSlide; cleaned up when a card unmounts.
  const cardSlotRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const { data: allStudents } = useStudents();
  // 86ah0ex1k: session-scoped check-in feed. Live Class follows the active
  // attendance set (any student currently checked in, regardless of date) so
  // mid-session midnight rollovers don't drop students from the row view.
  const { data: activeAttendance } = useActiveAttendance(10000);
  const checkedIn = activeAttendance;

  const today = getCenterToday();
  // 86ah0ex1k: session-scoped row assignments (v2.51.0+). Returns assignments
  // bound to active check-ins regardless of session_date.
  const { data: persistedAssignments } = useClassroomAssignmentsActive();
  // Teacher assignments stay date-scoped per backend scope decision.
  const { data: teacherAssignments } = useClassroomTeachers(today);
  const { data: allStaff } = useActiveStaff();
  const { data: timeclockEntries } = useTimeclock(today);
  const { data: apiSections } = useClassroomConfig();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Use API classroom config when available, fall back to static defaults
  const sections = apiSections || CLASSROOM_CONFIG;
  const rows = useMemo(() => buildRows(sections), [sections]);

  const rowIdToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.id] = r.label; });
    return map;
  }, [rows]);

  const rowLabelToId = useMemo(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.label] = r.id; });
    return map;
  }, [rows]);

  const rowOverrides = useMemo(
    () => buildOverridesMap(persistedAssignments, rowLabelToId),
    [persistedAssignments, rowLabelToId]
  );

  // Flags from persisted assignments
  const flagsMap = useMemo(
    () => buildFlagsMap(persistedAssignments),
    [persistedAssignments]
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    checkedIn?.forEach((a) => map.set(a.student_id, a));
    return map;
  }, [checkedIn]);

  // Live Class only renders students whose attendance status is 'checked-in'.
  // Once a teacher taps Done (handleRowCheckout below), the PATCH writes
  // status='row-complete' and the next SWR repoll drops the student from this
  // list and surfaces them on the kiosk Attendance board's Awaiting Pickup
  // column. Treats absent status as 'checked-in' for backward compat with
  // legacy rows.
  const checkedInStudents = useMemo(() => {
    if (!allStudents || !checkedIn) return [];
    const activeIds = new Set(
      checkedIn
        .filter((a) => (a.status ?? 'checked-in') === 'checked-in')
        .map((a) => a.student_id),
    );
    return allStudents.filter((s) => activeIds.has(s.id));
  }, [allStudents, checkedIn]);

  // Done in Live Class → PATCH status='row-complete' on the active attendance
  // row + DELETE the classroom assignment (existing behavior). Optimistic
  // SWR update on `attendance-active` so the card disappears from this row
  // without waiting for the network round-trip.
  const handleRowCheckout = useCallback(async (studentId: number) => {
    const att = checkedIn?.find((a) => a.student_id === studentId);
    if (!att) return;
    await globalMutate(
      'attendance-active',
      (prev: Attendance[] | undefined) =>
        prev?.map((a) => (a.id === att.id ? { ...a, status: 'row-complete' as const } : a)),
      false,
    );
    try {
      await Promise.all([
        updateAttendance(att.id, { status: 'row-complete' }),
        removeStudentFromRow(studentId, today),
      ]);
    } catch (err) {
      // Revalidate to reconcile if either the PATCH or DELETE failed.
      await globalMutate('attendance-active');
      console.error('handleRowCheckout failed', err);
    }
  }, [checkedIn, today]);

  const handleDragEnd = useCallback(() => setDragStudent(null), []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedStudentId(null);
    router.replace(`/rows?row=${encodeURIComponent(rowId)}`, { scroll: false });
  }, [router]);

  const handleRowChange = useCallback((newIndex: number) => {
    const target = rows[newIndex];
    if (!target) return;
    setSelectedStudentId(null);
    router.replace(`/rows?row=${encodeURIComponent(target.id)}`, { scroll: false });
  }, [router, rows]);

  const handleSetup = useCallback(() => setShowSetup(true), []);

  const assignments = useMemo(
    () => buildAssignments(checkedInStudents, rows, rowOverrides),
    [checkedInStudents, rows, rowOverrides]
  );

  const mergedFlagsMap = useMemo(
    () => ({ ...flagsMap, ...optimisticFlags }),
    [flagsMap, optimisticFlags]
  );

  // Helper: get effective flags for a student from persisted + optimistic
  const getStudentFlags = useCallback((studentId: number): RowAssignmentFlags => {
    return optimisticFlags[studentId] || flagsMap[studentId] || {};
  }, [optimisticFlags, flagsMap]);

  // 86ah0ex1k: bind classroom writes to the active attendance row when known.
  // Falls back to undefined if the student isn't currently checked in, in which
  // case the backend infers from student_id (date-scoped legacy path).
  const getAttId = useCallback(
    (studentId: number) => getAttendanceIdForStudent(activeAttendance, studentId),
    [activeAttendance]
  );

  const moveStudentToRow = useCallback(async (studentId: number, rowId: string, isTesting?: boolean) => {
    const label = rowIdToLabel[rowId];
    if (!label) return;
    const attId = getAttId(studentId);
    await assignStudentToRow({
      student_id: studentId,
      row_label: label,
      session_date: today,
      assigned_by: 'Staff',
      attendance_id: attId,
    });
    // 86ah3f3xp Finding 2A: drain any class-prep that was captured at check-in
    // before this student had a row assignment. Apply on top of the live flags
    // (testing toggle below) so the check-in payload survives the assignment.
    const pending = readPendingClassPrep(studentId);
    const pendingApplies = !!pending && (!pending.attendanceId || pending.attendanceId === attId);
    let currentFlags = getStudentFlags(studentId);
    if (pending && pendingApplies) {
      const merged: RowAssignmentFlags = { ...currentFlags };
      pending.flags.forEach((k) => { (merged as Record<string, unknown>)[k] = true; });
      const tasks: Record<string, boolean | string | null | undefined> = { ...(currentFlags.tasks ?? {}) };
      pending.checklist.forEach((k) => {
        if (k.startsWith('__custom__:')) tasks.custom = k.slice(11);
        else tasks[k] = false;
      });
      if (Object.keys(tasks).length > 0) merged.tasks = tasks;
      if (pending.teacherNotes && pending.teacherNotes.length > 0) {
        merged.teacher_notes = pending.teacherNotes;
      } else if (pending.noteForTeacher) {
        merged.teacher_note = pending.noteForTeacher;
      }
      try {
        await updateStudentFlags(studentId, merged, today, attId);
        currentFlags = merged;
        clearPendingClassPrep(studentId);
      } catch (err) {
        console.error('moveStudentToRow: failed to apply pending class prep', err);
        // Leave the stash in place so a retry assignment can still apply it.
      }
    } else if (pending && !pendingApplies) {
      // Stash was for a different attendance row (student checked out + back in
      // before assignment). Drop it.
      clearPendingClassPrep(studentId);
    }
    // Auto-flag: set taking_test when moved to testing seat, clear when moved to regular
    if (isTesting && !currentFlags.taking_test) {
      await updateStudentFlags(studentId, { ...currentFlags, taking_test: true }, today, attId);
    } else if (!isTesting && currentFlags.taking_test) {
      const updated = { ...currentFlags };
      delete updated.taking_test;
      await updateStudentFlags(studentId, updated, today, attId);
    }
  }, [rowIdToLabel, today, getStudentFlags, getAttId]);

  // Revert an optimistic flag update and surface an error toast
  const handleFlagError = useCallback((studentId: number, err: unknown) => {
    console.error('Flag update failed:', err);
    setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    globalMutate(`classroom-assignments-${today}`);
    setFlagSaveError('Failed to save — please try again.');
    setTimeout(() => setFlagSaveError(null), 4000);
  }, [today]);

  const toggleFlag = useCallback((studentId: number, flag: string) => {
    const current = getStudentFlags(studentId);
    const key = flag as keyof RowAssignmentFlags;
    const wasOn = !!current[key];
    const updated: RowAssignmentFlags = { ...current, [key]: !current[key] };
    // Optimistic update
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    // Persist
    updateStudentFlags(studentId, updated, today, getAttId(studentId)).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
      // Flag toggled OFF → mark matching visit plan item done (fire-and-forget)
      if (wasOn) {
        api.visitPlan.list(studentId, 'active').then((items) => {
          const match = items.find((i) => i.item_key === flag && !i.completed_at);
          if (match) api.visitPlan.update(studentId, match.id, { completed: true }).catch(console.error);
        }).catch(console.error);
      }
    }).catch((err) => handleFlagError(studentId, err));
  }, [getStudentFlags, today, handleFlagError, getAttId]);

  // Helper: toggle task — 3-state: missing → assigned(false) → done(true) → missing
  const toggleTask = useCallback((studentId: number, taskKey: string) => {
    const current = getStudentFlags(studentId);
    const tasks = { ...(current.tasks || {}) } as Record<string, boolean | string | null | undefined>;
    const val = tasks[taskKey];
    let markedDone = false;
    if (val === undefined || val === null) {
      tasks[taskKey] = false; // first click: assign (not yet done)
    } else if (val === false) {
      tasks[taskKey] = true; // second click: mark done
      markedDone = true;
    } else {
      delete tasks[taskKey]; // third click: remove
    }
    const updated: RowAssignmentFlags = { ...current, tasks };
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today, getAttId(studentId)).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
      // Task checked off → mark matching visit plan item done (fire-and-forget)
      if (markedDone) {
        api.visitPlan.list(studentId, 'active').then((items) => {
          const match = items.find((i) => i.item_key === taskKey && !i.completed_at);
          if (match) api.visitPlan.update(studentId, match.id, { completed: true }).catch(console.error);
        }).catch(console.error);
      }
    }).catch((err) => handleFlagError(studentId, err));
  }, [getStudentFlags, today, handleFlagError, getAttId]);

  const setTeacherNote = useCallback((studentId: number, note: string | null) => {
    const current = getStudentFlags(studentId);
    const updated: RowAssignmentFlags = { ...current, teacher_note: note };
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today, getAttId(studentId)).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    }).catch((err) => handleFlagError(studentId, err));
  }, [getStudentFlags, today, handleFlagError, getAttId]);

  const bulkUpdateFlags = useCallback((studentId: number, updated: RowAssignmentFlags) => {
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today, getAttId(studentId)).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    }).catch((err) => handleFlagError(studentId, err));
  }, [today, handleFlagError, getAttId]);

  // Helper: get adjusted time remaining (uses optimistic duration if pending, otherwise DB value)
  const getAdjustedTimeRemaining = useCallback((s: Student, att: Attendance | undefined): number => {
    const optimisticDuration = sessionOptimistic[s.id];
    const opts = {
      scheduleDetail: s.schedule_detail,
      sessionDurationMinutes: optimisticDuration ?? att?.session_duration_minutes,
    };
    if (!att) return getSessionDuration(s.subjects, opts);
    return getTimeRemaining(s.subjects, att.check_in, opts);
  }, [sessionOptimistic]);

  // Students checked in but not assigned to any row
  const unassignedStudents = useMemo(() => {
    if (!checkedInStudents || !persistedAssignments) return [];
    const assignedIds = new Set(persistedAssignments.map((a) => a.student_id));
    return checkedInStudents
      .filter((s) => !assignedIds.has(s.id))
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [checkedInStudents, persistedAssignments]);

  // Teacher assignment helpers
  const clockedInIds = useMemo(() => {
    if (!timeclockEntries) return new Set<number>();
    return new Set(timeclockEntries.filter((e) => !e.clock_out).map((e) => e.staff_id));
  }, [timeclockEntries]);

  const staffOptions = useMemo(() => {
    if (!allStaff) return [];
    return [...allStaff].sort((a, b) => {
      const aIn = clockedInIds.has(a.id) ? 0 : 1;
      const bIn = clockedInIds.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
    });
  }, [allStaff, clockedInIds]);

  // Swipe traversal — preserves classroom-config declaration order (EL → Main → Upper).
  const swipeRows: RowSummary[] = useMemo(
    () => rows.map((r) => ({
      id: r.id,
      label: r.label,
      section: r.section,
      seats: r.seats + r.testingSeats,
    })),
    [rows]
  );

  const currentRowIndex = selectedRowId
    ? swipeRows.findIndex((r) => r.id === selectedRowId)
    : -1;
  const safeRowIndex = currentRowIndex === -1 ? 0 : currentRowIndex;
  const currentRow = rows.find((r) => r.id === selectedRowId);
  const currentSwipeRow = swipeRows[safeRowIndex];

  // If URL holds an unknown row id, rewrite to the first valid row so the swipe shell
  // doesn't render with a -1 index. Skipped while the rows list is empty (initial load).
  useEffect(() => {
    if (selectedRowId && currentRowIndex === -1 && swipeRows.length > 0) {
      router.replace(`/rows?row=${encodeURIComponent(swipeRows[0].id)}`, { scroll: false });
    }
  }, [selectedRowId, currentRowIndex, swipeRows, router]);

  const teacherForRow = useMemo(() => {
    if (!teacherAssignments || !currentSwipeRow) return 0;
    return teacherAssignments.find((t) => t.row_label === currentSwipeRow.label)?.staff_id ?? 0;
  }, [teacherAssignments, currentSwipeRow]);

  const handleTeacherChange = useCallback(async (staffId: number | null) => {
    if (!staffId || !currentSwipeRow) return;
    await assignTeacherToRow({
      staff_id: staffId,
      row_label: currentSwipeRow.label,
      session_date: today,
    });
  }, [currentSwipeRow, today]);

  if (!allStudents || !checkedIn) {
    return <RowsSkeleton />;
  }

  // CLASSROOM SETUP
  if (showSetup) {
    return <ClassroomSetup onBack={() => setShowSetup(false)} />;
  }

  // CLASSROOM OVERVIEW (default)
  if (!selectedRowId) {
    return (
      <>
        <ClassroomOverview
          sections={sections}
          students={allStudents}
          attendanceMap={attendanceMap}
          checkedInStudents={checkedInStudents}
          flagsMap={mergedFlagsMap}
          onSelectRow={handleSelectRow}
          onSelectStudent={(student) => {
            const rowId = rowOverrides[String(student.id)];
            if (rowId) {
              handleSelectRow(rowId);
              setSelectedStudentId(student.id);
            } else {
              setOverviewStudent(student);
            }
          }}
          onAddToRow={setAddToRowLabel}
          onAddToTestingRow={setAddToTestingRowLabel}
          onSetup={handleSetup}
          onMoveStudent={moveStudentToRow}
          rowOverrides={rowOverrides}
          dragStudent={dragStudent}
          onDragStart={setDragStudent}
          onDragEnd={handleDragEnd}
        />

        {overviewStudent && (
          <StudentDetailPanel
            student={overviewStudent}
            attendance={attendanceMap.get(overviewStudent.id)}
            flags={mergedFlagsMap[overviewStudent.id]}
            onToggleFlag={(k) => toggleFlag(overviewStudent.id, k)}
            onToggleTask={(k) => toggleTask(overviewStudent.id, k)}
            onBulkUpdate={(updated) => bulkUpdateFlags(overviewStudent.id, updated)}
            onSetTeacherNote={(n) => setTeacherNote(overviewStudent.id, n)}
            onClose={() => setOverviewStudent(null)}
          />
        )}

        {addToRowLabel && (
          <AddStudentPicker
            rowLabel={addToRowLabel}
            unassignedStudents={unassignedStudents}
            onAssign={async (studentId) => {
              await assignStudentToRow({
                student_id: studentId,
                row_label: addToRowLabel,
                session_date: today,
                attendance_id: getAttId(studentId),
              });
              setAddToRowLabel(null);
            }}
            onClose={() => setAddToRowLabel(null)}
          />
        )}

        {addToTestingRowLabel && (
          <AddStudentPicker
            rowLabel={`${addToTestingRowLabel} — Testing Table`}
            unassignedStudents={unassignedStudents}
            onAssign={async (studentId) => {
              const attId = getAttId(studentId);
              await assignStudentToRow({
                student_id: studentId,
                row_label: addToTestingRowLabel,
                session_date: today,
                attendance_id: attId,
              });
              // Auto-flag as taking_test
              const currentFlags = getStudentFlags(studentId);
              if (!currentFlags.taking_test) {
                await updateStudentFlags(studentId, { ...currentFlags, taking_test: true }, today, attId);
              }
              setAddToTestingRowLabel(null);
            }}
            onClose={() => setAddToTestingRowLabel(null)}
          />
        )}
      </>
    );
  }

  // ROW DETAIL (drill-down) — wrapped in SwipeShell. The render prop runs once per
  // row in the swipe track so all slides exist in the DOM for native scroll-snap.
  const selectedStudent = selectedStudentId
    ? allStudents.find((s) => s.id === selectedStudentId) ?? null
    : null;

  const renderSlide = (row: RowSummary) => {
    const flatRow = rows.find((r) => r.id === row.id);
    if (!flatRow) return null;
    const totalCapacity = flatRow.seats + flatRow.testingSeats;
    const slideStudents = (assignments[row.id] || []).slice().sort((a, b) => {
      const aAtt = attendanceMap.get(a.id);
      const bAtt = attendanceMap.get(b.id);
      const aRem = aAtt
        ? getTimeRemaining(a.subjects, aAtt.check_in, { scheduleDetail: a.schedule_detail, sessionDurationMinutes: aAtt.session_duration_minutes })
        : 999;
      const bRem = bAtt
        ? getTimeRemaining(b.subjects, bAtt.check_in, { scheduleDetail: b.schedule_detail, sessionDurationMinutes: bAtt.session_duration_minutes })
        : 999;
      return aRem - bRem;
    });

    // 86ah3f3xp Finding 2B: Row view renders only the students assigned to
    // this row. Empty seats are no longer surfaced as per-seat "Assign Student"
    // placeholder cards — that affordance moved to the swipe bar (single
    // Assign Student button on RowIndicatorBar). totalCapacity stays referenced
    // upstream where the swipe bar derives its disabled state.
    void totalCapacity;

    return (
      <div className={styles.cardGrid} data-compact={selectedStudent ? '' : undefined}>
        {slideStudents.map((s) => {
          const att = attendanceMap.get(s.id);
          const remaining = getAdjustedTimeRemaining(s, att);
          const studentFlagsObj = getStudentFlags(s.id);
          const isMoveOpen = movingStudent === s.id;
          const isSessionOpen = sessionPopoverStudent === s.id;
          const teacherNotes: TeacherNoteSummary[] = getTeacherNotes(studentFlagsObj).map((n, idx) => ({
            id: `${s.id}-${idx}`,
            text: n.text,
            done: n.done,
          }));

          return (
            <div
              key={s.id}
              ref={(el) => {
                if (el) cardSlotRefs.current.set(s.id, el);
                else cardSlotRefs.current.delete(s.id);
              }}
              className={styles.cardSlot}
            >
              <RowViewCard
                student={s}
                attendance={att}
                flags={studentFlagsObj}
                timeRemainingMinutes={remaining}
                teacherNotes={teacherNotes}
                onCardTap={() => {
                  setSelectedStudentId(selectedStudentId === s.id ? null : s.id);
                }}
                onDone={() => handleRowCheckout(s.id)}
                onMove={() => setMovingStudent(isMoveOpen ? null : s.id)}
                onTime={() => setSessionPopoverStudent(isSessionOpen ? null : s.id)}
                onFlagToggle={(k) => toggleFlag(s.id, k)}
                onChecklistToggle={(k) => toggleTask(s.id, k)}
                onMedicalTap={() => {
                  setSelectedStudentId(s.id);
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // 86ah3f3xp Finding 2B: derive Assign Student state for the current row
  // (label + capacity vs occupancy). Empty rows are assignable; full rows
  // surface "All seats full" on the swipe bar.
  const currentRowFlat = rows.find((r) => r.id === currentSwipeRow?.id) ?? null;
  const currentRowOccupancy = currentRowFlat
    ? (assignments[currentRowFlat.id] ?? []).length
    : 0;
  const currentRowCapacity = currentRowFlat
    ? currentRowFlat.seats + currentRowFlat.testingSeats
    : 0;
  const currentRowAllSeatsFull = currentRowFlat
    ? currentRowOccupancy >= currentRowCapacity
    : true;

  return (
    <div className={styles.page}>
      <SwipeShell
        rows={swipeRows}
        currentRowIndex={safeRowIndex}
        onRowChange={handleRowChange}
        onAssign={currentRowFlat ? () => setPickerRowLabel(currentRowFlat.label) : undefined}
        allSeatsFull={currentRowAllSeatsFull}
        topBar={
          currentSwipeRow ? (
            <RowMetaBar
              currentRow={currentSwipeRow}
              backHref="/rows"
              staff={staffOptions}
              currentTeacherId={teacherForRow}
              clockedInIds={clockedInIds}
              onTeacherChange={handleTeacherChange}
            />
          ) : null
        }
      >
        {(row) => renderSlide(row)}
      </SwipeShell>

      {/* 86ah1fzxr P0-2: Detail Panel portaled to document.body and positioned
          as a fixed 24rem right-side drawer (see StudentDetailPanel.module.css
          .panel block). Escaping the .page flex column prevents the panel from
          stacking below the grid. */}
      {selectedStudent && createPortal(
        <StudentDetailPanel
          student={selectedStudent}
          attendance={attendanceMap.get(selectedStudent.id)}
          rowLabel={currentRow?.label}
          flags={mergedFlagsMap[selectedStudent.id]}
          onToggleFlag={(k) => toggleFlag(selectedStudent.id, k)}
          onToggleTask={(k) => toggleTask(selectedStudent.id, k)}
          onBulkUpdate={(updated) => bulkUpdateFlags(selectedStudent.id, updated)}
          onSetTeacherNote={(n) => setTeacherNote(selectedStudent.id, n)}
          onClose={() => setSelectedStudentId(null)}
        />,
        document.body
      )}

      {flagSaveError && (
        <div className={styles.flagErrorToast} role="alert">
          <AlertCircle size={14} />
          {flagSaveError}
        </div>
      )}

      <AssignStudentPicker
        isOpen={pickerRowLabel !== null}
        rowLabel={pickerRowLabel ?? ''}
        onSelect={async (student) => {
          if (!pickerRowLabel) return;
          await assignStudentToRow({
            student_id: student.id,
            row_label: pickerRowLabel,
            session_date: today,
            assigned_by: 'Staff',
            attendance_id: getAttId(student.id),
          });
          setPickerRowLabel(null);
        }}
        onClose={() => setPickerRowLabel(null)}
      />

      {/* Move + Time popovers — portaled to document.body to escape SwipeShell
          overflow clipping. Position is computed from the cardSlot anchor's
          bounding rect at render time; outside taps dismiss via the backdrop. */}
      {(movingStudent !== null || sessionPopoverStudent !== null) && createPortal(
        <div
          className={styles.popoverBackdrop}
          onClick={() => {
            setMovingStudent(null);
            setSessionPopoverStudent(null);
          }}
        />,
        document.body
      )}

      {movingStudent !== null && (() => {
        const anchorEl = cardSlotRefs.current.get(movingStudent);
        if (!anchorEl) return null;
        const movingId = movingStudent;
        const currentRowId = rowOverrides[String(movingId)];
        return (
          <PositionedPortal
            anchorEl={anchorEl}
            gap={4} /* matches the original .movePopover margin-bottom */
            className={styles.movePopover}
            onClick={(e) => e.stopPropagation()}
          >
            {rows
              .filter((r) => r.id !== currentRowId)
              .map((r) => {
                const count = (assignments[r.id] || []).length;
                const cap = r.seats + (r.testingSeats ?? 0);
                const isFull = count >= cap;
                return (
                  <button
                    key={r.id}
                    className={`${styles.moveItem} ${isFull ? styles.moveItemFull : ''}`}
                    disabled={isFull}
                    onClick={() => {
                      moveStudentToRow(movingId, r.id);
                      setMovingStudent(null);
                    }}
                  >
                    <span>{r.label}</span>
                    <span className={styles.moveSeatCount}>{count}/{cap}</span>
                  </button>
                );
              })}
          </PositionedPortal>
        );
      })()}

      {sessionPopoverStudent !== null && (() => {
        const studentId = sessionPopoverStudent;
        const anchorEl = cardSlotRefs.current.get(studentId);
        const att = attendanceMap.get(studentId);
        if (!anchorEl || !att) return null;
        const student = allStudents?.find((s) => s.id === studentId);
        const scheduleDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const rawSessionDuration = att.session_duration_minutes != null ? Number(att.session_duration_minutes) : null;
        const currentDuration =
          sessionOptimistic[studentId]
            ?? student?.schedule_detail?.[scheduleDay]?.duration
            ?? rawSessionDuration
            ?? 60;
        return (
          <PositionedPortal
            anchorEl={anchorEl}
            gap={6} /* matches the original .timePopoverAnchor margin-bottom */
            className={styles.timePopoverAnchor}
            onClick={(e) => e.stopPropagation()}
          >
            <TimePopover
              attendanceId={att.id}
              studentId={studentId}
              initialDurationMinutes={currentDuration}
              initialCheckIn={att.check_in}
              isOpen
              onClose={() => setSessionPopoverStudent(null)}
            />
          </PositionedPortal>
        );
      })()}
    </div>
  );
}
