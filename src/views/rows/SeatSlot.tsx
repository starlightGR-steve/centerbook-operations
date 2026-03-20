'use client';

import { useRef } from 'react';
import { Heart, Flag, Lightbulb, CircleHelp, BookOpen } from 'lucide-react';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { getTimeRemaining, parseSubjects } from '@/lib/types';
import { FLAG_KEYS } from '@/lib/flags';
import styles from './SeatSlot.module.css';

interface SeatSlotProps {
  student: Student | null;
  attendance?: Attendance;
  flags?: RowAssignmentFlags | null;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTouchDragStart?: () => void;
  onSelect?: () => void;
  isDragging?: boolean;
}

const DRAG_THRESHOLD = 8;

/** Render the icon inside a dark navy flag circle */
function FlagCircleIcon({ flagKey }: { flagKey: string }) {
  switch (flagKey) {
    case 'new_concept':
      return <Lightbulb size={8} color="#fff" />;
    case 'needs_help':
      return <CircleHelp size={8} color="#fff" />;
    case 'work_with_amy':
      return <span className={styles.flagCircleText}>A</span>;
    case 'needs_homework':
      return <BookOpen size={8} color="#fff" />;
    default:
      return null;
  }
}

export default function SeatSlot({
  student,
  attendance,
  flags,
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
  const hasMedical = !!student.medical_notes;
  const variant = isOver ? styles.over : isWarn ? styles.warn : '';

  // Active flags for the second-line navy circles
  const activeFlags = flags ? FLAG_KEYS.filter((k) => flags[k]) : [];

  // Outstanding tasks indicator (red flag top-right)
  const hasOutstandingTasks = flags?.tasks
    ? (!!flags.tasks.sound_cards || !!flags.tasks.flash_cards || !!flags.tasks.spelling || !!flags.tasks.handwriting || (typeof flags.tasks.custom === 'string' && flags.tasks.custom.length > 0))
    : false;

  return (
    <div
      className={`${styles.slot} ${variant} ${isKC ? styles.slotKC : ''}`}
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
      {/* Red flag icon for outstanding tasks — top-right corner */}
      {hasOutstandingTasks && (
        <Flag size={12} className={styles.taskFlag} />
      )}

      {/* Line 1: Name + badges + time */}
      <div className={styles.line1}>
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
            {hasMedical && (
              <Heart size={12} className={styles.medicalHeart} />
            )}
          </div>
        </div>
        {timeStr && <span className={styles.time}>{timeStr}</span>}
      </div>

      {/* Line 2: Classroom flag circles (only when flags exist) */}
      {activeFlags.length > 0 && (
        <div className={styles.flagLine}>
          {activeFlags.map((k) => (
            <span key={k} className={styles.flagCircle} title={k.replace(/_/g, ' ')}>
              <FlagCircleIcon flagKey={k} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
