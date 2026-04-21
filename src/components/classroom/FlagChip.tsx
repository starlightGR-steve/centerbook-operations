'use client';

import { Lightbulb, HelpCircle, Home, User } from 'lucide-react';
import styles from './FlagChip.module.css';

export type FlagChipType = 'new_concept' | 'needs_help' | 'work_amy' | 'needs_homework';
export type FlagChipVariant = 'labeled' | 'compact';

export interface FlagChipProps {
  type: FlagChipType;
  /** Required when variant='labeled', ignored in 'compact'. */
  label?: string;
  /** Ignored in 'compact'. */
  done?: boolean;
  /** Ignored in 'compact' (Whole Class chips are read-only). */
  onToggle?: () => void;
  variant?: FlagChipVariant;
}

const ICON_MAP: Record<FlagChipType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  new_concept: Lightbulb,
  needs_help: HelpCircle,
  work_amy: User,
  needs_homework: Home,
};

export default function FlagChip({
  type,
  label,
  done = false,
  onToggle,
  variant = 'labeled',
}: FlagChipProps) {
  const Icon = ICON_MAP[type];

  if (variant === 'compact') {
    return (
      <span
        className={`${styles.compactWrap} ${styles[`chip_${type}`]}`}
        aria-label={label || type}
      >
        <span className={styles.circle} aria-hidden="true">
          <Icon size={14} strokeWidth={2.25} />
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.chip} ${done ? styles.chipDone : ''} ${styles[`chip_${type}`]}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      aria-pressed={done}
    >
      <span className={styles.circle} aria-hidden="true">
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
