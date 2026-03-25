'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { updateAttendance } from '@/hooks/useAttendance';
import type { Attendance } from '@/lib/types';
import styles from './AttendanceEditModal.module.css';

interface AttendanceEditModalProps {
  attendance: Attendance;
  studentName: string;
  onClose: () => void;
}

/** Convert ISO datetime to local HH:mm for time input */
function toTimeValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Combine today's date with HH:mm to produce a local ISO string */
function fromTimeValue(time: string, referenceIso: string): string {
  const ref = new Date(referenceIso);
  const [h, m] = time.split(':').map(Number);
  ref.setHours(h, m, 0, 0);
  // Format as MySQL datetime for the API
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ref.getFullYear()}-${pad(ref.getMonth() + 1)}-${pad(ref.getDate())} ${pad(ref.getHours())}:${pad(ref.getMinutes())}:00`;
}

export default function AttendanceEditModal({ attendance, studentName, onClose }: AttendanceEditModalProps) {
  const [checkIn, setCheckIn] = useState(toTimeValue(attendance.check_in));
  const [checkOut, setCheckOut] = useState(
    attendance.check_out ? toTimeValue(attendance.check_out) : ''
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calcDuration = (): number | null => {
    if (!checkOut) return null;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const duration = calcDuration();

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const updates: { check_in: string; check_out?: string | null } = {
        check_in: fromTimeValue(checkIn, attendance.check_in),
      };

      if (checkOut) {
        updates.check_out = fromTimeValue(checkOut, attendance.check_out || attendance.check_in);
      } else if (attendance.check_out) {
        updates.check_out = null;
      }

      await updateAttendance(attendance.id, updates);
      onClose();
    } catch (err) {
      setErrorMsg('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Attendance" subtitle={studentName} maxWidth="360px">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Check-in Time</label>
          <input
            type="time"
            className={styles.input}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Check-out Time</label>
          <input
            type="time"
            className={styles.input}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            placeholder="Still checked in"
          />
        </div>

        {duration !== null && (
          <div className={styles.duration}>
            Duration: {duration} minutes
          </div>
        )}

        {errorMsg && (
          <p className={styles.errorMsg}>{errorMsg}</p>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
