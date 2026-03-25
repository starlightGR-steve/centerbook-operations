'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronRight, Users, Heart, RefreshCw, AlertCircle, Plus, LogOut, Flag, Sparkles, HelpCircle, UserCheck, BookOpen, Square, CheckSquare, Circle, CheckCircle2, Clock, Lightbulb, CircleHelp, Star, Zap, ClipboardList } from 'lucide-react';
import { useSessionAdjust } from '@/context/SessionAdjustContext';
import ClockDisplay from '@/components/ClockDisplay';
import PosBadge from '@/components/PosBadge';
import VisibilityLabel from '@/components/VisibilityLabel';
import SubjectBadges from '@/components/SubjectBadges';
import NoteCard from '@/components/NoteCard';
import ClassroomOverview from './ClassroomOverview';
import StudentDetailPanel from './StudentDetailPanel';
import { useStudents } from '@/hooks/useStudents';
import { useCheckedInStudents } from '@/hooks/useAttendance';
import { useNotes } from '@/hooks/useNotes';
import { useClassroomAssignments, useClassroomTeachers, buildOverridesMap, buildFlagsMap, assignStudentToRow, assignTeacherToRow, removeStudentFromRow, updateStudentFlags } from '@/hooks/useRows';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { useClassroomConfig } from '@/hooks/useClassroomConfig';
import { CLASSROOM_CONFIG } from '@/lib/classroom-config';
import { FLAG_CONFIG, CHECKLIST_CONFIG } from '@/lib/flags';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import type { Student, Attendance, ClassroomSection, ClassroomRow, RowAssignmentFlags } from '@/lib/types';
import { getTimeRemaining, getSessionDuration, parseSubjects } from '@/lib/types';
import RowsSkeleton from './RowsSkeleton';
import ClassroomSetup from './ClassroomSetup';
import AddStudentPicker from './AddStudentPicker';
import styles from './RowsPage.module.css';

/** Render a flag icon from config string */
function FlagPillIcon({ icon }: { icon: string | undefined }) {
  if (!icon) return <Flag size={10} />;
  if (icon.startsWith('text:')) {
    return <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{icon.slice(5)}</span>;
  }
  const p = { size: 10 };
  switch (icon) {
    case 'Lightbulb': return <Lightbulb {...p} />;
    case 'CircleHelp': return <CircleHelp {...p} />;
    case 'BookOpen': return <BookOpen {...p} />;
    case 'Star': return <Star {...p} />;
    case 'AlertCircle': return <AlertCircle {...p} />;
    case 'Zap': return <Zap {...p} />;
    case 'Flag': return <Flag {...p} />;
    case 'Heart': return <Heart {...p} />;
    case 'UserCheck': return <UserCheck {...p} />;
    case 'Sparkles': return <Sparkles {...p} />;
    case 'ClipboardList': return <ClipboardList {...p} />;
    default: return <Flag {...p} />;
  }
}

interface FlatRow extends ClassroomRow {
  section: string;
  seats: number;
}

