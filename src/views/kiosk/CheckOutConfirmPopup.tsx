'use client';

import { useState } from 'react';
import type { Student, Attendance } from '@/lib/types';
import { parseSubjects, getTimeRemaining, getSessionDuration, formatTime } from '@/lib/types';
import styles from './CheckOutConfirmPopup.module.css';

interface CheckOutConfirmPopupProps {
  student: Student;
  attendance: Attendance;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function CheckOutConfirmPopup({
  student,
  attendance,
  onConfirm,
  onClose,
}: CheckOutConfirmPopupProps) {
  const [confirming, setConfirming] = useState(false);
  const subjects = parseSubjects(student.subjects);

  const durationOpts = {
    scheduleDetail: student.schedule_detail,
    sessionDurationMinutes: attendance.session_duration_minutes,
  };
  const sessionMinutes = getSessionDuration(student.subjects, durationOpts);
  const remaining = getTimeRemaining(student.subjects, attendance.check_in, durationOpts);
  const isOver = remaining <= 0;
  const elapsed = Math.floor((Date.now() - new Date(attendance.check_in).getTime()) / 60000);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <h2 className={styles.studentName}>
          {student.first_name} {student.last_name}
        </h2>

        <div className={styles.badges}>
          {subjects.includes('Math') && (
            <span className={styles.badgeMath}>Math {student.current_level_math || ''}</span>
          )}
          {subjects.includes('Reading') && (
            <span className={styles.badgeReading}>Reading {student.current_level_reading || ''}</span>
          )}
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Checked in at</span>
            <span className={styles.infoValue}>{formatTime(attendance.check_in)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Time here</span>
            <span className={styles.infoValue}>{elapsed} minutes</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Session</span>
            <span className={styles.infoValue}>{sessionMinutes} minutes</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{isOver ? 'Over by' : 'Time left'}</span>
            <span className={`${styles.infoValue} ${isOver ? styles.overtime : styles.remaining}`}>
              {isOver ? `${Math.abs(remaining)} min over` : `${remaining} min left`}
            </span>
          </div>
        </div>

        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? 'Checking out...' : 'Confirm Check-Out'}
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}
