'use client';

import { useRef } from 'react';
import { Heart, Flag, Lightbulb, CircleHelp, BookOpen, Star, AlertCircle, Zap, UserCheck, Sparkles, ClipboardList } from 'lucide-react';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { getTimeRemaining, parseSubjects } from '@/lib/types';
import { useFlagConfig } from '@/hooks/useFlagConfig';
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
  isTesting?: boolean;
}

const DRAG_THRESHOLD = 8;

/** Render an icon from a config string inside a dark navy flag circle */
function FlagCircleIcon({ icon }: { icon: string | undefined }) {
  if (!icon) return <Flag size={8} color="#fff" />;
  if (icon.startsWith('text:')) {
    return <span className={styles.flagCircleText}>{icon.slice(5)}</span>;
  }
  const props = { size: 8, color: '#fff' };
  switch (icon) {
    case 'Lightbulb': return <Lightbulb {...props} />;
    case 'CircleHelp': return <CircleHelp {...props} />;
    case 'BookOpen': return <BookOpen {...props} />;
    case 'Star': return <Star {...props} />;
    case 'AlertCircle': return <AlertCircle {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'Flag': return <Flag {...props} />;
    case 'Heart': return <Heart {...props} />;
    case 'UserCheck': return <UserCheck {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'ClipboardList': return <ClipboardList {...props} />;
    default: return <Flag {...props} />;
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
  isTesting,
}: SeatSlotProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragFiredRef = useRef(false);
  // Must be called before any conditional returns (Rules of Hooks)
  const { flags: flagConfig } = useFlagConfig();

  if (!student) {
    if (isTesting) {
      return (
        <div className={styles.testingSeatEmpty}>
          <span className={styles.testingSeatEmptyLabel}>Testing table</span>
        </div>
      );
    }
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

  // Active flags for the second-line navy circles (from dynamic config)
  const activeFlags = flags
    ? flagConfig.filter((fc) => (flags as Record<string, unknown>)[fc.key])
    : [];

  // Outstanding tasks indicator: shows when any task is assigned-not-done (false) OR teacher note exists
  const hasOutstandingTasks = !!(
    (flags?.tasks && Object.values(flags.tasks).some((v) => v === false || (typeof v === 'string' && v.length > 0)))
    || flags?.teacher_note
  );

  return (
    <div
      className={`${styles.slot} ${variant} ${isKC ? styles.slotKC : ''} ${isTesting ? styles.testingSeat : ''}`}
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
      {/* Amber TEST badge for testing table seats */}
      {isTesting && (
        <span className={styles.testingSeatBadge}>TEST</span>
      )}

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
          {activeFlags.map((fc) => (
            <span key={fc.key} className={styles.flagCircle} title={fc.label}>
              <FlagCircleIcon icon={fc.icon} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
