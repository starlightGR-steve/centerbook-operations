'use client';

import { Check } from 'lucide-react';
import styles from './ChecklistItem.module.css';

/**
 * 'completion' — existing behavior: `done` drives gray-filled checkbox + strikethrough
 *   (row view / detail panel semantic of "this item is checked off").
 * 'selection' — selection interface: `selected` drives accent-filled checkbox + muted
 *   unselected treatment (plan next visit semantic of "this item is added to the plan").
 */
export type ChecklistItemMode = 'completion' | 'selection';

export interface ChecklistItemProps {
  itemKey: string;
  label: string;
  /** Used in completion mode (default). Ignored in selection mode. */
  done?: boolean;
  /** Used in selection mode. Ignored in completion mode. */
  selected?: boolean;
  /** Default 'completion' — preserves behavior for existing callers. */
  mode?: ChecklistItemMode;
  onToggle: () => void;
}

export default function ChecklistItem({
  label,
  done = false,
  selected = false,
  mode = 'completion',
  onToggle,
}: ChecklistItemProps) {
  const isSelectionMode = mode === 'selection';
  const stateClass = isSelectionMode
    ? (selected ? styles.rowSelected : styles.rowUnselected)
    : (done ? styles.rowDone : '');
  const pressed = isSelectionMode ? selected : done;
  const showCheck = isSelectionMode ? selected : done;

  return (
    <button
      type="button"
      className={`${styles.row} ${stateClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={pressed}
    >
      <span className={styles.checkbox} aria-hidden="true">
        {showCheck && <Check size={16} strokeWidth={3} />}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
