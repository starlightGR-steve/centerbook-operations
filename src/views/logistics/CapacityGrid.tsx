'use client';

import { useState, useEffect } from 'react';
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

// Staff count removed — staff scheduling is on a separate page

function PosBadges({ cell }: { cell: CapacityCell }) {
  if (cell.studentCount === 0) return null;
  return (
    <div className={styles.posBadges}>
      {cell.elCount > 0 && <span className={styles.posEl}>EL:{cell.elCount}</span>}
      {cell.mcCount > 0 && <span className={styles.posMc}>MC:{cell.mcCount}</span>}
      {cell.ucCount > 0 && <span className={styles.posUc}>UC:{cell.ucCount}</span>}
    </div>
  );
}

/** Get today's day name (Monday, Tuesday...) */
function getTodayName(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

export default function CapacityGrid({ data, onCellClick }: CapacityGridProps) {
  const { cells, timeSlots, days } = data;
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Default to today if it exists in the week
  useEffect(() => {
    const todayName = getTodayName();
    const idx = days.findIndex((d) => d.name === todayName);
    if (idx >= 0) setSelectedDayIdx(idx);
  }, [days]);

  /* ── Mobile: single-day card layout ── */
  if (isMobile) {
    const day = days[selectedDayIdx];
    const dayDate = day ? new Date(day.date + 'T12:00:00') : null;
    const shortDate = dayDate ? `${dayDate.getMonth() + 1}/${dayDate.getDate()}` : '';

    return (
      <div>
        {/* Day pill selector */}
        <div className={styles.dayPills}>
          {days.map((d, i) => {
            const dt = new Date(d.date + 'T12:00:00');
            const dayShort = d.name.slice(0, 3);
            const dateShort = `${dt.getMonth() + 1}/${dt.getDate()}`;
            return (
              <button
                key={d.name}
                className={`${styles.dayPill} ${i === selectedDayIdx ? styles.dayPillActive : ''}`}
                onClick={() => setSelectedDayIdx(i)}
              >
                <span className={styles.dayPillName}>{dayShort}</span>
                <span className={styles.dayPillDate}>{dateShort}</span>
              </button>
            );
          })}
        </div>

        {/* Time slot cards for selected day */}
        <div className={styles.mobileCards}>
          {cells.map((row, ri) => {
            const cell = row[selectedDayIdx];
            if (!cell) return null;
            return (
              <button
                key={timeSlots[ri].sort_key}
                className={`${styles.mobileCard} ${cell.isOpen ? styles.mobileCardOpen : styles.mobileCardClosed}`}
                onClick={cell.isOpen ? () => onCellClick(cell) : undefined}
                disabled={!cell.isOpen}
              >
                <div className={styles.mobileCardTime}>
                  {timeSlots[ri].display}
                </div>
                {cell.isOpen ? (
                  <div className={styles.mobileCardBody}>
                    <div className={styles.mobileCardRow}>
                      <StoplightBadge cell={cell} />
                    </div>
                    <CapacityBar cell={cell} />
                    <PosBadges cell={cell} />
                  </div>
                ) : (
                  <div className={styles.mobileCardBody}>
                    <span className={styles.closedLabel}>Closed</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Desktop: full table ── */
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
              {row.map((cell) => (
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
                      <div className={styles.cellTop}>
                        <StoplightBadge cell={cell} />
                      </div>
                      <CapacityBar cell={cell} />
                      <PosBadges cell={cell} />
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
