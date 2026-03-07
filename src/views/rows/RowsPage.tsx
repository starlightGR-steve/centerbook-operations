'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Users, Heart, RefreshCw, AlertCircle } from 'lucide-react';
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
import { CLASSROOM_CONFIG } from '@/lib/classroom-config';
import type { Student, Attendance, ClassroomSection, ClassroomRow } from '@/lib/types';
import { getTimeRemaining, parseSubjects } from '@/lib/types';
import RowsSkeleton from './RowsSkeleton';
import styles from './RowsPage.module.css';

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

function distributeStudents(
  checkedIn: Student[],
  rows: FlatRow[]
): Record<string, Student[]> {
  const assignments: Record<string, Student[]> = {};
  rows.forEach((r) => (assignments[r.id] = []));

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
    checkedIn.filter((s) => s.classroom_position === 'Early Learners'),
    elRows
  );
  distribute(
    checkedIn.filter((s) => s.classroom_position === 'Main Classroom'),
    mcRows
  );
  distribute(
    checkedIn.filter((s) => s.classroom_position === 'Upper Classroom'),
    ucRows
  );

  return assignments;
}

export default function RowsPage() {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [dragStudent, setDragStudent] = useState<Student | null>(null);
  const [, setTick] = useState(0);

  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 10000);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const sections = CLASSROOM_CONFIG;
  const rows = useMemo(() => buildRows(sections), [sections]);

  const attendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    checkedIn?.forEach((a) => map.set(a.student_id, a));
    return map;
  }, [checkedIn]);

  const checkedInStudents = useMemo(() => {
    if (!allStudents || !checkedIn) return [];
    const ids = new Set(checkedIn.map((a) => a.student_id));
    return allStudents.filter((s) => ids.has(s.id));
  }, [allStudents, checkedIn]);

  const assignments = useMemo(
    () => distributeStudents(checkedInStudents, rows),
    [checkedInStudents, rows]
  );

  if (!allStudents || !checkedIn) {
    return <RowsSkeleton />;
  }

  // CLASSROOM OVERVIEW (default)
  if (!selectedRowId) {
    return (
      <ClassroomOverview
        sections={sections}
        students={allStudents}
        attendanceMap={attendanceMap}
        checkedInStudents={checkedInStudents}
        onSelectRow={(rowId) => {
          setSelectedRowId(rowId);
          setSelectedStudentId(null);
        }}
        onSetup={() => {/* TODO: ClassroomSetup modal */}}
        onMoveStudent={() => {/* TODO: row override */}}
        dragStudent={dragStudent}
        onDragStart={setDragStudent}
        onDragEnd={() => setDragStudent(null)}
      />
    );
  }

  // ROW DETAIL (drill-down)
  const currentRow = rows.find((r) => r.id === selectedRowId);
  const rowStudents = (assignments[selectedRowId] || []).sort((a, b) => {
    const aAtt = attendanceMap.get(a.id);
    const bAtt = attendanceMap.get(b.id);
    const aRem = aAtt ? getTimeRemaining(a.subjects, aAtt.check_in) : 999;
    const bRem = bAtt ? getTimeRemaining(b.subjects, bAtt.check_in) : 999;
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
        </div>
        <ClockDisplay size="sm" />
      </header>

      <div className={styles.content}>
        <div className={styles.gridWrap}>
          <div
            className={styles.cardGrid}
            data-compact={selectedStudent ? '' : undefined}
          >
            {rowStudents.map((s) => {
              const att = attendanceMap.get(s.id);
              const remaining = att
                ? getTimeRemaining(s.subjects, att.check_in)
                : null;
              const isOver = remaining !== null && remaining <= 0;
              const isWarn = remaining !== null && remaining > 0 && remaining <= 5;
              const isAlert = isOver || isWarn;
              const isSel = selectedStudentId === s.id;
              const timeStr =
                remaining === null
                  ? '—'
                  : isOver
                    ? remaining === 0
                      ? '0'
                      : `+${Math.abs(remaining)}`
                    : String(remaining);

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
                  <div>
                    <div className={styles.cardTop}>
                      <SubjectBadges subjects={parseSubjects(s.subjects)} />
                      {isAlert && (
                        <AlertCircle
                          size={16}
                          color={isOver ? 'var(--red)' : '#92400e'}
                          className={styles.pulseIcon}
                        />
                      )}
                    </div>
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
                    <div className={styles.cardBadges}>
                      {s.classroom_position && (
                        <PosBadge position={s.classroom_position} />
                      )}
                      {s.medical_notes && (
                        <span className={styles.medicalBadge}>
                          <Heart size={8} /> Medical
                        </span>
                      )}
                    </div>
                  </div>
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
            onClose={() => setSelectedStudentId(null)}
          />
        )}
      </div>
    </div>
  );
}
