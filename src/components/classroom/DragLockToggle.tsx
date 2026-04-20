'use client';

import { Lock, LockOpen } from 'lucide-react';
import styles from './DragLockToggle.module.css';

export interface DragLockToggleProps {
  isLocked: boolean;
  onToggle: () => void;
}

export default function DragLockToggle({ isLocked, onToggle }: DragLockToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isLocked}
      aria-label={isLocked ? 'Drag locked, tap to unlock' : 'Drag unlocked, tap to lock'}
      className={`${styles.pill} ${isLocked ? styles.locked : styles.unlocked}`}
      onClick={onToggle}
    >
      {isLocked ? (
        <Lock size={16} aria-hidden="true" />
      ) : (
        <LockOpen size={16} aria-hidden="true" />
      )}
      <span className={styles.label}>
        {isLocked ? 'Drag locked' : 'Drag unlocked'}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
