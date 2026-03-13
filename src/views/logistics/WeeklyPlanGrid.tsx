'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStudents } from '@/hooks/useStudents';
import { parseSubjects, formatTimeSortKey, bucketTimeKey } from '@/lib/types';
import type { Student } from '@/lib/types';
import SubjectBadges from '@/components/SubjectBadges';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
const TIME_SLOTS = [1500, 1530, 1600, 1630, 1700, 1730];

function cellColor(count: number): string {
  if (count === 0) return '#ffffff';
  if (count <= 3) return '#dcfce7';
  if (count <= 6) return '#fef9c3';
  if (count <= 9) return '#ffedd5';
  return '#fee2e2';
}

function getTodayIdx(): number {
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const idx = DAYS.indexOf(todayName);
  return idx >= 0 ? idx : 0;
}

export default function WeeklyPlanGrid() {
  const { data: students } = useStudents();
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayIdx);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const grid = useMemo(() => {
    const map: Record<string, Student[]> = {};
    DAYS.forEach((day) => {
      TIME_SLOTS.forEach((slot) => {
        map[`${day}-${slot}`] = [];
      });
    });
    if (!students) return map;
    students.forEach((s) => {
      if (!s.class_schedule_days || !s.class_time_sort_key) return;
      const days = s.class_schedule_days.split(',').map((d) => d.trim());
      const slot = bucketTimeKey(s.class_time_sort_key);
      days.forEach((day) => {
        const key = `${day}-${slot}`;
        if (map[key]) map[key].push(s);
      });
    });
    return map;
  }, [students]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    DAYS.forEach((day) => {
      const ids = new Set<number>();
      TIME_SLOTS.forEach((slot) => {
        grid[`${day}-${slot}`]?.forEach((s) => ids.add(s.id));
      });
      totals[day] = ids.size;
    });
    return totals;
  }, [grid]);

  /* ── Mobile: single-day card layout ── */
  if (isMobile) {
    const day = DAYS[selectedDayIdx];

    return (
      <div>
        {/* Day pill selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => { setSelectedDayIdx(i); setExpandedCell(null); }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '8px 4px',
                border: '1px solid',
                borderColor: i === selectedDayIdx ? 'var(--primary)' : 'var(--border)',
                borderRadius: 8,
                background: i === selectedDayIdx ? 'var(--primary)' : 'var(--white)',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: i === selectedDayIdx ? '#fff' : 'var(--primary)',
              }}>
                {DAY_SHORT[d]}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: i === selectedDayIdx ? 'rgba(255,255,255,0.7)' : 'var(--neutral)',
              }}>
                {dayTotals[d]} stu
              </span>
            </button>
          ))}
        </div>

        {/* Time slot cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TIME_SLOTS.map((slot) => {
            const key = `${day}-${slot}`;
            const cellStudents = grid[key] || [];
            const count = cellStudents.length;
            const isExpanded = expandedCell === key;
            return (
              <button
                key={slot}
                onClick={() => count > 0 && setExpandedCell(isExpanded ? null : key)}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'var(--white)',
                  textAlign: 'left',
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: count > 0 ? 'pointer' : 'default',
                  width: '100%',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 80, padding: '12px 10px',
                    background: cellColor(count),
                    fontWeight: 700, fontSize: 12, color: count === 0 ? '#d1d5db' : 'var(--primary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatTimeSortKey(slot)}
                  </div>
                  <div style={{
                    flex: 1, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: count === 0 ? '#d1d5db' : 'var(--primary)' }}>
                      {count > 0 ? count : '—'}
                    </span>
                    {count > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--neutral)' }}>
                        {count === 1 ? '1 student' : `${count} students`}
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded && count > 0 && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: 10,
                  }}>
                    {cellStudents.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8, padding: '5px 6px', fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--primary)' }}>
                          {s.first_name} {s.last_name}
                        </span>
                        <SubjectBadges subjects={parseSubjects(s.subjects)} />
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Day total */}
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'var(--white)', borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
            {DAY_SHORT[day]} Total
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
            {dayTotals[day]} students
          </span>
        </div>
      </div>
    );
  }

  /* ── Desktop: full table ── */
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                fontSize: 11, color: '#57727c', borderBottom: '2px solid #e8e8e8', width: 80,
              }}
            >
              Time
            </th>
            {DAYS.map((day) => (
              <th
                key={day}
                style={{
                  padding: '10px 12px', textAlign: 'center', fontWeight: 600,
                  fontSize: 11, color: '#355caa', borderBottom: '2px solid #e8e8e8',
                }}
              >
                {DAY_SHORT[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((slot) => (
            <tr key={slot}>
              <td
                style={{
                  padding: '8px 12px', fontWeight: 600, fontSize: 11,
                  color: '#57727c', borderBottom: '1px solid #e8e8e8', whiteSpace: 'nowrap',
                }}
              >
                {formatTimeSortKey(slot)}
              </td>
              {DAYS.map((day) => {
                const key = `${day}-${slot}`;
                const cellStudents = grid[key] || [];
                const count = cellStudents.length;
                const isExpanded = expandedCell === key;
                return (
                  <td
                    key={key}
                    style={{
                      padding: 0, borderBottom: '1px solid #e8e8e8',
                      borderLeft: '1px solid #e8e8e8', position: 'relative',
                    }}
                  >
                    <button
                      onClick={() => setExpandedCell(isExpanded ? null : key)}
                      style={{
                        display: 'block', width: '100%', padding: '10px 8px',
                        border: 'none', background: cellColor(count),
                        cursor: count > 0 ? 'pointer' : 'default',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
                        color: count === 0 ? '#d1d5db' : '#303030', textAlign: 'center',
                        transition: 'background 0.15s',
                      }}
                    >
                      {count > 0 ? count : '—'}
                    </button>
                    {isExpanded && count > 0 && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: '50%',
                          transform: 'translateX(-50%)', zIndex: 30,
                          background: '#fff', border: '1px solid #e8e8e8',
                          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          padding: 8, minWidth: 200, maxHeight: 220, overflowY: 'auto',
                        }}
                      >
                        <p style={{
                          margin: '0 0 6px', fontSize: 10, fontWeight: 600,
                          color: '#57727c', textTransform: 'uppercase',
                        }}>
                          {DAY_SHORT[day]} {formatTimeSortKey(slot)} ({count})
                        </p>
                        {cellStudents.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', gap: 8,
                              padding: '4px 6px', borderRadius: 4, fontSize: 11,
                            }}
                          >
                            <span style={{ fontWeight: 500, color: '#355caa' }}>
                              {s.first_name} {s.last_name}
                            </span>
                            <SubjectBadges subjects={parseSubjects(s.subjects)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td style={{
              padding: '10px 12px', fontWeight: 700, fontSize: 11,
              color: '#355caa', borderTop: '2px solid #e8e8e8',
            }}>
              Total
            </td>
            {DAYS.map((day) => (
              <td
                key={day}
                style={{
                  padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                  fontSize: 13, color: '#355caa', borderTop: '2px solid #e8e8e8',
                  borderLeft: '1px solid #e8e8e8',
                }}
              >
                {dayTotals[day]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
