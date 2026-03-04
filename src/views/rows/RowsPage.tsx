'use client';

import { useState, useMemo, useEffect } from 'react';
import { Users } from 'lucide-react';
import ClockDisplay from '@/components/ClockDisplay';
import StudentGrid from './StudentGrid';
import StudentDetailPanel from './StudentDetailPanel';
import RowAssignmentModal from './RowAssignmentModal';
import { useStudents } from '@/hooks/useStudents';
import { useCheckedInStudents } from '@/hooks/useAttendance';
import { useRowAssignments } from '@/hooks/useRows';
import type { Student, Attendance } from '@/lib/types';
import styles from './RowsPage.module.css';

const ROW_NUMBERS = [1, 2, 3, 4, 5, 6];

export default function RowsPage() {
  const [selectedRow, setSelectedRow] = useState(3);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [, setTick] = useState(0);

  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 10000);
  const { data: rowAssignments } = useRowAssignments(selectedRow);

  // Update time remaining every 15s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Map of student_id → attendance record for checked-in students
  const attendanceMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    checkedIn?.forEach((a) => map.set(a.student_id, a));
    return map;
  }, [checkedIn]);

  // Students assigned to the current row
  const rowStudents = useMemo(() => {
    if (!rowAssignments || !allStudents) return [];
    const studentIds = new Set(rowAssignments.map((a) => a.student_id));
    return allStudents.filter((s) => studentIds.has(s.id));
  }, [rowAssignments, allStudents]);

  // Students available for assignment (checked in but not in any row today)
  const availableForAssignment = useMemo(() => {
    if (!checkedIn || !allStudents || !rowAssignments) return [];
    const assignedIds = new Set(rowAssignments.map((a) => a.student_id));
    const checkedInIds = new Set(checkedIn.map((a) => a.student_id));
    return allStudents.filter(
      (s) => checkedInIds.has(s.id) && !assignedIds.has(s.id)
    );
  }, [checkedIn, allStudents, rowAssignments]);

  const selectedStudent = selectedStudentId
    ? allStudents?.find((s) => s.id === selectedStudentId) ?? null
    : null;

  if (!allStudents || !checkedIn) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.rowLabel}>
            <Users size={20} color="var(--secondary)" />
            <h3 className={styles.rowTitle}>Row {selectedRow}</h3>
          </div>
          <div className={styles.rowTabs}>
            {ROW_NUMBERS.map((r) => (
              <button
                key={r}
                className={`${styles.rowTab} ${selectedRow === r ? styles.rowTabActive : styles.rowTabInactive}`}
                onClick={() => {
                  setSelectedRow(r);
                  setSelectedStudentId(null);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <ClockDisplay size="sm" />
      </header>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.gridWrap}>
          <StudentGrid
            students={rowStudents}
            attendanceMap={attendanceMap}
            selectedId={selectedStudentId}
            onSelect={(id) =>
              setSelectedStudentId(selectedStudentId === id ? null : id)
            }
            onAssign={() => setShowAssignModal(true)}
            compact={selectedStudent !== null}
          />
        </div>

        {selectedStudent && (
          <StudentDetailPanel
            student={selectedStudent}
            attendance={attendanceMap.get(selectedStudent.id)}
            onClose={() => setSelectedStudentId(null)}
          />
        )}
      </div>

      {/* Assignment Modal */}
      <RowAssignmentModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        rowNumber={selectedRow}
        availableStudents={availableForAssignment}
      />
    </div>
  );
}
