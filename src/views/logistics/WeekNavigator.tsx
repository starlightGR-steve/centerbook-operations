'use client';

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import styles from './WeekNavigator.module.css';

interface WeekNavigatorProps {
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function WeekNavigator({
  weekLabel,
  onPrev,
  onNext,
  onToday,
}: WeekNavigatorProps) {
  return (
    <div className={styles.nav}>
      <button className={styles.arrow} onClick={onPrev} aria-label="Previous week">
        <ChevronLeft size={18} />
      </button>
      <span className={styles.label}>{weekLabel}</span>
      <button className={styles.arrow} onClick={onNext} aria-label="Next week">
        <ChevronRight size={18} />
      </button>
      <button className={styles.todayBtn} onClick={onToday}>
        <CalendarDays size={14} />
        Today
      </button>
    </div>
  );
}
