'use client';

import { useMemo, useCallback } from 'react';
import { Edit2, ChevronDown } from 'lucide-react';
import ClockDisplay from '@/components/ClockDisplay';
import SeatSlot from './SeatSlot';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { useClassroomTeachers, assignTeacherToRow } from '@/hooks/useRows';
import type { Student, Attendance, ClassroomSection, ClassroomRow } from '@/lib/types';
import styles from './ClassroomOverview.module.css';

interface FlatRow extends ClassroomRow {
  section: string;
  seats: number;
}

interface ClassroomOverviewProps {
  sections: ClassroomSection[];
  students: Student[];
  attendanceMap: Map<number, Attendance>;
  checkedInStudents: Student[];
  onSelectRow: (rowId: string) => void;
  onSetup: () => void;
  onMoveStudent: (studentId: number, targetRowId: string) => void;
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
    }))
  );
}

function distributeStudents(
  checkedIn: Student[],
  rows: FlatRow[],
  rowOverrides: Record<string, string>
): Record<string, Student[]> {
  const assignments: Record<string, Student[]> = {};
  rows.forEach((r) => (assignments[r.id] = []));

  // Place overridden students first
  const overridden = new Set<number>();
  checkedIn.forEach((s) => {
    const targetRow = rowOverrides[String(s.id)];
    if (targetRow && assignments[targetRow]) {
      assignments[targetRow].push(s);
      overridden.add(s.id);
    }
  });

  // Distribute remaining by classroom position
  const remaining = checkedIn.filter((s) => !overridden.has(s.id));

  const distribute = (studs: Student[], sectionRows: FlatRow[]) => {
    studs.forEach((s, i) => {
      if (sectionRows.length === 0) return;
      const row = sectionRows[i % sectionRows.length];
      if (assignments[row.id].length < row.seats) {
        assignments[row.id].push(s);
      } else {
        const available = sectionRows.filter(
          (r) => assignments[r.id].length < r.seats
        );
        if (available.length > 0) {
          available.sort(
            (x, y) => assignments[x.id].length - assignments[y.id].length
          );
          assignments[available[0].id].push(s);
        }
      }
    });
  };

  const elRows = rows.filter((r) => r.section === 'Early Learners');
  const mcRows = rows.filter((r) => r.section === 'Main Classroom');
  const ucRows = rows.filter((r) => r.section === 'Upper Classroom');

  distribute(
    remaining.filter((s) => s.classroom_position === 'Early Learners'),
    elRows
  );
  distribute(
    remaining.filter((s) => s.classroom_position === 'Main Classroom'),
    mcRows
  );
  distribute(
    remaining.filter((s) => s.classroom_position === 'Upper Classroom'),
    ucRows
  );

  return assignments;
}

export default function ClassroomOverview({
  sections,
  students,
  attendanceMap,
  checkedInStudents,
  onSelectRow,
  onSetup,
  onMoveStudent,
  rowOverrides,
  dragStudent,
  onDragStart,
  onDragEnd,
}: ClassroomOverviewProps) {
  const rows = useMemo(() => buildRows(sections), [sections]);

  const assignments = useMemo(
    () => distributeStudents(checkedInStudents, rows, rowOverrides),
    [checkedInStudents, rows, rowOverrides]
  );

  const totalIn = checkedInStudents.length;

  // Teacher assignments
  const today = new Date().toISOString().split('T')[0];
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

  const handleDrop = (rowId: string) => {
    if (dragStudent) {
      onMoveStudent(dragStudent.id, rowId);
      onDragEnd();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Live Classroom</h3>
          <span className={styles.badge}>{totalIn} students checked in</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.setupBtn} onClick={onSetup}>
            <Edit2 size={14} /> Classroom Setup
          </button>
          <ClockDisplay size="sm" />
        </div>
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
                  const tables: { s1: Student | null; s2: Student | null }[] =
                    [];
                  for (let t = 0; t < row.tables; t++) {
                    tables.push({
                      s1: rs[t * 2] || null,
                      s2: rs[t * 2 + 1] || null,
                    });
                  }

                  return (
                    <div
                      key={row.id}
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
                        handleDrop(row.id);
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
                          {rs.length}/{row.seats}
                        </span>
                      </div>

                      <div className={styles.tables}>
                        {tables.map((table, ti) => (
                          <div key={ti} className={styles.tablePair}>
                            <SeatSlot
                              student={table.s1}
                              attendance={
                                table.s1
                                  ? attendanceMap.get(table.s1.id)
                                  : undefined
                              }
                              onDragStart={() =>
                                table.s1 && onDragStart(table.s1)
                              }
                              onDragEnd={onDragEnd}
                              isDragging={
                                dragStudent?.id === table.s1?.id
                              }
                            />
                            <SeatSlot
                              student={table.s2}
                              attendance={
                                table.s2
                                  ? attendanceMap.get(table.s2.id)
                                  : undefined
                              }
                              onDragStart={() =>
                                table.s2 && onDragStart(table.s2)
                              }
                              onDragEnd={onDragEnd}
                              isDragging={
                                dragStudent?.id === table.s2?.id
                              }
                            />
                          </div>
                        ))}
                      </div>

                      {rs.length > 0 && (
                        <div className={styles.rowBadges}>
                          {rs.some((s) => s.subjects.includes('Math')) && (
                            <span className={styles.subBadgeMath}>Math</span>
                          )}
                          {rs.some((s) => s.subjects.includes('Reading')) && (
                            <span className={styles.subBadgeReading}>
                              Reading
                            </span>
                          )}
                          {row.advanced && (
                            <span className={styles.subBadgeAdvanced}>
                              Advanced
                            </span>
                          )}
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
