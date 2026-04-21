'use client';

import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import ClockDisplay from '@/components/ClockDisplay';
import type { Staff } from '@/lib/types';
import type { RowSummary } from './SwipeShell';
import styles from './RowMetaBar.module.css';

export interface RowMetaBarProps {
  currentRow: RowSummary;
  backHref: string;
  staff: Staff[];
  currentTeacherId: number;
  clockedInIds?: Set<number>;
  onTeacherChange: (teacherId: number | null) => void | Promise<void>;
}

function staffLabel(s: Staff): string {
  const first = s.first_name ?? '';
  const last = s.last_name ?? '';
  if (first && last) return `${first} ${last}`;
  return s.full_name || 'Staff';
}

export default function RowMetaBar({
  currentRow,
  backHref,
  staff,
  currentTeacherId,
  clockedInIds,
  onTeacherChange,
}: RowMetaBarProps) {
  return (
    <header className={styles.bar}>
      <Link href={backHref} className={styles.backLink}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>All Rows</span>
      </Link>

      <span className={styles.divider} aria-hidden="true" />

      <div className={styles.metaGroup}>
        <Users size={20} className={styles.peopleIcon} aria-hidden="true" />
        <span className={styles.sectionBadge}>{currentRow.section}</span>
        <h2 className={styles.rowTitle}>{currentRow.label}</h2>
        <span className={styles.seatCount}>
          {currentRow.seats} {currentRow.seats === 1 ? 'seat' : 'seats'}
        </span>
      </div>

      {staff.length > 0 && (
        <select
          className={styles.teacherSelect}
          value={currentTeacherId}
          onChange={(e) => {
            const v = Number(e.target.value);
            onTeacherChange(v === 0 ? null : v);
          }}
          aria-label={`Teacher for ${currentRow.label}`}
        >
          <option value={0}>Assign teacher...</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {staffLabel(s)}
              {clockedInIds?.has(s.id) ? ' \u25CF' : ''}
            </option>
          ))}
        </select>
      )}

      <span className={styles.clockSlot}>
        <ClockDisplay size="sm" />
      </span>
    </header>
  );
}
