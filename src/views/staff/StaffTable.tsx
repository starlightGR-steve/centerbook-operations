'use client';

import { Edit2 } from 'lucide-react';
import type { Staff, TimeEntry } from '@/lib/types';
import { formatTime } from '@/lib/types';
import styles from './StaffTable.module.css';

function getStaffName(s: Staff): string {
  if (s.full_name) return s.full_name;
  if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
  return s.first_name || s.last_name || 'Unnamed';
}

interface StaffTableProps {
  staff: Staff[];
  timeEntries: TimeEntry[];
  clockedInIds: Set<number>;
  periodStart: string;
  periodEnd: string;
  onSelect: (staff: Staff) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPeriodHours(
  entries: TimeEntry[],
  staffId: number,
  periodStart: string,
  periodEnd: string
): number {
  return (
    entries
      .filter(
        (e) =>
          e.staff_id === staffId &&
          e.clock_in >= periodStart &&
          e.clock_in <= periodEnd + 'T23:59:59' &&
          e.duration_minutes != null
      )
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60
  );
}

function getLastEntry(entries: TimeEntry[], staffId: number): string {
  const staffEntries = entries
    .filter((e) => e.staff_id === staffId)
    .sort((a, b) => b.clock_in.localeCompare(a.clock_in));
  if (staffEntries.length === 0) return '—';

  const entry = staffEntries[0];
  const ts = entry.clock_out || entry.clock_in;
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today ${formatTime(ts)}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${formatTime(ts)}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + formatTime(ts);
}

export default function StaffTable({
  staff,
  timeEntries,
  clockedInIds,
  periodStart,
  periodEnd,
  onSelect,
}: StaffTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="Staff members">
        <thead>
          <tr>
            <th className={styles.th}>Employee</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Status</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Last Entry</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Hours (Period)</th>
            <th className={`${styles.th} ${styles.thRight}`}></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s, i) => {
            const isClockedIn = clockedInIds.has(s.id);
            const hours = getPeriodHours(timeEntries, s.id, periodStart, periodEnd);
            const lastEntry = getLastEntry(timeEntries, s.id);
            return (
              <tr
                key={s.id}
                className={`${styles.row} ${i % 2 === 0 ? styles.rowEven : styles.rowOdd}`}
                onClick={() => onSelect(s)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s); } }}
                tabIndex={0}
                role="button"
                aria-label={`${getStaffName(s)}, ${s.role}, ${isClockedIn ? 'Active' : 'Inactive'}, ${hours.toFixed(1)} hours`}
              >
                <td className={styles.cell}>
                  <div className={styles.employee}>
                    <div className={styles.avatar}>{getInitials(getStaffName(s))}</div>
                    <div>
                      <div className={styles.name}>{getStaffName(s)}</div>
                      <div className={styles.role}>{s.role}</div>
                    </div>
                  </div>
                </td>
                <td className={`${styles.cell} ${styles.cellCenter}`}>
                  <span className={isClockedIn ? styles.statusActive : styles.statusInactive}>
                    {isClockedIn ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={`${styles.cell} ${styles.cellCenter}`}>
                  <span className={styles.lastEntry}>{lastEntry}</span>
                </td>
                <td className={`${styles.cell} ${styles.cellCenter}`}>
                  <span className={styles.hours}>{hours.toFixed(1)}</span>
                  <span className={styles.hoursUnit}> hrs</span>
                </td>
                <td className={`${styles.cell} ${styles.cellRight}`}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(s);
                    }}
                    aria-label="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { getPeriodHours };
