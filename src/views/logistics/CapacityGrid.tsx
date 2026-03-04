'use client';

import type { CapacityGridData, CapacityCell } from '@/lib/types';
import styles from './CapacityGrid.module.css';

interface CapacityGridProps {
  data: CapacityGridData;
  onCellClick: (cell: CapacityCell) => void;
}

function StoplightBadge({ cell }: { cell: CapacityCell }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${cell.stoplightColor}`]}`}>
      {cell.studentCount} stu
    </span>
  );
}

function CapacityBar({ cell }: { cell: CapacityCell }) {
  const fill = Math.min(100, cell.utilization);
  return (
    <div className={styles.bar}>
      <div
        className={`${styles.barFill} ${styles[`barFill_${cell.stoplightColor}`]}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

function StaffCount({ cell }: { cell: CapacityCell }) {
  return (
    <span
      className={`${styles.staffCount} ${cell.isUnderstaffed ? styles.staffUnderstaffed : ''}`}
    >
      {cell.staffAssigned}/{cell.staffRecommended} staff
    </span>
  );
}

export default function CapacityGrid({ data, onCellClick }: CapacityGridProps) {
  const { cells, timeSlots, days } = data;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} role="grid" aria-label="Center capacity by time slot and day">
        <thead>
          <tr role="row">
            <th className={styles.th} scope="col">Time Slot</th>
            {days.map(({ name, date }) => {
              const d = new Date(date + 'T12:00:00');
              const short = `${d.getMonth() + 1}/${d.getDate()}`;
              return (
                <th key={name} className={styles.th} scope="col">
                  {name}
                  <span className={styles.thDate}>{short}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, ri) => (
            <tr key={timeSlots[ri].sort_key} className={ri % 2 === 0 ? styles.rowEven : styles.rowOdd}>
              <td className={styles.timeCell}>{timeSlots[ri].display}</td>
              {row.map((cell, ci) => (
                <td
                  key={`${cell.day}-${cell.timeSortKey}`}
                  className={`${styles.cell} ${cell.isOpen ? styles.cellOpen : styles.cellClosed}`}
                  onClick={cell.isOpen ? () => onCellClick(cell) : undefined}
                  onKeyDown={cell.isOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(cell); } } : undefined}
                  tabIndex={cell.isOpen ? 0 : undefined}
                  role="gridcell"
                  aria-label={cell.isOpen ? `${cell.day} ${cell.timeDisplay}: ${cell.studentCount} students, ${Math.round(cell.utilization)}% capacity` : `${cell.day} ${cell.timeDisplay}: Closed`}
                >
                  {cell.isOpen ? (
                    <>
                      <StoplightBadge cell={cell} />
                      <StaffCount cell={cell} />
                      <CapacityBar cell={cell} />
                    </>
                  ) : (
                    <span className={styles.closedLabel}>Closed</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
