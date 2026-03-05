import type { ClassroomPositionName } from '@/lib/types';
import styles from './PosBadge.module.css';

interface PosBadgeProps {
  position: ClassroomPositionName;
}

export default function PosBadge({ position }: PosBadgeProps) {
  const variant =
    position === 'Early Learners'
      ? 'el'
      : position === 'Upper Classroom'
        ? 'upper'
        : 'main';

  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {position}
    </span>
  );
}
