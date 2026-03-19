'use client';

import { AlertCircle, ChevronRight, Clock } from 'lucide-react';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Student, Attendance } from '@/lib/types';
import { getTimeRemaining, getSessionDuration, parseSubjects } from '@/lib/types';
import styles from './StudentCard.module.css';

interface StudentCardProps {
  student: Student;
  attendance: Attendance | undefined;
  isSelected: boolean;
  onClick: () => void;
}

export default function StudentCard({
  student,
  attendance,
  isSelected,
  onClick,
}: StudentCardProps) {
  const durationOpts = { scheduleDetail: student.schedule_detail, sessionDurationMinutes: attendance?.session_duration_minutes };
  const timeLeft = attendance
    ? getTimeRemaining(student.subjects, attendance.check_in, durationOpts)
    : getSessionDuration(student.subjects, durationOpts);
  const isOver = attendance ? timeLeft <= 0 : false;
  const isWarn = attendance ? timeLeft <= 5 && timeLeft > 0 : false;
  const subjects = parseSubjects(student.subjects);

  const cardClass = isOver
    ? styles.cardOver
    : isWarn
      ? styles.cardWarning
      : isSelected
        ? styles.cardSelected
        : styles.cardNormal;

  return (
    <div
      className={`${styles.card} ${cardClass}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`${student.first_name} ${student.last_name}, ${timeLeft} minutes remaining${isWarn ? ', time warning' : ''}`}
    >
      <div>
        <div className={styles.top}>
          <h3 className={`${styles.name} ${isOver ? styles.nameOver : isWarn ? styles.nameWarning : ''}`}>
            {student.first_name} {student.last_name}
          </h3>
          <div className={styles.icons}>
            {attendance && (
              <span
                className={styles.timeInline}
                style={{ color: isOver ? 'var(--red)' : isWarn ? '#92400e' : 'var(--neutral)' }}
              >
                <Clock size={11} />
                {isOver ? '+' : ''}{Math.abs(timeLeft)}m
              </span>
            )}
            {attendance && (
              <SmsStatusIndicator attendance={attendance} variant="card" />
            )}
            {(isOver || isWarn) && (
              <AlertCircle
                size={14}
                color={isOver ? 'var(--red)' : '#92400e'}
                className={styles.pulse}
              />
            )}
          </div>
        </div>
        <div className={styles.levelBadges}>
          {subjects.includes('Math') && (
            <span className={styles.levelBadgeMath}>
              Math {student.current_level_math || ''}
            </span>
          )}
          {subjects.includes('Reading') && (
            <span className={styles.levelBadgeReading}>
              Reading {student.current_level_reading || ''}
            </span>
          )}
          {student.program_type === 'Kumon Connect' && (
            <span className={styles.kcBadge}>KC</span>
          )}
        </div>
      </div>
      <div className={styles.bottom}>
        <div>
          <p
            className={`${styles.timeValue} ${isOver ? styles.timeValueOver : isWarn ? styles.timeValueWarning : ''}`}
          >
            {isOver ? '+' : ''}{Math.abs(timeLeft)}
            <span className={styles.timeUnit}>m</span>
          </p>
          <p className={styles.timeLabel}>
            {isOver ? 'over time' : 'remaining'}
          </p>
        </div>
        <ChevronRight
          size={16}
          color={isOver ? 'var(--red)' : isWarn ? '#92400e' : 'var(--neutral)'}
        />
      </div>
    </div>
  );
}
