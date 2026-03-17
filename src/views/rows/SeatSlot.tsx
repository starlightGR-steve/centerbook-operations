'use client';

import type { Student, Attendance } from '@/lib/types';
import { getTimeRemaining, parseSubjects } from '@/lib/types';
import styles from './SeatSlot.module.css';

interface SeatSlotProps {
  student: Student | null;
  attendance?: Attendance;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export default function SeatSlot({
  student,
  attendance,
  onDragStart,
  onDragEnd,
  isDragging,
}: SeatSlotProps) {
  if (!student) {
    return <div className={styles.empty} />;
  }

  const remaining = attendance
    ? getTimeRemaining(student.subjects, attendance.check_in)
    : null;
  const isOver = remaining !== null && remaining <= 0;
  const isWarn = remaining !== null && remaining > 0 && remaining <= 5;
  const timeStr =
    remaining === null
      ? ''
      : isOver
        ? remaining === 0
          ? '0m'
          : `+${Math.abs(remaining)}m`
        : `${remaining}m`;

  const subjects = parseSubjects(student.subjects);
  const isKC = student.program_type === 'Kumon Connect';
  const variant = isOver ? styles.over : isWarn ? styles.warn : '';

  return (
    <div
      className={`${styles.slot} ${variant}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={`${student.first_name} ${student.last_name} — ${timeStr || 'not checked in'}`}
    >
      <div className={styles.left}>
        <span className={styles.name}>
          {student.first_name} {student.last_name[0]}.
        </span>
        <div className={styles.badges}>
          {subjects.includes('Math') && (
            <span className={styles.badgeM}>M</span>
          )}
          {subjects.includes('Reading') && (
            <span className={styles.badgeR}>R</span>
          )}
          {isKC && <span className={styles.badgeKC}>KC</span>}
        </div>
      </div>
      {timeStr && <span className={styles.time}>{timeStr}</span>}
    </div>
  );
}
