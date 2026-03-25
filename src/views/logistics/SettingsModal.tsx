'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useCenterSettings, updateCenterSettings } from '@/hooks/useCenterSettings';
import { generateTimeSlots } from '@/lib/types';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeOptions(): { value: number; label: string }[] {
  const opts: { value: number; label: string }[] = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m > 0) break;
      const key = h * 100 + m;
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      opts.push({ value: key, label: `${h12}:${String(m).padStart(2, '0')} ${ampm}` });
    }
  }
  return opts;
}

const TIME_OPTIONS = timeOptions();

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { data: settings, mutate } = useCenterSettings();
  const [capacity, setCapacity] = useState(8);
  const [ratio, setRatio] = useState(3);
  const [operatingDays, setOperatingDays] = useState<string[]>([]);
  const [dayHours, setDayHours] = useState<Record<string, { start: number; end: number }>>({});

  useEffect(() => {
    if (settings) {
      setCapacity(settings.center_capacity);
      setRatio(settings.staff_student_ratio);
      setOperatingDays(settings.operating_days);
      // Reconstruct day hours from time_slots
      const hours: Record<string, { start: number; end: number }> = {};
      for (const day of settings.operating_days) {
        const daySlots = settings.time_slots
          .filter((s) => s.open_days.includes(day))
          .map((s) => s.sort_key);
        if (daySlots.length > 0) {
          const start = Math.min(...daySlots);
          const maxKey = Math.max(...daySlots);
          // End is 15 min after the last slot
          const mEnd = (maxKey % 100) + 15;
          const end = mEnd >= 60 ? (Math.floor(maxKey / 100) + 1) * 100 + (mEnd - 60) : maxKey + 15;
          hours[day] = { start, end };
        }
      }
      setDayHours(hours);
    }
  }, [settings]);

  function toggleDay(day: string) {
    setOperatingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    if (!dayHours[day]) {
      setDayHours((prev) => ({ ...prev, [day]: { start: 1500, end: 1800 } }));
    }
  }

  function setDayStart(day: string, val: number) {
    setDayHours((prev) => ({ ...prev, [day]: { ...prev[day], start: val } }));
  }

  function setDayEnd(day: string, val: number) {
    setDayHours((prev) => ({ ...prev, [day]: { ...prev[day], end: val } }));
  }

  async function handleSave() {
    const activeDayHours: Record<string, { start: number; end: number }> = {};
    for (const day of operatingDays) {
      if (dayHours[day]) {
        activeDayHours[day] = dayHours[day];
      }
    }

    await updateCenterSettings({
      center_capacity: capacity,
      staff_student_ratio: ratio,
      operating_days: operatingDays,
      time_slots: generateTimeSlots(activeDayHours),
    });
    mutate();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Center Settings" maxWidth="460px">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Total Classroom Seats</label>
          <input
            type="number"
            className={styles.input}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
          />
          <p className={styles.helper}>
            The maximum number of students that can be in the center at once
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Students per Staff Member</label>
          <input
            type="number"
            className={styles.input}
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            min={1}
          />
          <p className={styles.helper}>
            Used to calculate recommended staffing levels (1:{ratio} ratio)
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Operating Days</label>
          <div className={styles.dayChecks}>
            {ALL_DAYS.map((day) => (
              <label key={day} className={styles.dayCheck}>
                <input
                  type="checkbox"
                  checked={operatingDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Operating Hours</label>
          <div className={styles.hoursRows}>
            {operatingDays.map((day) => (
              <div key={day} className={styles.hoursRow}>
                <span className={styles.dayName}>{day}</span>
                <select
                  className={styles.select}
                  value={dayHours[day]?.start || 1500}
                  onChange={(e) => setDayStart(day, Number(e.target.value))}
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className={styles.to}>to</span>
                <select
                  className={styles.select}
                  value={dayHours[day]?.end || 1800}
                  onChange={(e) => setDayEnd(day, Number(e.target.value))}
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={handleSave} style={{ width: '100%' }}>
          Save Settings
        </Button>
      </div>
    </Modal>
  );
}
