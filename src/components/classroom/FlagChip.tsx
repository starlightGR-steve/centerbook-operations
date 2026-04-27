'use client';

import { Lightbulb, HelpCircle, Home, User } from 'lucide-react';
import styles from './FlagChip.module.css';

export type FlagChipType = 'new_concept' | 'needs_help' | 'work_amy' | 'needs_homework';
export type FlagChipVariant = 'labeled' | 'compact';

/**
 * 'completion' — existing behavior: `done` prop drives gray strikethrough treatment
 *   (the row view / detail panel semantic of "this note/flag is marked done").
 * 'selection' — selection interface: `selected` prop drives active vs. muted treatment
 *   (the plan next visit semantic of "this item is / is not added to the plan").
 */
export type FlagChipMode = 'completion' | 'selection';

export interface FlagChipProps {
  type: FlagChipType;
  /** Required when variant='labeled', ignored in 'compact'. */
  label?: string;
  /** Used in completion mode (default). Ignored in selection mode. */
  done?: boolean;
  /** Used in selection mode. Ignored in completion mode. */
  selected?: boolean;
  /** Default 'completion' — preserves behavior for existing callers. */
  mode?: FlagChipMode;
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

/** Map a flag-config key to the FlagChip type that drives its icon and color.
 *  Returns null for keys outside this set (e.g. taking_test) so callers can
 *  skip rendering. Shared by StudentDetailPanel, RowViewCard, and the
 *  CheckInPopup so the kiosk + classroom surfaces stay in lockstep. */
export function flagKeyToType(key: string): FlagChipType | null {
  switch (key) {
    case 'new_concept': return 'new_concept';
    case 'needs_help': return 'needs_help';
    case 'work_with_amy': return 'work_amy';
    case 'needs_homework': return 'needs_homework';
    default: return null;
  }
}

export default function FlagChip({
  type,
  label,
  done = false,
  selected = false,
  mode = 'completion',
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

  const isSelectionMode = mode === 'selection';
  const stateClass = isSelectionMode
    ? (selected ? '' : styles.chipUnselected)
    : (done ? styles.chipDone : '');
  const pressed = isSelectionMode ? selected : done;

  return (
    <button
      type="button"
      className={`${styles.chip} ${stateClass} ${styles[`chip_${type}`]}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      aria-pressed={pressed}
    >
      <span className={styles.circle} aria-hidden="true">
        <Icon size={15} strokeWidth={2.25} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
