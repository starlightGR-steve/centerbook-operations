'use client';

import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import type { Student, Attendance, RowAssignmentFlags } from '@/lib/types';
import { parseSubjects } from '@/lib/types';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import FlagChip, { type FlagChipType } from './FlagChip';
import ChecklistItem from './ChecklistItem';
import CardButton from './CardButton';
import styles from './RowViewCard.module.css';

export interface TeacherNoteSummary {
  id: string;
  text: string;
  done: boolean;
}

export interface RowViewCardProps {
  student: Student;
  attendance: Attendance | undefined;
  flags: RowAssignmentFlags | null | undefined;
  timeRemainingMinutes: number;
  teacherNotes: TeacherNoteSummary[];
  onCardTap: () => void;
  onDone: () => void;
  onMove: () => void;
  onTime: () => void;
  onFlagToggle: (flagKey: string, done: boolean) => void;
  onChecklistToggle: (itemKey: string, done: boolean) => void;
  onMedicalTap: () => void;
}

/** Map configured flag keys to FlagChip visual types. */
function flagKeyToType(key: string): FlagChipType | null {
  switch (key) {
    case 'new_concept': return 'new_concept';
    case 'needs_help': return 'needs_help';
    case 'work_with_amy': return 'work_amy';
    case 'needs_homework': return 'needs_homework';
    default: return null;
  }
}

export default function RowViewCard({
  student,
  attendance,
  flags,
  timeRemainingMinutes,
  teacherNotes,
  onCardTap,
  onDone,
  onMove,
  onTime,
  onFlagToggle,
  onChecklistToggle,
  onMedicalTap,
}: RowViewCardProps) {
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();

  const subjects = parseSubjects(student.subjects);
  const isTesting = !!flags?.taking_test;
  const isOver = !!attendance && timeRemainingMinutes <= 0;
  const isWarn = !!attendance && timeRemainingMinutes > 0 && timeRemainingMinutes <= 5;
  const hasMedical =
    !!student.medical_notes &&
    student.medical_notes !== 'None' &&
    student.medical_notes.trim() !== '';
  const hasUnresolvedNote = teacherNotes.some((n) => !n.done);

  // Derive presented flags + checklist items from configured options + flags blob
  const flagEntries = useMemo(() => {
    const flagBlob = flags as Record<string, unknown> | null | undefined;
    return flagConfig
      .filter((fc) => {
        const t = flagKeyToType(fc.key);
        if (!t) return false;
        return flagBlob ? flagBlob[fc.key] !== undefined : false;
      })
      .map((fc) => ({
        key: fc.key,
        label: fc.label,
        type: flagKeyToType(fc.key)!,
        done: !((flags as Record<string, unknown>)[fc.key]),
      }));
  }, [flagConfig, flags]);

  // Standard configured items + custom-keyed tasks (added via the "Custom task..."
  // input on the check-in popup). Mirrors StudentDetailPanel so both surfaces
  // render the same set. Label resolution for custom keys:
  //   1. Legacy shape — flags.tasks.custom = "<text>" (value is the label)
  //   2. Phase 6c shape — flags.tasks["custom:<text>"] = false (strip prefix)
  //   3. Unknown key — pretty-print as fallback
  const checklistEntries = useMemo(() => {
    const tasks = (flags?.tasks ?? {}) as Record<string, boolean | string | null | undefined>;
    const standard = checklistConfig
      .filter((ci) => tasks[ci.key] !== undefined && tasks[ci.key] !== null)
      .map((ci) => ({
        key: ci.key,
        label: ci.label,
        done: tasks[ci.key] === true,
      }));
    const configKeys = new Set(checklistConfig.map((ci) => ci.key));
    const custom = Object.keys(tasks)
      .filter((k) => !configKeys.has(k))
      .map((key) => {
        const val = tasks[key];
        const label = typeof val === 'string' && val.length > 0
          ? val
          : key.startsWith('custom:')
            ? key.slice('custom:'.length)
            : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return { key, label, done: val === true };
      });
    return [...standard, ...custom];
  }, [checklistConfig, flags]);

  const cardClassNames = [
    styles.card,
    isOver ? styles.cardOver : '',
    !isOver && isWarn ? styles.cardWarn : '',
    isTesting ? styles.cardTesting : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isLightDensity = flagEntries.length === 0 && checklistEntries.length === 0;
  const actionsClassNames = [
    styles.actions,
    isLightDensity ? styles.actionsLight : '',
  ]
    .filter(Boolean)
    .join(' ');

  const timeStr = !attendance
    ? '--'
    : isOver
      ? timeRemainingMinutes === 0
        ? '0'
        : `+${Math.abs(timeRemainingMinutes)}`
      : String(timeRemainingMinutes);

  return (
    <div
      className={cardClassNames}
      onClick={onCardTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardTap();
        }
      }}
    >
      {isTesting && (
        <span className={styles.testingTab} aria-label="Testing">
          TESTING
        </span>
      )}
      {hasUnresolvedNote && (
        <span className={styles.redFlagTab} aria-label="Unresolved teacher note">
          <svg
            viewBox="0 0 24 32"
            fill="#ef4444"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 2 L22 2 L22 20 L2 20 Z" />
            <line x1="2" y1="2" x2="2" y2="32" strokeWidth="2" />
          </svg>
        </span>
      )}

      <div className={styles.header}>
        <h3 className={styles.name}>
          {student.first_name} {student.last_name}
        </h3>
        {attendance && (
          <div className={styles.timer}>
            <span className={styles.timerNum}>{timeStr}</span>
            <span className={styles.timerUnit}>m</span>
          </div>
        )}
      </div>

      <div className={styles.subjectRow}>
        {subjects.includes('Math') && (
          <span className={`${styles.subjectPill} ${styles.pillMath}`}>
            Math {student.current_level_math || ''}
          </span>
        )}
        {subjects.includes('Reading') && (
          <span className={`${styles.subjectPill} ${styles.pillReading}`}>
            Reading {student.current_level_reading || ''}
          </span>
        )}
        {hasMedical && (
          <button
            type="button"
            className={styles.medicalBtn}
            onClick={(e) => {
              e.stopPropagation();
              onMedicalTap();
            }}
            aria-label="Medical info"
          >
            <Heart size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          </button>
        )}
      </div>

      {flagEntries.length > 0 && (
        <div
          className={styles.flagStack}
          onClick={(e) => e.stopPropagation()}
        >
          {flagEntries.map((entry) => (
            <FlagChip
              key={entry.key}
              type={entry.type}
              label={entry.label}
              done={entry.done}
              onToggle={() => onFlagToggle(entry.key, !entry.done)}
            />
          ))}
        </div>
      )}

      {checklistEntries.length > 0 && (
        <div
          className={styles.checklistStack}
          onClick={(e) => e.stopPropagation()}
        >
          {checklistEntries.map((entry) => (
            <ChecklistItem
              key={entry.key}
              itemKey={entry.key}
              label={entry.label}
              done={entry.done}
              onToggle={() => onChecklistToggle(entry.key, !entry.done)}
            />
          ))}
        </div>
      )}

      <div
        className={actionsClassNames}
        onClick={(e) => e.stopPropagation()}
      >
        <CardButton variant="done" label="Done" onPress={onDone} />
        <CardButton variant="move" label="Move" onPress={onMove} />
        <CardButton variant="time" label="Time" onPress={onTime} />
      </div>
    </div>
  );
}
