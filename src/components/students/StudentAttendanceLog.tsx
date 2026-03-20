'use client';

import { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { MOCK_ATTENDANCE, MOCK_ABSENCES } from '@/lib/mock-data';
import { useDemoMode } from '@/context/MockDataContext';
import { formatTime } from '@/lib/types';
import type { Attendance, Absence } from '@/lib/types';
import styles from './StudentAttendanceLog.module.css';

interface StudentAttendanceLogProps {
  studentId: number;
  scheduleDays?: string[]; // e.g., ['Monday', 'Thursday']
}

type DateRange = 'last30' | 'last3months' | 'thisYear' | 'allTime' | 'custom';

type LogEntry =
  | { type: 'present'; date: string; checkIn: string; checkOut: string | null; durationMinutes: number | null }
  | { type: 'excused'; date: string; reason: string }
  | { type: 'missed'; date: string };

function getScheduledDatesInRange(from: string, to: string, scheduleDays: string[]): string[] {
  const dates: string[] = [];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const start = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  const d = new Date(start);
  while (d <= end) {
    if (scheduleDays.includes(DAY_NAMES[d.getDay()])) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function StudentAttendanceLog({ studentId, scheduleDays = [] }: StudentAttendanceLogProps) {
  const { isDemoMode } = useDemoMode();
  const [dateRange, setDateRange] = useState<DateRange>('last3months');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Calculate date boundaries
  const { from, to } = useMemo(() => {
    const today = new Date();
    const todayStr = toISODate(today);
    switch (dateRange) {
      case 'last30': {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return { from: toISODate(d), to: todayStr };
      }
      case 'last3months': {
        const d = new Date(today);
        d.setDate(d.getDate() - 90);
        return { from: toISODate(d), to: todayStr };
      }
      case 'thisYear':
        return { from: `${today.getFullYear()}-01-01`, to: todayStr };
      case 'allTime':
        return { from: '2020-01-01', to: todayStr };
      case 'custom':
        return { from: customFrom || todayStr, to: customTo || todayStr };
    }
  }, [dateRange, customFrom, customTo]);

  // Fetch attendance for student
  const { data: attendanceData } = useSWR<Attendance[]>(
    isDemoMode ? `demo-student-att-${studentId}` : `student-att-${studentId}-${from}-${to}`,
    async () => {
      if (isDemoMode) return MOCK_ATTENDANCE.filter(a => a.student_id === studentId);
      return api.attendance.forStudent(studentId, from, to);
    }
  );

  // Fetch absences for student
  const { data: absenceData } = useSWR<Absence[]>(
    isDemoMode ? `demo-student-abs-${studentId}` : `student-abs-${studentId}`,
    async () => {
      if (isDemoMode) return MOCK_ABSENCES.filter(a => a.student_id === studentId);
      return api.absences.forStudent(studentId);
    }
  );

  // Filter absences to selected date range
  const absencesInRange = useMemo(() => {
    if (!absenceData) return [];
    return absenceData.filter(a => a.absence_date >= from && a.absence_date <= to);
  }, [absenceData, from, to]);

  // Build merged log entries
  const entries = useMemo((): LogEntry[] => {
    const list: LogEntry[] = [];

    // Attendance records -> 'present'
    const attendanceDates = new Set<string>();
    if (attendanceData) {
      for (const a of attendanceData) {
        const date = a.check_in.split('T')[0];
        if (date >= from && date <= to) {
          attendanceDates.add(date);
          list.push({
            type: 'present',
            date,
            checkIn: a.check_in,
            checkOut: a.check_out,
            durationMinutes: a.duration_minutes,
          });
        }
      }
    }

    // Absences -> 'excused'
    const absenceDates = new Set<string>();
    for (const a of absencesInRange) {
      absenceDates.add(a.absence_date);
      list.push({ type: 'excused', date: a.absence_date, reason: a.reason });
    }

    // Missed days: scheduled days in range with neither attendance nor absence
    if (scheduleDays.length > 0) {
      const scheduledDates = getScheduledDatesInRange(from, to, scheduleDays);
      const today = toISODate(new Date());
      for (const date of scheduledDates) {
        if (date > today) continue; // Don't mark future dates as missed
        if (!attendanceDates.has(date) && !absenceDates.has(date)) {
          list.push({ type: 'missed', date });
        }
      }
    }

    // Sort by date DESC
    list.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return list;
  }, [attendanceData, absencesInRange, scheduleDays, from, to]);

  // Stats
  const attended = entries.filter(e => e.type === 'present').length;
  const missed = entries.filter(e => e.type === 'missed').length;
  const excused = entries.filter(e => e.type === 'excused').length;
  const rate = attended + missed > 0 ? Math.round((attended / (attended + missed)) * 100) : 100;

  // Last attended
  const lastAttended = useMemo(() => {
    const present = entries.find(e => e.type === 'present');
    if (!present) return null;
    return formatDateLabel(present.date);
  }, [entries]);

  const visibleEntries = expanded ? entries : entries.slice(0, 5);

  const rangeOptions: { key: DateRange; label: string }[] = [
    { key: 'last30', label: 'Last 30 days' },
    { key: 'last3months', label: 'Last 3 months' },
    { key: 'thisYear', label: 'This year' },
    { key: 'allTime', label: 'All time' },
    { key: 'custom', label: 'Custom...' },
  ];

  return (
    <section className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ClipboardList size={18} color="var(--secondary)" />
          <h3 className={styles.heading}>Attendance</h3>
        </div>
        {lastAttended && (
          <span className={styles.lastAttended}>Last attended: {lastAttended}</span>
        )}
      </div>

      {/* Date range chips */}
      <div className={styles.chips}>
        {rangeOptions.map(opt => (
          <button
            key={opt.key}
            className={dateRange === opt.key ? styles.chipActive : styles.chip}
            onClick={() => setDateRange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {dateRange === 'custom' && (
        <div className={styles.customDates}>
          <input
            type="date"
            className={styles.dateInput}
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
          />
          <span className={styles.dateSep}>to</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
          />
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.statBlue}`}>{attended}</span>
          <span className={styles.statLabel}>Attended</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.statRed}`}>{missed}</span>
          <span className={styles.statLabel}>Missed</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.statTeal}`}>{excused}</span>
          <span className={styles.statLabel}>Excused</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.statOrange}`}>{rate}%</span>
          <span className={styles.statLabel}>Rate</span>
        </div>
      </div>

      {/* Log entries */}
      <div className={styles.log}>
        {visibleEntries.map((entry, i) => (
          <div key={`${entry.date}-${entry.type}-${i}`} className={styles.logEntry}>
            <span
              className={`${styles.dot} ${
                entry.type === 'present'
                  ? styles.dotPresent
                  : entry.type === 'excused'
                  ? styles.dotExcused
                  : styles.dotMissed
              }`}
            />
            <span className={styles.logDate}>{formatDateLabel(entry.date)}</span>
            <span className={styles.logDetail}>
              {entry.type === 'present' && (
                <>
                  {formatTime(entry.checkIn)}
                  {entry.checkOut ? ` - ${formatTime(entry.checkOut)}` : ' (still in)'}
                  {entry.durationMinutes != null && ` (${entry.durationMinutes} min)`}
                </>
              )}
              {entry.type === 'excused' && `Excused: ${entry.reason}`}
              {entry.type === 'missed' && 'No record'}
            </span>
            <span
              className={`${styles.logLabel} ${
                entry.type === 'present'
                  ? styles.logLabelPresent
                  : entry.type === 'excused'
                  ? styles.logLabelExcused
                  : styles.logLabelMissed
              }`}
            >
              {entry.type === 'present' ? 'Present' : entry.type === 'excused' ? 'Excused' : 'Missed'}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className={styles.empty}>No attendance records for this period.</p>
        )}
      </div>

      {/* View all link */}
      {entries.length > 5 && (
        <button className={styles.viewAll} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `View full log (${entries.length} entries)`}
        </button>
      )}
    </section>
  );
}
