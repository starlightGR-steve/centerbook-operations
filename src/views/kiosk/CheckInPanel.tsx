'use client';

import { LogIn, Plus, UserCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import StudentRow from '@/components/StudentRow';
import type { Student } from '@/lib/types';
import { getSessionDuration } from '@/lib/types';
import { checkInStudent } from '@/hooks/useAttendance';
import styles from './CheckInPanel.module.css';

interface CheckInPanelProps {
  students: Student[];
}

export default function CheckInPanel({ students }: CheckInPanelProps) {
  const handleCheckIn = async (student: Student) => {
    await checkInStudent({
      student_id: student.id,
      source: 'kiosk',
      checked_in_by: 'kiosk',
      session_duration_minutes: getSessionDuration(student.subjects),
    });
  };

  return (
    <Card className={styles.panel}>
      <h3 className={styles.header}>
        <LogIn size={18} color="var(--green)" /> Expected Students
      </h3>
      <div className={styles.list} role="list" aria-label="Students awaiting check-in">
        {students.length === 0 && (
          <EmptyState
            icon={UserCheck}
            title="All students checked in"
            description="Students scheduled for today will appear when they're ready"
          />
        )}
        {students.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            onClick={() => handleCheckIn(s)}
            showDuration
            showScheduledTime
            rightElement={<Plus size={16} color="var(--green)" />}
          />
        ))}
      </div>
    </Card>
  );
}
