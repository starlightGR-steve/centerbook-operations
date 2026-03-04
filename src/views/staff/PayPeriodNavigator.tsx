'use client';

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import styles from './PayPeriodNavigator.module.css';

interface PayPeriodNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
}

export default function PayPeriodNavigator({
  label,
  onPrev,
  onNext,
  onCurrent,
}: PayPeriodNavigatorProps) {
  return (
    <div className={styles.nav}>
      <span className={styles.prefix}>Pay Period:</span>
      <button className={styles.arrow} onClick={onPrev} aria-label="Previous period">
        <ChevronLeft size={18} />
      </button>
      <span className={styles.label}>{label}</span>
      <button className={styles.arrow} onClick={onNext} aria-label="Next period">
        <ChevronRight size={18} />
      </button>
      <button className={styles.currentBtn} onClick={onCurrent}>
        <CalendarDays size={14} />
        Current
      </button>
    </div>
  );
}
