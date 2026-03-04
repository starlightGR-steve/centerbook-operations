'use client';

import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import Card from '@/components/ui/Card';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import type { Attendance, Student } from '@/lib/types';
import { getTimeRemaining, formatTime } from '@/lib/types';
import { checkOutStudent } from '@/hooks/useAttendance';
import styles from './CheckOutPanel.module.css';

interface CheckOutPanelProps {
  attendance: Attendance[];
  students: Student[];
}

export default function CheckOutPanel({ attendance, students }: CheckOutPanelProps) {
  const [, setTick] = useState(0);

  // Force re-render every 15s to update time remaining
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const handleCheckOut = async (studentId: number) => {
    await checkOutStudent({ student_id: studentId });
  };

  const getStudent = (id: number) => students.find((s) => s.id === id);

  return (
    <Card className={styles.panel}>
      <h3 className={styles.header}>
        <LogOut size={18} color="var(--accent)" /> Check-Out
      </h3>
      <div className={styles.list}>
        {attendance.length === 0 && (
          <p className={styles.empty}>No students checked in.</p>
        )}
        {attendance.map((a) => {
          const student = a.student || getStudent(a.student_id);
          if (!student) return null;

          const timeLeft = getTimeRemaining(student.subjects, a.check_in);
          const isWarn = timeLeft <= 5;

          return (
            <button
              key={a.id}
              className={styles.row}
              onClick={() => handleCheckOut(a.student_id)}
            >
              <div>
                <p className={styles.name}>
                  {student.first_name} {student.last_name}
                </p>
                <p className={styles.arrival}>
                  Arrived {formatTime(a.check_in)}
                </p>
                <SmsStatusIndicator attendance={a} variant="row" />
              </div>
              <span
                className={`${styles.timeLeft} ${isWarn ? styles.timeLeftWarn : ''}`}
              >
                {timeLeft}m
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
