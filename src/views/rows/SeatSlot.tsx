'use client';

import { useRef } from 'react';
import type { Student, Attendance } from '@/lib/types';
import { getTimeRemaining, parseSubjects } from '@/lib/types';
import styles from './SeatSlot.module.css';

interface SeatSlotProps {
  student: Student | null;
  attendance?: Attendance;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTouchDragStart?: () => void;
  onSelect?: () => void;
  isDragging?: boolean;
}

const DRAG_THRESHOLD = 8;

export default function SeatSlot({
  student,
  attendance,
  onDragStart,
  onDragEnd,
  onTouchDragStart,
  onSelect,
  isDragging,
}: SeatSlotProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragFiredRef = useRef(false);
  if (!student) {
    return <div className={styles.empty} />;
  }

  const durationOpts = { scheduleDetail: student.schedule_detail, sessionDurationMinutes: attendance?.session_duration_minutes };
  const remaining = attendance
    ? getTimeRemaining(student.subjects, attendance.check_in, durationOpts)
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
      onClick={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect();
        }
      }}
      onTouchStart={(e) => {
        if (onTouchDragStart || onSelect) {
          e.preventDefault();
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          dragFiredRef.current = false;
        }
      }}
      onTouchMove={(e) => {
        if (!touchStartRef.current || dragFiredRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
          dragFiredRef.current = true;
          onTouchDragStart?.();
        }
      }}
      onTouchEnd={() => {
        if (touchStartRef.current && !dragFiredRef.current) {
          onSelect?.();
        }
        touchStartRef.current = null;
      }}
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
