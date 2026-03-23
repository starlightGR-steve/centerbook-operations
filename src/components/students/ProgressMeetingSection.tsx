'use client';

import { useState, useMemo, useEffect } from 'react';
import { CalendarCheck, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useLevelHistory } from '@/hooks/useLevelHistory';
import styles from './ProgressMeetingSection.module.css';

/* ── Constants ─────────────────────────────── */

const CADENCE_OPTIONS: Record<string, string> = {
  new_student: 'New Student',
  monthly: 'Monthly',
  every_3_months: 'Every 3 Months',
  every_6_months: 'Every 6 Months',
  paused: 'Paused',
};

const MATH_LEVELS = [
  '6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D', 'E',
  'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
];

const READING_LEVELS = [
  '7A', '6A', '5A', '4A', '3A', '2A', 'AI', 'AII', 'BI', 'BII',
  'CI', 'CII', 'DI', 'DII', 'EI', 'EII', 'F', 'GI', 'GII',
  'HI', 'HII', 'I', 'J', 'K', 'L',
];

/* ── Helpers ───────────────────────────────── */

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDate(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function levelIndex(level: string, subject: 'Math' | 'Reading'): number {
  const seq = subject === 'Math' ? MATH_LEVELS : READING_LEVELS;
  const idx = seq.indexOf(level);
  return idx >= 0 ? idx : -1;
}

/* ── Props ─────────────────────────────────── */

interface ProgressMeetingSectionProps {
  studentId: number;
  staffId: number;
  isEditing: boolean;
  cadence: string | null;
  nextDue: string | null;
  lastDate: string | null;
  onFieldChange: (key: string, value: string | null) => void;
  getField: (key: string) => string;
  isChanged: (key: string) => boolean;
}

/* ── Component ─────────────────────────────── */

export default function ProgressMeetingSection({
  studentId,
  staffId,
  isEditing,
  cadence,
  nextDue,
  lastDate,
  onFieldChange,
  getField,
  isChanged,
}: ProgressMeetingSectionProps) {
  const { data: history } = useLevelHistory(studentId);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Build chart data from level history */
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const sorted = [...history].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );

    const byDate = new Map<string, { math?: number; reading?: number }>();

    for (const entry of sorted) {
      const key = shortDate(entry.changed_at);
      const existing = byDate.get(key) ?? {};
      const idx = levelIndex(entry.level_to, entry.subject);
      if (idx < 0) continue;
      if (entry.subject === 'Math') existing.math = idx;
      else existing.reading = idx;
      byDate.set(key, existing);
    }

    return Array.from(byDate.entries()).map(([date, vals]) => ({
      date,
      math: vals.math ?? null,
      reading: vals.reading ?? null,
    }));
  }, [history]);

  /* Current levels from latest history entries */
  const currentLevels = useMemo(() => {
    if (!history || history.length === 0) return { math: null, reading: null };
    const sorted = [...history].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );
    const math = sorted.find((e) => e.subject === 'Math');
    const reading = sorted.find((e) => e.subject === 'Reading');
    return {
      math: math?.level_to ?? null,
      reading: reading?.level_to ?? null,
    };
  }, [history]);

  const hasData = cadence || nextDue || lastDate;

  /* Custom tooltip for the chart */
  function ChartTooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div className={styles.chartTooltip}>
        <p className={styles.chartTooltipLabel}>{label}</p>
        {payload.map((p: any) => {
          const seq = p.dataKey === 'math' ? MATH_LEVELS : READING_LEVELS;
          const lvl = p.value != null ? seq[p.value] ?? '—' : '—';
          return (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.dataKey === 'math' ? 'Math' : 'Reading'}: {lvl}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <section className={styles.section}>
      {/* Part 1: Progress Meeting Fields */}
      <h3 className={styles.groupHeading}>Progress Meetings</h3>

      {!hasData && !isEditing ? (
        <p className={styles.emptyText}>No progress meeting data yet.</p>
      ) : (
        <div className={styles.meetingGrid}>
          {/* Cadence */}
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Cadence</span>
            {isEditing ? (
              <select
                className={`${styles.fieldInput} ${isChanged('progress_meeting_cadence') ? styles.changed : ''}`}
                value={getField('progress_meeting_cadence')}
                onChange={(e) =>
                  onFieldChange('progress_meeting_cadence', e.target.value || null)
                }
              >
                <option value="">Select...</option>
                {Object.entries(CADENCE_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <span className={styles.fieldValue}>
                {cadence ? (CADENCE_OPTIONS[cadence] ?? cadence) : '—'}
              </span>
            )}
          </div>

          {/* Next Due */}
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Next Due</span>
            {isEditing ? (
              <input
                type="date"
                className={`${styles.fieldInput} ${isChanged('next_progress_meeting_due') ? styles.changed : ''}`}
                value={getField('next_progress_meeting_due')}
                onChange={(e) =>
                  onFieldChange('next_progress_meeting_due', e.target.value || null)
                }
              />
            ) : (
              <span className={styles.fieldValue}>{formatDate(nextDue)}</span>
            )}
          </div>

          {/* Last Meeting */}
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Last Meeting</span>
            {isEditing ? (
              <input
                type="date"
                className={`${styles.fieldInput} ${isChanged('last_progress_meeting_date') ? styles.changed : ''}`}
                value={getField('last_progress_meeting_date')}
                onChange={(e) =>
                  onFieldChange('last_progress_meeting_date', e.target.value || null)
                }
              />
            ) : (
              <span className={styles.fieldValue}>{formatDate(lastDate)}</span>
            )}
          </div>
        </div>
      )}

      {/* Schedule Meeting Button */}
      <div className={styles.scheduleBtnWrap}>
        <button
          type="button"
          className={styles.scheduleBtn}
          onClick={() => {
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 3000);
          }}
        >
          <CalendarCheck size={14} />
          Schedule Meeting
        </button>
        {showTooltip && (
          <span className={styles.tooltip}>
            <Info size={12} />
            Amelia booking integration coming soon
          </span>
        )}
      </div>

      {/* Part 2: Level Progression Chart */}
      <hr className={styles.divider} />
      <h3 className={styles.groupHeading}>Level Progression</h3>

      {chartData.length === 0 ? (
        <p className={styles.emptyText}>No level changes recorded yet.</p>
      ) : (
        <>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isMobile ? 10 : 12, fontFamily: 'Montserrat' }}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 11, fontFamily: 'Montserrat' }}
                  tickFormatter={(val: number) => {
                    /* Show math level labels on Y axis */
                    return MATH_LEVELS[val] ?? '';
                  }}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, fontFamily: 'Montserrat' }}
                />
                <Line
                  type="monotone"
                  dataKey="math"
                  name="Math"
                  stroke="var(--tertiary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="reading"
                  name="Reading"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Current Level Badges */}
          <div className={styles.levelBadges}>
            {currentLevels.math && (
              <span className={styles.mathBadge}>Math: {currentLevels.math}</span>
            )}
            {currentLevels.reading && (
              <span className={styles.readingBadge}>Reading: {currentLevels.reading}</span>
            )}
          </div>
        </>
      )}

    </section>
  );
}
