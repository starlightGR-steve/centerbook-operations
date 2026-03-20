'use client';

import { CalendarClock } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import styles from './StaffSchedulePage.module.css';

export default function StaffSchedulePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Manage Your"
          title="Staff Schedule"
          subtitle="Shift-based scheduling for center staff"
        />
      </div>

      <div className={styles.content}>
        <div className={styles.placeholder}>
          <CalendarClock size={48} className={styles.placeholderIcon} />
          <h3 className={styles.placeholderTitle}>Staff Scheduling Coming Soon</h3>
          <p className={styles.placeholderText}>
            Staff scheduling is being redesigned for shift-based scheduling
            (e.g., 3:00–7:00 PM coverage blocks) instead of 30-minute slot assignments.
            This feature is coming in Phase 2.
          </p>
          <p className={styles.placeholderNote}>
            In the meantime, staff shifts are managed directly in the
            Staff page and the Live Class teacher-to-row assignments.
          </p>
        </div>
      </div>
    </div>
  );
}
