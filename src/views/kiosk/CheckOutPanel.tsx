'use client';

import { useState, useEffect, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import SmsStatusIndicator from '@/components/SmsStatusIndicator';
import SessionTimeAdjust from '@/components/SessionTimeAdjust';
import { useSessionAdjust } from '@/context/SessionAdjustContext';
import type { Attendance, Student } from '@/lib/types';
import { getTimeRemaining, formatTime } from '@/lib/types';
import { checkOutStudent } from '@/hooks/useAttendance';
import styles from './CheckOutPanel.module.css';

interface CheckOutPanelProps {
  attendance: Attendance[];
  students: Student[];
}

export default function CheckOutPanel({ attendance, students }: CheckOutPanelProps) {
  const { getAdjustment } = useSessionAdjust();
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

  // Sort checked-in students by last name
  const sortedAttendance = useMemo(() => {
    return [...attendance].sort((a, b) => {
      const sa = a.student || getStudent(a.student_id);
      const sb = b.student || getStudent(b.student_id);
      if (!sa || !sb) return 0;
      return sa.last_name.localeCompare(sb.last_name) || sa.first_name.localeCompare(sb.first_name);
    });
  }, [attendance, students]);

  return (
    <Card className={styles.panel}>
      <h3 className={styles.header}>
        <LogOut size={18} color="#16a34a" /> Here Now
      </h3>
      <div className={styles.list} role="list" aria-label="Students currently checked in">
        {attendance.length === 0 && (
          <EmptyState
            icon={LogOut}
            title="No students checked in yet"
            description="Check in students from the left panel"
          />
        )}
        {sortedAttendance.map((a) => {
          const student = a.student || getStudent(a.student_id);
          if (!student) return null;

          const adj = getAdjustment(a.student_id);
          const baseTimeLeft = getTimeRemaining(student.subjects, a.check_in, { scheduleDetail: student.schedule_detail, sessionDurationMinutes: a.session_duration_minutes });
          const timeLeft = baseTimeLeft + adj;
          const isWarn = timeLeft <= 5;

          return (
            <div
              key={a.id}
              className={styles.row}
            >
              <button
                className={styles.rowContent}
                onClick={() => handleCheckOut(a.student_id)}
                aria-label={`Check out ${student.first_name} ${student.last_name}, ${timeLeft} minutes remaining`}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {adj !== 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'Montserrat, sans-serif',
                        color: adj > 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {adj > 0 ? `+${adj}` : adj}
                    </span>
                  )}
                  <span
                    className={`${styles.timeLeft} ${isWarn ? styles.timeLeftWarn : ''}`}
                  >
                    {timeLeft}m
                  </span>
                </div>
              </button>
              <SessionTimeAdjust studentId={a.student_id} subjects={student.subjects} scheduleDetail={student.schedule_detail} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
