'use client';

import { Check, RefreshCw, Clock } from 'lucide-react';
import styles from './CardButton.module.css';

export type CardButtonVariant = 'done' | 'move' | 'time';

export interface CardButtonProps {
  variant: CardButtonVariant;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function CardButton({ variant, label, onPress, disabled }: CardButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[`btn_${variant}`]}`}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      disabled={disabled}
    >
      <span className={styles.icon} aria-hidden="true">
        {variant === 'done' && <Check size={18} strokeWidth={2.5} />}
        {variant === 'move' && <RefreshCw size={18} strokeWidth={2} />}
        {variant === 'time' && <Clock size={18} strokeWidth={2} />}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
