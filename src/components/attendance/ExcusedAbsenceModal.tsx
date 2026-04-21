'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { createAbsence } from '@/hooks/useAbsences';
import { getCenterToday } from '@/lib/dates';
import type { AbsenceReason } from '@/lib/types';
import styles from './ExcusedAbsenceModal.module.css';

interface ExcusedAbsenceModalProps {
  student: { id: number; first_name: string; last_name: string };
  onClose: () => void;
  onSave: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// TODO: These should come from center settings in the future
const TIME_SLOTS: Record<string, string[]> = {
  Monday: ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30'],
  Tuesday: ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30'],
  Wednesday: ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30'],
  Thursday: ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30'],
};

export default function ExcusedAbsenceModal({ student, onClose, onSave }: ExcusedAbsenceModalProps) {
  const { data: session } = useSession();

  const [reason, setReason] = useState<AbsenceReason>('sick');
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');
  const [makeupOption, setMakeupOption] = useState<'none' | 'schedule'>('none');
  const [makeupDay, setMakeupDay] = useState<string | null>(null);
  const [makeupTime, setMakeupTime] = useState<string | null>(null);
  const [makeupCustomDate, setMakeupCustomDate] = useState('');
  const [homeworkOut, setHomeworkOut] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayDisplay = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const todayDayIndex = today.getDay();

  const vacationDays = useMemo(() => {
    if (reason !== 'vacation' || !vacationStart || !vacationEnd) return 0;
    let count = 0;
    const start = new Date(vacationStart + 'T12:00:00');
    const end = new Date(vacationEnd + 'T12:00:00');
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      if (day >= 1 && day <= 4) count++; // Mon-Thu
      d.setDate(d.getDate() + 1);
    }
    return count;
  }, [reason, vacationStart, vacationEnd]);

  /* Build this week's Mon-Thu pill data */
  const weekDays = useMemo(() => {
    const result: { index: number; abbrev: string; fullName: string; dateStr: string; isPast: boolean; isToday: boolean }[] = [];
    for (let dayOfWeek = 1; dayOfWeek <= 4; dayOfWeek++) {
      const diff = dayOfWeek - todayDayIndex;
      const d = new Date(today);
      d.setDate(d.getDate() + diff);
      result.push({
        index: dayOfWeek,
        abbrev: DAY_ABBREVS[dayOfWeek],
        fullName: DAY_NAMES[dayOfWeek],
        dateStr: d.toISOString().split('T')[0],
        isPast: dayOfWeek < todayDayIndex,
        isToday: dayOfWeek === todayDayIndex,
      });
    }
    return result;
  }, [todayDayIndex]);

  /* Determine which time slots to show */
  const activeTimeSlots = useMemo(() => {
    if (makeupCustomDate) {
      const customDay = new Date(makeupCustomDate + 'T12:00:00');
      const dayName = DAY_NAMES[customDay.getDay()];
      return TIME_SLOTS[dayName] || [];
    }
    if (makeupDay) {
      const found = weekDays.find((wd) => wd.abbrev === makeupDay);
      if (found) return TIME_SLOTS[found.fullName] || [];
    }
    return [];
  }, [makeupDay, makeupCustomDate, weekDays]);

