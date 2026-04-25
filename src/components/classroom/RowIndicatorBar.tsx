'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { RowSummary } from './SwipeShell';
import styles from './RowIndicatorBar.module.css';

export interface RowIndicatorBarProps {
  rows: RowSummary[];
  currentIndex: number;
  onChange: (newIndex: number) => void;
  /** 86ah3f3xp Finding 2B: Assign Student affordance lives on the swipe bar
   *  for the current row. Tapping opens the picker. Grayed when no open seats. */
  onAssign?: () => void;
  allSeatsFull?: boolean;
}

export default function RowIndicatorBar({
  rows,
  currentIndex,
  onChange,
  onAssign,
  allSeatsFull,
}: RowIndicatorBarProps) {
  const total = rows.length;
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= total - 1;

  return (
    <div className={styles.bar}>
      {onAssign && (
        <button
          type="button"
          className={`${styles.assignBtn} ${allSeatsFull ? styles.assignBtnDisabled : ''}`}
          onClick={onAssign}
          disabled={!!allSeatsFull}
          aria-label={allSeatsFull ? 'All seats full' : 'Assign student to this row'}
        >
          <Plus size={16} aria-hidden="true" />
          <span>{allSeatsFull ? 'All seats full' : 'Assign Student'}</span>
        </button>
      )}

      <button
        type="button"
        className={styles.navBtn}
        disabled={isFirst}
        onClick={() => onChange(currentIndex - 1)}
        aria-label="Previous row"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <div
        className={styles.dots}
        role="tablist"
        aria-label="Row navigation"
      >
        {rows.map((row, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-current={isActive ? 'true' : undefined}
              aria-selected={isActive}
              aria-label={`Row ${idx + 1} of ${total}: ${row.section} ${row.label}`}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.dot} ${isActive ? styles.dotActive : ''}`}
              onClick={() => onChange(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(idx);
                }
              }}
            />
          );
        })}
      </div>

      <button
        type="button"
        className={styles.navBtn}
        disabled={isLast}
        onClick={() => onChange(currentIndex + 1)}
        aria-label="Next row"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
