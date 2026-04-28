'use client';

import { Eye, EyeOff } from 'lucide-react';
import styles from './EmptySeatsToggle.module.css';

export interface EmptySeatsToggleProps {
  isHidden: boolean;
  onToggle: () => void;
}

export default function EmptySeatsToggle({ isHidden, onToggle }: EmptySeatsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isHidden}
      aria-label={isHidden ? 'Empty seats hidden, tap to show' : 'Empty seats shown, tap to hide'}
      className={`${styles.pill} ${isHidden ? styles.hidden : styles.shown}`}
      onClick={onToggle}
    >
      {isHidden ? (
        <EyeOff size={16} aria-hidden="true" />
      ) : (
        <Eye size={16} aria-hidden="true" />
      )}
      <span className={styles.label}>
        {isHidden ? 'Hide empty seats' : 'Show empty seats'}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
