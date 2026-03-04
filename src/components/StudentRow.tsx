'use client';

import type { Student } from '@/lib/types';
import SubjectBadges from './SubjectBadges';
import DurationBadge from './DurationBadge';
import styles from './StudentRow.module.css';

interface StudentRowProps {
  student: Student;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  hoverBg?: string;
  hoverBorder?: string;
  showDuration?: boolean;
}

export default function StudentRow({
  student,
  onClick,
  rightElement,
  hoverBg = 'var(--secondary-ul)',
  hoverBorder = 'var(--secondary-light)',
  showDuration = false,
}: StudentRowProps) {
  return (
    <button
      className={styles.row}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.borderColor = hoverBorder;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--base)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <div className={styles.left}>
        <p className={styles.name}>
          {student.first_name} {student.last_name}
        </p>
        <div className={styles.badges}>
          <SubjectBadges subjects={student.subjects} />
          {showDuration && <DurationBadge subjects={student.subjects} />}
        </div>
      </div>
      {rightElement}
    </button>
  );
}
