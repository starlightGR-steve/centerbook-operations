'use client';

import { Clock } from 'lucide-react';
import type { Staff, TimeEntry } from '@/lib/types';
import { clockInStaff, clockOutStaff } from '@/hooks/useTimeclock';
import styles from './TimeclockPanel.module.css';

interface TimeclockPanelProps {
  staff: Staff[];
  timeEntries: TimeEntry[];
}

export default function TimeclockPanel({ staff, timeEntries }: TimeclockPanelProps) {
  const isClockedIn = (staffId: number) =>
    timeEntries.some((e) => e.staff_id === staffId && e.clock_out === null);

  const handleToggle = async (staffMember: Staff) => {
    if (isClockedIn(staffMember.id)) {
      await clockOutStaff({ staff_id: staffMember.id });
    } else {
      await clockInStaff({ staff_id: staffMember.id, source: 'kiosk' });
    }
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.header}>
        <Clock size={18} color="var(--white)" /> Staff Timeclock
      </h3>
      <div className={styles.list}>
        {staff.map((s) => {
          const clockedIn = isClockedIn(s.id);
          return (
            <div
              key={s.id}
              className={`${styles.row} ${clockedIn ? styles.rowClockedIn : styles.rowClockedOut}`}
            >
              <div>
                <p className={styles.staffName}>{s.full_name}</p>
                <p className={styles.staffRole}>{s.role}</p>
              </div>
              <button
                className={`${styles.clockBtn} ${clockedIn ? styles.clockBtnOut : styles.clockBtnIn}`}
                onClick={() => handleToggle(s)}
              >
                {clockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
