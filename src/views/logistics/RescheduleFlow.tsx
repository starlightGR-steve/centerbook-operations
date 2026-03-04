'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SubjectBadges from '@/components/SubjectBadges';
import DurationBadge from '@/components/DurationBadge';
import { useCenterSettings } from '@/hooks/useCenterSettings';
import { createOverride } from '@/hooks/useScheduleOverrides';
import type { Student, CapacityCell } from '@/lib/types';
import { formatTimeSortKey } from '@/lib/types';
import styles from './RescheduleFlow.module.css';

interface RescheduleFlowProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  fromCell: CapacityCell;
}

export default function RescheduleFlow({
  open,
  onClose,
  student,
  fromCell,
}: RescheduleFlowProps) {
  const { data: settings } = useCenterSettings();
  const [newDay, setNewDay] = useState(fromCell.day);
  const [newTime, setNewTime] = useState(fromCell.timeSortKey);
  const [reason, setReason] = useState('');

  const timeSlots = settings?.time_slots || [];
  const days = settings?.operating_days || [];

  async function handleMove() {
    await createOverride({
      student_id: student.id,
      override_type: 'move',
      original_day: fromCell.day,
      original_time: fromCell.timeSortKey,
      new_day: newDay,
      new_time: newTime,
      effective_date: fromCell.date,
      reason: reason || null,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Reschedule Student" maxWidth="400px">
      <div className={styles.form}>
        <div className={styles.studentInfo}>
          <span className={styles.name}>{student.first_name} {student.last_name}</span>
          <div className={styles.meta}>
            <SubjectBadges subjects={student.subjects} />
            <DurationBadge subjects={student.subjects} />
          </div>
          <p className={styles.current}>
            Currently: {fromCell.day} at {fromCell.timeDisplay}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Move to</label>
          <div className={styles.row}>
            <select
              className={styles.select}
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className={styles.select}
              value={newTime}
              onChange={(e) => setNewTime(Number(e.target.value))}
            >
              {timeSlots.map((s) => (
                <option key={s.sort_key} value={s.sort_key}>{s.display}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Reason (optional)</label>
          <input
            type="text"
            className={styles.input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Makeup class, schedule conflict..."
          />
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={handleMove}>
            Move to {newDay} {formatTimeSortKey(newTime)}
          </Button>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
