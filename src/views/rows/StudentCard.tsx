'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import SubjectBadges from '@/components/SubjectBadges';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Student, Attendance } from '@/lib/types';
import { getTimeRemaining, getSessionDuration } from '@/lib/types';
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
  const timeLeft = attendance
    ? getTimeRemaining(student.subjects, attendance.check_in)
    : getSessionDuration(student.subjects);
  const isWarn = attendance ? timeLeft <= 5 && timeLeft >= 0 : false;

  const cardClass = isWarn
    ? styles.cardWarning
    : isSelected
      ? styles.cardSelected
      : styles.cardNormal;

  return (
    <div className={`${styles.card} ${cardClass}`} onClick={onClick}>
      <div>
        <div className={styles.top}>
          <div className={styles.badges}>
            <SubjectBadges subjects={student.subjects} />
          </div>
          <div className={styles.icons}>
            {attendance && (
              <SmsStatusIndicator attendance={attendance} variant="card" />
            )}
            {isWarn && (
              <AlertCircle
                size={16}
                color="var(--red)"
                className={styles.pulse}
              />
            )}
          </div>
        </div>
        <h3 className={`${styles.name} ${isWarn ? styles.nameWarning : ''}`}>
          {student.first_name} {student.last_name}
        </h3>
        <p className={styles.durationLabel}>
          {getSessionDuration(student.subjects)} min session
        </p>
      </div>
      <div className={styles.bottom}>
        <div>
          <p
            className={`${styles.timeValue} ${isWarn ? styles.timeValueWarning : ''}`}
          >
            {timeLeft}
            <span className={styles.timeUnit}>m</span>
          </p>
          <p className={styles.timeLabel}>remaining</p>
        </div>
        <ChevronRight
          size={16}
          color={isWarn ? 'var(--red)' : 'var(--neutral)'}
        />
      </div>
    </div>
  );
}
