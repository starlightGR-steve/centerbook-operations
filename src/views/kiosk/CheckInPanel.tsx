'use client';

import { LogIn, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
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
        <LogIn size={18} color="var(--green)" /> Check-In
      </h3>
      <div className={styles.list}>
        {students.length === 0 && (
          <p className={styles.empty}>All students checked in.</p>
        )}
        {students.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            onClick={() => handleCheckIn(s)}
            showDuration
            rightElement={<Plus size={16} color="var(--green)" />}
          />
        ))}
      </div>
    </Card>
  );
}
