'use client';

import { Check } from 'lucide-react';
import styles from './ChecklistItem.module.css';

export interface ChecklistItemProps {
  itemKey: string;
  label: string;
  done: boolean;
  onToggle: () => void;
}

export default function ChecklistItem({ label, done, onToggle }: ChecklistItemProps) {
  return (
    <button
      type="button"
      className={`${styles.row} ${done ? styles.rowDone : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={done}
    >
      <span className={styles.checkbox} aria-hidden="true">
        {done && <Check size={16} strokeWidth={3} />}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
