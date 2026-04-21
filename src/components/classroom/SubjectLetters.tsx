'use client';

import styles from './SubjectLetters.module.css';

export interface SubjectLettersProps {
  math: boolean;
  reading: boolean;
}

export default function SubjectLetters({ math, reading }: SubjectLettersProps) {
  if (!math && !reading) return null;
  return (
    <span className={styles.row} aria-label={[math ? 'Math' : null, reading ? 'Reading' : null].filter(Boolean).join(', ')}>
      {math && <span className={styles.math}>M</span>}
      {reading && <span className={styles.reading}>R</span>}
    </span>
  );
}
