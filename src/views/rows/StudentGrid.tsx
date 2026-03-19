'use client';

import { Plus } from 'lucide-react';
import StudentCard from './StudentCard';
import type { Student, Attendance } from '@/lib/types';
import { getTimeRemaining } from '@/lib/types';
import styles from './StudentGrid.module.css';

interface StudentGridProps {
  students: Student[];
  attendanceMap: Map<number, Attendance>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAssign: () => void;
  compact: boolean;
}

export default function StudentGrid({
  students,
  attendanceMap,
  selectedId,
  onSelect,
  onAssign,
  compact,
}: StudentGridProps) {
  // Sort by time remaining ascending (most urgent first)
  const sorted = [...students].sort((a, b) => {
    const aAttendance = attendanceMap.get(a.id);
    const bAttendance = attendanceMap.get(b.id);
    const aTime = aAttendance
      ? getTimeRemaining(a.subjects, aAttendance.check_in, { scheduleDetail: a.schedule_detail, sessionDurationMinutes: aAttendance.session_duration_minutes })
      : 999;
    const bTime = bAttendance
      ? getTimeRemaining(b.subjects, bAttendance.check_in, { scheduleDetail: b.schedule_detail, sessionDurationMinutes: bAttendance.session_duration_minutes })
      : 999;
    return aTime - bTime;
  });

  return (
    <div
      className={`${styles.grid} ${compact ? styles.gridCompact : styles.gridNormal}`}
      role="list"
      aria-label="Students in row"
    >
      <button
        className={styles.grid}
        onClick={onAssign}
        aria-label="Assign a student to this row"
        style={{
          aspectRatio: '1',
          borderRadius: '10px',
          border: '2px dashed var(--border)',
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--neutral)',
          transition: 'all 0.15s',
          fontFamily: 'var(--font-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--secondary)';
          e.currentTarget.style.color = 'var(--secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--neutral)';
        }}
      >
        <Plus size={26} />
        <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '6px' }}>
          Assign Student
        </span>
      </button>

      {sorted.map((s) => (
        <StudentCard
          key={s.id}
          student={s}
          attendance={attendanceMap.get(s.id)}
          isSelected={selectedId === s.id}
          onClick={() => onSelect(s.id)}
        />
      ))}
    </div>
  );
}