function buildRows(sections: ClassroomSection[]): FlatRow[] {
  return sections.flatMap((sec) =>
    sec.rows.map((r) => ({
      ...r,
      section: sec.name,
      seats: r.tables * r.seatsPerTable,
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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('rows_selectedRowId') || null;
    }
    return null;
  });
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [dragStudent, setDragStudent] = useState<Student | null>(null);
  const [overviewStudent, setOverviewStudent] = useState<Student | null>(null);
  const [addToRowLabel, setAddToRowLabel] = useState<string | null>(null);
  const [rowCompleteIds, setRowCompleteIds] = useState<Set<number>>(new Set());
  const [assigningToRow, setAssigningToRow] = useState(false);
  const [movingStudent, setMovingStudent] = useState<number | null>(null);
  const [, setTick] = useState(0);

  // Live Class feature state
  const [taskNoteInput, setTaskNoteInput] = useState<string | null>(null); // task id being noted
  const [taskNoteText, setTaskNoteText] = useState('');
  // Local optimistic flag overrides (cleared on SWR revalidation)
  const [optimisticFlags, setOptimisticFlags] = useState<Record<number, RowAssignmentFlags>>({});
  const { optimistic: sessionOptimistic, persistAdjustment } = useSessionAdjust();
  const [sessionPopoverStudent, setSessionPopoverStudent] = useState<number | null>(null);
  const [expandedNoteStudent, setExpandedNoteStudent] = useState<number | null>(null);

  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 10000);

  const today = new Date().toISOString().split('T')[0];
  const { data: persistedAssignments } = useClassroomAssignments(today);
  const { data: teacherAssignments } = useClassroomTeachers(today);
  const { data: allStaff } = useActiveStaff();
  const { data: timeclockEntries } = useTimeclock(today);
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();
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

  const checkedInStudents = useMemo(() => {
    if (!allStudents || !checkedIn) return [];
    const ids = new Set(checkedIn.map((a) => a.student_id));
    return allStudents.filter((s) => ids.has(s.id) && !rowCompleteIds.has(s.id));
  }, [allStudents, checkedIn, rowCompleteIds]);

  const moveStudentToRow = useCallback(async (studentId: number, rowId: string) => {
    const label = rowIdToLabel[rowId];
    if (!label) return;
    await assignStudentToRow({
      student_id: studentId,
      row_label: label,
      session_date: today,
      assigned_by: 'Staff',
    });
  }, [rowIdToLabel, today]);

  const handleRowCheckout = useCallback(async (studentId: number) => {
    setRowCompleteIds((prev) => new Set(prev).add(studentId));
    await removeStudentFromRow(studentId, today);
  }, [today]);

  const handleDragEnd = useCallback(() => setDragStudent(null), []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
    setSelectedStudentId(null);
    sessionStorage.setItem('rows_selectedRowId', rowId);
  }, []);

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

  // Helper: get flag keys array for display (active flags only)
  const getFlags = useCallback((s: Student): string[] => {
    const f = getStudentFlags(s.id);
    return flagConfig.map((fc) => fc.key).filter((k) => (f as Record<string, unknown>)[k]);
  }, [getStudentFlags, flagConfig]);

  // Helper: get all flag keys present in the flags object (for Row View — show active + done)
  const getAllFlags = useCallback((s: Student): { key: string; active: boolean }[] => {
    const f = getStudentFlags(s.id);
    return flagConfig
      .filter((fc) => (f as Record<string, unknown>)[fc.key] !== undefined)
      .map((fc) => ({ key: fc.key, active: !!(f as Record<string, unknown>)[fc.key] }));
  }, [getStudentFlags, flagConfig]);

  const toggleFlag = useCallback((studentId: number, flag: string) => {
    const current = getStudentFlags(studentId);
    const key = flag as keyof RowAssignmentFlags;
    const updated: RowAssignmentFlags = { ...current, [key]: !current[key] };
    // Optimistic update
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    // Persist
    updateStudentFlags(studentId, updated, today).then(() => {
      // Clear optimistic on success (SWR will have fresh data)
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    });
  }, [getStudentFlags, today]);

  // Helper: toggle task — 3-state: missing → assigned(false) → done(true) → missing
  const toggleTask = useCallback((studentId: number, taskKey: string) => {
    const current = getStudentFlags(studentId);
    const tasks = { ...(current.tasks || {}) } as Record<string, boolean | string | null | undefined>;
    const val = tasks[taskKey];
    if (val === undefined || val === null) {
      tasks[taskKey] = false; // first click: assign (not yet done)
    } else if (val === false) {
      tasks[taskKey] = true; // second click: mark done
    } else {
      delete tasks[taskKey]; // third click: remove
    }
    const updated: RowAssignmentFlags = { ...current, tasks };
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    });
  }, [getStudentFlags, today]);

  // Helper: set custom task text
  const setCustomTask = useCallback((studentId: number, text: string) => {
    const current = getStudentFlags(studentId);
    const tasks = { ...(current.tasks || {}), custom: text || null };
    const updated: RowAssignmentFlags = { ...current, tasks };
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    });
  }, [getStudentFlags, today]);

  const setTeacherNote = useCallback((studentId: number, note: string | null) => {
    const current = getStudentFlags(studentId);
    const updated: RowAssignmentFlags = { ...current, teacher_note: note };
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    });
  }, [getStudentFlags, today]);

  const bulkUpdateFlags = useCallback((studentId: number, updated: RowAssignmentFlags) => {
    setOptimisticFlags((prev) => ({ ...prev, [studentId]: updated }));
    updateStudentFlags(studentId, updated, today).then(() => {
      setOptimisticFlags((prev) => { const next = { ...prev }; delete next[studentId]; return next; });
    });
  }, [today]);

  const dismissTaskNote = useCallback(() => {
    setTaskNoteInput(null);
    setTaskNoteText('');
  }, []);

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

  // currentRow is needed both for teacher dropdown and for the row detail view
  const currentRow = rows.find((r) => r.id === selectedRowId);

  const teacherForRow = useMemo(() => {
    if (!teacherAssignments || !currentRow) return 0;
    return teacherAssignments.find((t) => t.row_label === currentRow.label)?.staff_id ?? 0;
  }, [teacherAssignments, currentRow]);

  const handleTeacherChange = useCallback(async (staffId: number) => {
    if (!staffId || !currentRow) return;
    await assignTeacherToRow({
      staff_id: staffId,
      row_label: currentRow.label,
      session_date: today,
    });
  }, [currentRow, today]);

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
              });
              setAddToRowLabel(null);
            }}
            onClose={() => setAddToRowLabel(null)}
          />
        )}
      </>
    );
  }

  // ROW DETAIL (drill-down)
  const rowStudents = (assignments[selectedRowId] || []).sort((a, b) => {
    const aAtt = attendanceMap.get(a.id);
    const bAtt = attendanceMap.get(b.id);
    const aRem = aAtt ? getTimeRemaining(a.subjects, aAtt.check_in, { scheduleDetail: a.schedule_detail, sessionDurationMinutes: aAtt.session_duration_minutes }) : 999;
    const bRem = bAtt ? getTimeRemaining(b.subjects, bAtt.check_in, { scheduleDetail: b.schedule_detail, sessionDurationMinutes: bAtt.session_duration_minutes }) : 999;
    return aRem - bRem;
  });

  const selectedStudent = selectedStudentId
    ? allStudents.find((s) => s.id === selectedStudentId) ?? null
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => {
              setSelectedRowId(null);
              setSelectedStudentId(null);
              sessionStorage.removeItem('rows_selectedRowId');
            }}
          >
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            All Rows
          </button>
          <div className={styles.divider} />
          <Users size={20} color="var(--secondary)" />
          <h3 className={styles.rowTitle}>{currentRow?.label || selectedRowId}</h3>
          {currentRow?.advanced && (
            <span className={styles.advancedBadge}>Advanced</span>
          )}
          {currentRow?.ratio && (
            <span className={styles.ratioBadge}>{currentRow.ratio}</span>
          )}
          {staffOptions.length > 0 && (
            <select
              className={styles.teacherSelect}
              value={teacherForRow}
              onChange={(e) => handleTeacherChange(Number(e.target.value))}
            >
              <option value={0}>Assign teacher...</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name || ''} {s.last_name || ''}{clockedInIds.has(s.id) ? ' ●' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <ClockDisplay size="sm" />
      </header>

      <div className={styles.content}>
        <div className={styles.gridWrap}>
          <div
            className={styles.cardGrid}
            data-compact={selectedStudent ? '' : undefined}
          >
            {/* Assign Student card — hidden at capacity */}
            {currentRow && rowStudents.length < currentRow.seats && (
            <div
              className={styles.assignCard}
              onClick={() => setAssigningToRow(!assigningToRow)}
            >
              <Plus size={24} />
              <span className={styles.assignLabel}>Assign Student</span>
              {assigningToRow && (
                <div
                  className={styles.assignPopover}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const assignedIds = new Set(rowStudents.map((s) => s.id));
                    const available = checkedInStudents.filter(
                      (s) => !assignedIds.has(s.id)
                    );
                    if (available.length === 0) {
                      return (
                        <p className={styles.popoverEmpty}>
                          No available students to add.
                        </p>
                      );
                    }
                    return available.map((s) => (
                      <button
                        key={s.id}
                        className={styles.popoverItem}
                        onClick={() => {
                          moveStudentToRow(s.id, selectedRowId);
                          setAssigningToRow(false);
                        }}
                      >
                        <span className={styles.popoverName}>
                          {s.first_name} {s.last_name}
                        </span>
                        <span className={styles.popoverMeta}>
                          <SubjectBadges subjects={parseSubjects(s.subjects)} />
                          {s.classroom_position && (
                            <PosBadge position={s.classroom_position} />
                          )}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
            )}

            {rowStudents.map((s) => {
              const att = attendanceMap.get(s.id);
              const attendance = att;
              const remaining = getAdjustedTimeRemaining(s, att);
              const isOver = att ? remaining <= 0 : false;
              const isWarn = att ? remaining > 0 && remaining <= 5 : false;
              const isAlert = isOver || isWarn;
              const isSel = selectedStudentId === s.id;
              const subjects = parseSubjects(s.subjects);
              const timeStr =
                !att
                  ? '—'
                  : isOver
                    ? remaining === 0
                      ? '0'
                      : `+${Math.abs(remaining)}`
                    : String(remaining);
              const isMoveOpen = movingStudent === s.id;
              const flags = getFlags(s);
              const studentFlagsObj = getStudentFlags(s.id);
              const hasPertinentNote = !!s.pertinent_note;
              const flagTasks = studentFlagsObj.tasks || {};
              const currentDuration = sessionOptimistic[s.id] ?? att?.session_duration_minutes ?? getSessionDuration(s.subjects, { scheduleDetail: s.schedule_detail });
              const isSessionOpen = sessionPopoverStudent === s.id;
              const isNoteExpanded = expandedNoteStudent === s.id;

              return (
                <div
                  key={s.id}
                  className={`${styles.studentCard} ${
                    isOver ? styles.cardOver : isWarn ? styles.cardWarn : ''
                  } ${isSel ? styles.cardSelected : ''}`}
                  onClick={() =>
                    setSelectedStudentId(isSel ? null : s.id)
                  }
                >
                  {/* 1. Pertinent note alert banner */}
                  {hasPertinentNote && (
                    <div
                      className={styles.pertinentBanner}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNoteStudent(isNoteExpanded ? null : s.id);
                      }}
                    >
                      <Flag size={10} />
                      <span className={styles.pertinentLabel}>Note</span>
                    </div>
                  )}
                  {hasPertinentNote && isNoteExpanded && (
                    <p className={styles.pertinentText}>{s.pertinent_note}</p>
                  )}

                  <div>
                    {/* 2. Name + time remaining */}
                    <div className={styles.cardTop}>
                      <h3
                        className={styles.cardName}
                        style={{
                          color: isOver
                            ? 'var(--red)'
                            : isWarn
                              ? '#92400e'
                              : undefined,
                        }}
                      >
                        {s.first_name} {s.last_name}
                      </h3>
                      <div className={styles.cardTopRight}>
                        {attendance && (
                          <span
                            className={styles.cardTimeInline}
                            style={{ color: isOver ? 'var(--red)' : isWarn ? '#92400e' : 'var(--neutral)' }}
                          >
                            <Clock size={12} />
                            {isOver ? '+' : ''}{Math.abs(remaining ?? 0)}m
                          </span>
                        )}
                        {isAlert && (
                          <AlertCircle
                            size={16}
                            color={isOver ? 'var(--red)' : '#92400e'}
                            className={styles.pulseIcon}
                          />
                        )}
                      </div>
                    </div>

                    {/* 3. Subject+level badges */}
                    <div className={styles.levelBadgeRow}>
                      {subjects.includes('Math') && (
                        <span className={styles.levelBadgeMath}>
                          Math {s.current_level_math || ''}
                        </span>
                      )}
                      {subjects.includes('Reading') && (
                        <span className={styles.levelBadgeReading}>
                          Reading {s.current_level_reading || ''}
                        </span>
                      )}
                      {s.program_type === 'Kumon Connect' && (
                        <span className={styles.kcBadge}>KC</span>
                      )}
                    </div>

                    {/* Medical + position badges */}
                    <div className={styles.cardBadges}>
                      {s.medical_notes && (
                        <span className={styles.medicalBadge}>
                          <Heart size={8} /> Medical
                        </span>
                      )}
                    </div>

                    {/* 4. Assigned flags only — icon-only colored circles */}
                    {getFlags(s).length > 0 && (
                      <div className={styles.flagRow} onClick={(e) => e.stopPropagation()}>
                        {getFlags(s).map((key) => {
                          const fc = flagConfig.find((f) => f.key === key);
                          if (!fc) return null;
                          return (
                            <button
                              key={key}
                              className={styles.flagCircleBtn}
                              style={{ background: fc.color }}
                              onClick={() => toggleFlag(s.id, key)}
                              title={fc.label}
                            >
                              <FlagPillIcon icon={fc.icon} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 5. Assigned checklist items only */}
                    {(() => {
                      const assignedTasks = checklistConfig.filter(
                        (ci) => (flagTasks as Record<string, unknown>)[ci.key] !== undefined &&
                                (flagTasks as Record<string, unknown>)[ci.key] !== null
                      );
                      if (assignedTasks.length === 0 && !flagTasks.custom) return null;
                      return (
                        <div className={styles.taskList} onClick={(e) => e.stopPropagation()}>
                          {assignedTasks.map((ci) => {
                            const isDone = (flagTasks as Record<string, unknown>)[ci.key] === true;
                            return (
                              <button
                                key={ci.key}
                                className={`${styles.taskChip} ${isDone ? styles.taskDone : styles.taskAssigned}`}
                                onClick={() => toggleTask(s.id, ci.key)}
                              >
                                {isDone ? <CheckSquare size={10} color="#16a34a" /> : <Square size={10} />}
                                <span>{ci.label}</span>
                              </button>
                            );
                          })}
                          {flagTasks.custom && (
                            <button key="custom" className={styles.taskChip} onClick={(e) => e.stopPropagation()}>
                              <Square size={10} />
                              <span>{flagTasks.custom}</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 6. Time info + session adjust */}
                  <div className={styles.cardBottom}>
                    <div>
                      <p
                        className={styles.timeValue}
                        style={{
                          color: isOver
                            ? 'var(--red)'
                            : isWarn
                              ? '#92400e'
                              : undefined,
                        }}
                      >
                        {timeStr}
                        <span className={styles.timeUnit}>m</span>
                      </p>
                      <p
                        className={styles.timeLabel}
                        style={{
                          color: isOver ? 'var(--red)' : undefined,
                        }}
                      >
                        {isOver ? 'over time' : 'remaining'}
                      </p>
                    </div>
                    <div className={styles.sessionAdjustWrap} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.sessionAdjustBtn}
                        onClick={() => setSessionPopoverStudent(isSessionOpen ? null : s.id)}
                        aria-label="Adjust session time"
                      >
                        <Clock size={14} />
                      </button>
                      {isSessionOpen && (
                        <div className={styles.sessionPopover}>
                          <p className={styles.sessionPopoverTitle}>Session Time</p>
                          <div className={styles.sessionBtnRow}>
                            <button
                              className={styles.sessionDelta}
                              onClick={() => att && persistAdjustment(att.id, s.id, Math.max(15, currentDuration - 15))}
                              disabled={!att}
                            >
                              -15
                            </button>
                            <span className={styles.sessionCurrent}>
                              {currentDuration}m
                            </span>
                            <button
                              className={styles.sessionDelta}
                              onClick={() => att && persistAdjustment(att.id, s.id, currentDuration + 15)}
                              disabled={!att}
                            >
                              +15
                            </button>
                          </div>
                          <div className={styles.sessionPresets}>
                            {[30, 45, 60, 75, 90].map((d) => (
                              <button
                                key={d}
                                className={styles.sessionPreset}
                                onClick={() => att && persistAdjustment(att.id, s.id, d)}
                                disabled={!att}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flag toggle buttons */}
                  <div className={styles.flagToggleRow} onClick={(e) => e.stopPropagation()}>
                    {flagConfig.map((fc) => {
                      const isActive = flags.includes(fc.key);
                      return (
                        <button
                          key={fc.key}
                          className={`${styles.flagToggleBtn} ${isActive ? styles.flagToggleBtnOn : ''}`}
                          style={isActive ? { background: fc.color + '18', borderColor: fc.color + '40', color: fc.color } : undefined}
                          onClick={() => toggleFlag(s.id, fc.key)}
                          title={fc.label}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{fc.label[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.rowCheckoutBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowCheckout(s.id);
                      }}
                    >
                      <LogOut size={12} /> Done
                    </button>
                    <div className={styles.moveWrap}>
                      <button
                        className={styles.moveBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingStudent(isMoveOpen ? null : s.id);
                        }}
                      >
                        <RefreshCw size={12} /> Move
                      </button>
                      {isMoveOpen && (
                        <div
                          className={styles.movePopover}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rows
                            .filter((r) => r.id !== selectedRowId)
                            .map((r) => {
                              const count = (assignments[r.id] || []).length;
                              const isFull = count >= r.seats;
                              return (
                                <button
                                  key={r.id}
                                  className={`${styles.moveItem} ${isFull ? styles.moveItemFull : ''}`}
                                  disabled={isFull}
                                  onClick={() => {
                                    moveStudentToRow(s.id, r.id);
                                    setMovingStudent(null);
                                  }}
                                >
                                  <span>{r.label}</span>
                                  <span className={styles.moveSeatCount}>
                                    {count}/{r.seats}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedStudent && (
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
          />
        )}
      </div>
    </div>
  );
}