  const handleSave = async () => {
    setSaving(true);
    const staffId = Number((session?.user as { id?: string })?.id) || null;
    const todayStr = getCenterToday();

    try {
      if (reason === 'vacation' && vacationStart && vacationEnd) {
        const start = new Date(vacationStart + 'T12:00:00');
        const end = new Date(vacationEnd + 'T12:00:00');
        const d = new Date(start);
        while (d <= end) {
          const day = d.getDay();
          if (day >= 1 && day <= 4) {
            await createAbsence({
              student_id: student.id,
              absence_date: d.toISOString().split('T')[0],
              reason: 'vacation',
              vacation_start: vacationStart,
              vacation_end: vacationEnd,
              makeup_scheduled: makeupOption === 'schedule' && !!makeupDay && !!makeupTime,
              makeup_date: makeupOption === 'schedule' ? (makeupCustomDate || makeupDay) : null,
              makeup_time: makeupOption === 'schedule' ? makeupTime : null,
              homework_out: homeworkOut,
              notes: notes.trim() || null,
              created_by: staffId,
            });
          }
          d.setDate(d.getDate() + 1);
        }
      } else {
        await createAbsence({
          student_id: student.id,
          absence_date: todayStr,
          reason,
          makeup_scheduled: makeupOption === 'schedule' && !!makeupDay && !!makeupTime,
          makeup_date: makeupOption === 'schedule' ? (makeupCustomDate || makeupDay) : null,
          makeup_time: makeupOption === 'schedule' ? makeupTime : null,
          homework_out: homeworkOut,
          notes: notes.trim() || null,
          created_by: staffId,
        });
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDaySelect = (abbrev: string) => {
    setMakeupCustomDate('');
    setMakeupTime(null);
    setMakeupDay(abbrev === makeupDay ? null : abbrev);
  };

  const handleCustomDateChange = (val: string) => {
    setMakeupCustomDate(val);
    setMakeupDay(null);
    setMakeupTime(null);
  };

  const subtitle = `${student.first_name} ${student.last_name} \u2022 ${todayDisplay}`;

  return (
    <Modal open={true} onClose={onClose} title="Mark Excused" subtitle={subtitle} maxWidth="26rem">
      <div className={styles.form}>
        {/* Reason */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="absence-reason">Reason</label>
          <select
            id="absence-reason"
            className={styles.select}
            value={reason}
            onChange={(e) => setReason(e.target.value as AbsenceReason)}
          >
            <option value="sick">Sick</option>
            <option value="vacation">Vacation</option>
            <option value="family">Family</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Vacation date range */}
        {reason === 'vacation' && (
          <div className={styles.vacationCard}>
            <label className={styles.label}>Vacation dates</label>
            <div className={styles.dateRange}>
              <input
                type="date"
                className={styles.dateInput}
                value={vacationStart}
                onChange={(e) => setVacationStart(e.target.value)}
              />
              <ArrowRight size={18} className={styles.arrowIcon} />
              <input
                type="date"
                className={styles.dateInput}
                value={vacationEnd}
                onChange={(e) => setVacationEnd(e.target.value)}
              />
            </div>
            {vacationDays > 0 && (
              <p className={styles.vacationSummary}>
                {vacationDays} center day{vacationDays !== 1 ? 's' : ''} excused (Mon&ndash;Thu)
              </p>
            )}
          </div>
        )}

        {/* Makeup day section */}
        <div className={styles.field}>
          <label className={styles.label}>Makeup day</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="makeupOption"
                value="none"
                checked={makeupOption === 'none'}
                onChange={() => setMakeupOption('none')}
              />
              No makeup needed
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="makeupOption"
                value="schedule"
                checked={makeupOption === 'schedule'}
                onChange={() => setMakeupOption('schedule')}
              />
              Schedule makeup day
            </label>
          </div>

          <div className={makeupOption === 'none' ? styles.dimmed : undefined}>
            {/* Day pills */}
            <div className={styles.dayPills}>
              {weekDays.map((wd) => (
                <button
                  key={wd.index}
                  type="button"
                  className={`${styles.dayPill} ${makeupDay === wd.abbrev ? styles.dayPillSelected : ''} ${wd.isPast ? styles.dayPillPast : ''}`}
                  disabled={wd.isPast}
                  onClick={() => handleDaySelect(wd.abbrev)}
                >
                  <span className={styles.dayPillAbbrev}>{wd.abbrev}</span>
                  {wd.isPast && <span className={styles.dayPillLabel}>Past</span>}
                  {wd.isToday && <span className={styles.dayPillLabel}>Today</span>}
                </button>
              ))}
            </div>

            {/* Custom date picker */}
            <div className={styles.customDateRow}>
              <span className={styles.customDateText}>Or pick a specific date...</span>
              <input
                type="date"
                className={styles.dateInput}
                value={makeupCustomDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
              />
            </div>

            {/* Time slot chips */}
            {(makeupDay || makeupCustomDate) && activeTimeSlots.length > 0 && (
              <div className={styles.timeSlotCard}>
                <label className={styles.label}>Time slot</label>
                <div className={styles.timeSlots}>
                  {activeTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`${styles.timeChip} ${makeupTime === slot ? styles.timeChipSelected : ''}`}
                      onClick={() => setMakeupTime(slot === makeupTime ? null : slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Homework checkbox */}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={homeworkOut}
              onChange={(e) => setHomeworkOut(e.target.checked)}
              className={styles.checkbox}
            />
            Homework put out for pickup
          </label>
        </div>

        {/* Notes */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="absence-notes">Notes (optional)</label>
          <textarea
            id="absence-notes"
            className={styles.textarea}
            placeholder="e.g., Mom called, flu this week..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Mark Excused'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
