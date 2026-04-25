'use client';

import { useMemo, useRef } from 'react';
import { Heart } from 'lucide-react';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { parseSubjects } from '@/lib/types';
import { useFlagConfig } from '@/hooks/useFlagConfig';
import FlagChip, { type FlagChipType } from './FlagChip';
import SubjectLetters from './SubjectLetters';
import styles from './WholeClassCard.module.css';

export interface WholeClassTeacherNote {
  id: string;
  text: string;
  done: boolean;
}

export interface WholeClassCardProps {
  student: Student;
  attendance: Attendance | undefined;
  flags: RowAssignmentFlags | null | undefined;
  timeRemainingMinutes: number;
  teacherNotes: WholeClassTeacherNote[];
  isDraggable?: boolean;
  onCardTap: () => void;
  /** Drag source callbacks — wired by the parent (ClassroomOverview). */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTouchDragStart?: () => void;
  isDragging?: boolean;
}

const DRAG_THRESHOLD = 8;

function flagKeyToType(key: string): FlagChipType | null {
  switch (key) {
    case 'new_concept': return 'new_concept';
    case 'needs_help': return 'needs_help';
    case 'work_with_amy': return 'work_amy';
    case 'needs_homework': return 'needs_homework';
    default: return null;
  }
}

export default function WholeClassCard({
  student,
  attendance,
  flags,
  timeRemainingMinutes,
  teacherNotes,
  isDraggable = false,
  onCardTap,
  onDragStart,
  onDragEnd,
  onTouchDragStart,
  isDragging = false,
}: WholeClassCardProps) {
  const { flags: flagConfig } = useFlagConfig();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragFiredRef = useRef(false);

  const subjects = parseSubjects(student.subjects);
  const isKC = student.program_type === 'Kumon Connect';
  const hasMedical =
    !!student.medical_notes &&
    student.medical_notes !== 'None' &&
    student.medical_notes.trim() !== '';

  const isTesting = !!flags?.taking_test;
  const isOver = !!attendance && timeRemainingMinutes <= 0;
  const isWarn = !!attendance && timeRemainingMinutes > 0 && timeRemainingMinutes <= 5;

  const activeFlags = useMemo(() => {
    const flagBlob = flags as Record<string, unknown> | null | undefined;
    if (!flagBlob) return [];
    return flagConfig
      .filter((fc) => {
        const t = flagKeyToType(fc.key);
        if (!t) return false;
        return !!flagBlob[fc.key];
      })
      .map((fc) => ({ key: fc.key, label: fc.label, type: flagKeyToType(fc.key)! }));
  }, [flagConfig, flags]);

  // Red flag visibility: unresolved teacher notes, active new_concept flag,
  // or any unchecked checklist task. Other flags are visible as chips already.
  const hasUnresolvedNote = teacherNotes.some((n) => !n.done);
  const hasNewConcept = !!(flags as Record<string, unknown> | null | undefined)?.new_concept;
  const tasks = (flags?.tasks ?? {}) as Record<string, boolean | string | null | undefined>;
  const hasUncheckedTask = Object.values(tasks).some(
    (v) => v === false || (typeof v === 'string' && v.length > 0)
  );
  const showRedFlag = hasUnresolvedNote || hasNewConcept || hasUncheckedTask;

  const cardClassNames = [
    styles.card,
    isKC ? styles.cardKC : '',
    isTesting ? styles.cardTesting : '',
    isWarn && !isOver ? styles.cardWarn : '',
    isOver ? styles.cardOver : '',
    isDragging ? styles.cardDragging : '',
  ]
    .filter(Boolean)
    .join(' ');

  const timeNumber = !attendance
    ? '--'
    : isOver
      ? timeRemainingMinutes === 0
        ? '0'
        : String(Math.abs(timeRemainingMinutes))
      : String(timeRemainingMinutes);

  return (
    <div
      className={cardClassNames}
      onClick={onCardTap}
      role="button"
      tabIndex={0}
      aria-label={`${student.first_name} ${student.last_name}`}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) {
          e.preventDefault();
          return;
        }
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardTap();
        }
      }}
      onTouchStart={(e) => {
        if (!isDraggable) return;
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        dragFiredRef.current = false;
      }}
      onTouchMove={(e) => {
        if (!isDraggable || !touchStartRef.current || dragFiredRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
          dragFiredRef.current = true;
          onTouchDragStart?.();
        }
      }}
      onTouchEnd={() => {
        // Tap (no drag fired) handled by onClick; drag end propagates via parent.
        touchStartRef.current = null;
      }}
    >
      {isKC && <span className={styles.kcStrip} aria-hidden="true" />}

      {isTesting && (
        <span className={styles.testingTab} aria-label="Testing">
          TESTING
        </span>
      )}

      {showRedFlag && (
        <span className={styles.redFlagTab} aria-label="Needs attention">
          <svg
            viewBox="0 0 24 32"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 2 L22 2 L22 20 L2 20 Z" />
            <line x1="2" y1="2" x2="2" y2="32" strokeWidth="2" />
          </svg>
        </span>
      )}

      <div className={styles.contentGroup}>
        <span className={styles.name}>
          {student.first_name} {student.last_name}
        </span>

        <SubjectLetters
          math={subjects.includes('Math')}
          reading={subjects.includes('Reading')}
        />

        {hasMedical && (
          <Heart
            size={18}
            className={styles.medicalHeart}
            aria-label="Medical info"
          />
        )}

        {activeFlags.map((entry) => (
          <FlagChip
            key={entry.key}
            type={entry.type}
            label={entry.label}
            variant="compact"
          />
        ))}
      </div>

      {attendance && (
        <span className={styles.timer}>
          {isOver ? (
            <>
              <span className={styles.timerNumber}>{timeNumber}</span>
              <span className={styles.timerUnit}>m over</span>
            </>
          ) : (
            <>
              <span className={styles.timerNumber}>{timeNumber}</span>
              <span className={styles.timerUnit}>m</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
