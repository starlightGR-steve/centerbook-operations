'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Edit2 } from 'lucide-react';
import ClockDisplay from '@/components/ClockDisplay';
import WholeClassCard, { type WholeClassTeacherNote } from '@/components/classroom/WholeClassCard';
import DragLockToggle from '@/components/classroom/DragLockToggle';
import { getCenterToday } from '@/lib/dates';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { useClassroomTeachers, assignTeacherToRow } from '@/hooks/useRows';
import type { Student, Attendance, ClassroomSection, ClassroomRow, RowAssignmentFlags } from '@/lib/types';
import { getTimeRemaining, getTeacherNotes } from '@/lib/types';
import styles from './ClassroomOverview.module.css';

const DRAG_LOCK_STORAGE_KEY = 'rows.dragLocked';

interface FlatRow extends ClassroomRow {
  section: string;
  seats: number;
  testingSeats: number;
}

interface ClassroomOverviewProps {
  sections: ClassroomSection[];
  students: Student[];
  attendanceMap: Map<number, Attendance>;
  checkedInStudents: Student[];
  flagsMap: Record<number, RowAssignmentFlags>;
  onSelectRow: (rowId: string) => void;
  onSelectStudent: (student: Student) => void;
  onAddToRow: (rowLabel: string) => void;
  onAddToTestingRow: (rowLabel: string) => void;
  onSetup: () => void;
  onMoveStudent: (studentId: number, targetRowId: string, isTesting?: boolean) => void;
  rowOverrides: Record<string, string>;
  dragStudent: Student | null;
  onDragStart: (student: Student) => void;
  onDragEnd: () => void;
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

export default function ClassroomOverview({
  sections,
  students,
  attendanceMap,
  checkedInStudents,
  flagsMap,
  onSelectRow,
  onSelectStudent,
  onAddToRow,
  onAddToTestingRow,
  onSetup,
  onMoveStudent,
  rowOverrides,
  dragStudent,
  onDragStart,
  onDragEnd,
}: ClassroomOverviewProps) {
  const rows = useMemo(() => buildRows(sections), [sections]);

  const assignments = useMemo(
    () => buildAssignments(checkedInStudents, rows, rowOverrides),
    [checkedInStudents, rows, rowOverrides]
  );

  const totalIn = checkedInStudents.length;

  // Teacher assignments
  const today = getCenterToday();
  const { data: teacherAssignments, mutate: mutateTeachers } = useClassroomTeachers(today);
  const { data: allStaff } = useActiveStaff();
  const { data: timeclockEntries } = useTimeclock(today);

  // Build teacher lookup: row_label -> staff_id
  const teacherMap = useMemo(() => {
    const map: Record<string, number> = {};
    teacherAssignments?.forEach((t) => { map[t.row_label] = t.staff_id; });
    return map;
  }, [teacherAssignments]);

  // Clocked-in staff IDs
  const clockedInIds = useMemo(() => {
    if (!timeclockEntries) return new Set<number>();
    return new Set(
      timeclockEntries
        .filter((e) => !e.clock_out)
        .map((e) => e.staff_id)
    );
  }, [timeclockEntries]);

  // Staff options: sort clocked-in first
  const staffOptions = useMemo(() => {
    if (!allStaff) return [];
    return [...allStaff]
      .sort((a, b) => {
        const aIn = clockedInIds.has(a.id) ? 0 : 1;
        const bIn = clockedInIds.has(b.id) ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
        const aName = `${a.first_name || ''} ${a.last_name || ''}`;
        const bName = `${b.first_name || ''} ${b.last_name || ''}`;
        return aName.localeCompare(bName);
      });
  }, [allStaff, clockedInIds]);

  const handleTeacherChange = useCallback(async (rowLabel: string, staffId: number) => {
    if (!staffId) return;
    await assignTeacherToRow({
      staff_id: staffId,
      row_label: rowLabel,
      session_date: today,
    });
    mutateTeachers();
  }, [today, mutateTeachers]);

  const getStaffDisplay = (s: { first_name?: string | null; last_name?: string | null; full_name?: string }) => {
    if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name[0]}.`;
    if (s.full_name) return s.full_name;
    return 'Staff';
  };

  // Global drag lock — persisted per-tablet via localStorage so the toggle
  // stays in whichever position Fran picked across drops and reloads. Default
  // is locked so a fresh tablet doesn't accept stray taps as drags.
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(DRAG_LOCK_STORAGE_KEY);
      if (raw === null) return true;
      return raw === 'true';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DRAG_LOCK_STORAGE_KEY, isLocked ? 'true' : 'false');
    } catch { /* ignore quota / disabled storage */ }
  }, [isLocked]);

  const handleDrop = useCallback((rowId: string, isTesting?: boolean) => {
    if (dragStudent) {
      onMoveStudent(dragStudent.id, rowId, isTesting);
      onDragEnd();
    }
  }, [dragStudent, onMoveStudent, onDragEnd]);

  // ── Touch drag support for iPad / mobile ──
  const touchHoverRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!dragStudent) return;

    const findRowCard = (x: number, y: number): HTMLElement | null => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-row-id]') as HTMLElement | null;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // prevent scroll during drag
      const touch = e.touches[0];
      const target = findRowCard(touch.clientX, touch.clientY);

      // Update hover highlight
      if (touchHoverRef.current !== target) {
        touchHoverRef.current?.classList.remove(styles.rowCardDragOver);
        target?.classList.add(styles.rowCardDragOver);
        touchHoverRef.current = target;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const target = findRowCard(touch.clientX, touch.clientY);
      const rowId = target?.getAttribute('data-row-id');
      const isTesting = target?.getAttribute('data-testing') === 'true';

      // Clean up hover highlight
      touchHoverRef.current?.classList.remove(styles.rowCardDragOver);
      touchHoverRef.current = null;

      if (rowId) {
        handleDrop(rowId, isTesting);
      } else {
        onDragEnd();
      }
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      touchHoverRef.current?.classList.remove(styles.rowCardDragOver);
      touchHoverRef.current = null;
    };
  }, [dragStudent, onDragEnd, handleDrop]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h3 className={styles.title}>Live Classroom</h3>
        <span className={styles.badge}>{totalIn} students checked in</span>
        <div className={styles.headerSpacer} />
        <DragLockToggle
          isLocked={isLocked}
          onToggle={() => setIsLocked((v) => !v)}
        />
        <button className={styles.setupBtn} onClick={onSetup}>
          <Edit2 size={16} /> Classroom Setup
        </button>
        <ClockDisplay size="sm" variant="muted" />
      </header>

      <div className={styles.content}>
        {sections.map((section) => {
          const sectionRows = rows.filter((r) => r.section === section.name);
          return (
            <div key={section.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div
                  className={styles.sectionBar}
                  style={{ background: section.color }}
                />
                <div>
                  <h3
                    className={styles.sectionName}
                    style={{ color: section.color }}
                  >
                    {section.name}
                  </h3>
                  <p className={styles.sectionDesc}>{section.desc}</p>
                </div>
              </div>

              <div
                className={styles.rowGrid}
                data-small={sectionRows.length <= 3 && sectionRows[0]?.tables === 1 ? '' : undefined}
              >
                {sectionRows.map((row) => {
                  const rs = assignments[row.id] || [];
                  // 86ah3f3xp (unnumbered): testing is a property of the
                  // student, not the seat. When the row has a designated
                  // testing table (testingSeats > 0), testing students fill
                  // it. When it doesn't, they fall back to the regular
                  // section so they don't vanish from the board — the
                  // testing visual on WholeClassCard still applies.
                  const hasTestingTable = row.testingSeats > 0;
                  const regularStudents = hasTestingTable
                    ? rs.filter((s) => !flagsMap[s.id]?.taking_test)
                    : rs;
                  const testingStudents = hasTestingTable
                    ? rs.filter((s) => !!flagsMap[s.id]?.taking_test)
                    : [];

                  const renderCard = (s: Student) => {
                    const att = attendanceMap.get(s.id);
                    const flags = flagsMap[s.id];
                    const remaining = att
                      ? getTimeRemaining(s.subjects, att.check_in, {
                          scheduleDetail: s.schedule_detail,
                          sessionDurationMinutes: att.session_duration_minutes,
                        })
                      : 0;
                    const teacherNotes: WholeClassTeacherNote[] = getTeacherNotes(flags).map((n, idx) => ({
                      id: `${s.id}-${idx}`,
                      text: n.text,
                      done: n.done,
                    }));
                    return (
                      <WholeClassCard
                        key={s.id}
                        student={s}
                        attendance={att}
                        flags={flags}
                        timeRemainingMinutes={remaining}
                        teacherNotes={teacherNotes}
                        isDraggable={!isLocked}
                        onCardTap={() => onSelectStudent(s)}
                        onDragStart={() => onDragStart(s)}
                        onDragEnd={onDragEnd}
                        onTouchDragStart={() => onDragStart(s)}
                        isDragging={dragStudent?.id === s.id}
                      />
                    );
                  };

                  return (
                    <div
                      key={row.id}
                      data-row-id={row.id}
                      className={`${styles.rowCard} ${dragStudent ? styles.rowCardDropTarget : ''}`}
                      onClick={() => {
                        if (!dragStudent) onSelectRow(row.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add(styles.rowCardDragOver);
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove(styles.rowCardDragOver);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove(styles.rowCardDragOver);
                        handleDrop(row.id, false);
                      }}
                    >
                      <div className={styles.rowCardHeader}>
                        <div>
                          <h3 className={styles.rowLabel}>{row.label}</h3>
                          <div className={styles.teacherDropdownWrap} onClick={(e) => e.stopPropagation()}>
                            <select
                              className={styles.teacherDropdown}
                              value={teacherMap[row.label] ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val) handleTeacherChange(row.label, val);
                              }}
                            >
                              <option value="">Assign</option>
                              {staffOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {getStaffDisplay(s)}{clockedInIds.has(s.id) ? ' ●' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <span className={styles.rowCount}>
                          {rs.length}/{row.seats + row.testingSeats}
                        </span>
                      </div>

                      <div className={styles.cardStack} onClick={(e) => e.stopPropagation()}>
                        {Array.from({ length: row.seats }).map((_, slotIdx) => {
                          const s = regularStudents[slotIdx];
                          if (s) return renderCard(s);
                          // 86ah3f3xp Finding 1: empty seat card. Restored from
                          // pre-consolidation behavior — every open seat shows a blank
                          // card matching WholeClassCard footprint. Clicking opens the
                          // picker; the card is also a drag target.
                          return (
                            <button
                              key={`empty-${row.id}-${slotIdx}`}
                              type="button"
                              className={styles.emptySeat}
                              onClick={(e) => { e.stopPropagation(); onAddToRow(row.label); }}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDrop(row.id, false);
                              }}
                              aria-label={`Open seat in ${row.label}`}
                            />
                          );
                        })}
                      </div>

                      {row.testingSeats > 0 && (
                        <div
                          className={`${styles.testingSection} ${dragStudent ? styles.testingSectionDropTarget : ''}`}
                          data-row-id={row.id}
                          data-testing="true"
                          onClick={(e) => e.stopPropagation()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.add(styles.rowCardDragOver);
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove(styles.rowCardDragOver);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove(styles.rowCardDragOver);
                            handleDrop(row.id, true);
                          }}
                        >
                          <div className={styles.testingSectionHeader}>
                            <span className={styles.testingSectionLabel}>Testing Table</span>
                            <span className={styles.testingSectionCount}>
                              {testingStudents.length}/{row.testingSeats}
                            </span>
                          </div>
                          <div className={styles.cardStack}>
                            {Array.from({ length: row.testingSeats }).map((_, slotIdx) => {
                              const s = testingStudents[slotIdx];
                              if (s) return renderCard(s);
                              return (
                                <button
                                  key={`empty-test-${row.id}-${slotIdx}`}
                                  type="button"
                                  className={styles.emptySeat}
                                  onClick={(e) => { e.stopPropagation(); onAddToTestingRow(row.label); }}
                                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDrop(row.id, true);
                                  }}
                                  aria-label={`Open testing seat in ${row.label}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
