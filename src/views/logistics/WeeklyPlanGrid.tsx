'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStudents } from '@/hooks/useStudents';
import { useWeekAbsences } from '@/hooks/useAbsences';
import { parseSubjects, formatTimeSortKey, bucketTimeKey, getWeekDates } from '@/lib/types';
import type { Student, Absence } from '@/lib/types';
import { Video } from 'lucide-react';
import SubjectBadges from '@/components/SubjectBadges';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
// Standard center hours + extended Zoom morning slots
const TIME_SLOTS = [800, 830, 900, 930, 1000, 1030, 1100, 1130, 1200, 1230, 1300, 1330, 1400, 1430, 1500, 1530, 1600, 1630, 1700, 1730];

function cellColor(count: number): string {
  if (count === 0) return '#ffffff';
  if (count <= 3) return '#dcfce7';
  if (count <= 6) return '#fef9c3';
  if (count <= 9) return '#ffedd5';
  return '#fee2e2';
}

function isAbsent(absenceMap: Map<string, Absence>, studentId: number, dayDate: string | undefined): Absence | undefined {
  if (!dayDate) return undefined;
  return absenceMap.get(`${studentId}-${dayDate}`);
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

  // Fetch absences for this week
  const weekDates = useMemo(() => getWeekDates(new Date(), DAYS), []);
  const weekStart = weekDates[0]?.date || '';
  const weekEnd = weekDates[weekDates.length - 1]?.date || '';
  const { data: weekAbsences } = useWeekAbsences(weekStart, weekEnd);

  // Build lookup: "studentId-date" -> Absence
  const absenceMap = useMemo(() => {
    const map = new Map<string, Absence>();
    weekAbsences?.forEach((a) => map.set(`${a.student_id}-${a.absence_date}`, a));
    return map;
  }, [weekAbsences]);

  // Count absences per day
  const absenceCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    DAYS.forEach((day) => {
      const dayDate = weekDates.find((d) => d.name === day)?.date;
      if (!dayDate || !weekAbsences) { counts[day] = 0; return; }
      counts[day] = weekAbsences.filter((a) => a.absence_date === dayDate).length;
    });
    return counts;
  }, [weekAbsences, weekDates]);
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
      if (!s.class_schedule_days) return;
      const days = s.class_schedule_days.split(',').map((d) => d.trim());
      days.forEach((day) => {
        // Use schedule_detail sort_key if available, fall back to class_time_sort_key
        const detail = s.schedule_detail?.[day];
        const sortKey = detail?.sort_key ?? s.class_time_sort_key;
        if (!sortKey) return;
        const slot = bucketTimeKey(sortKey);
        const key = `${day}-${slot}`;
        if (map[key]) map[key].push(s);
      });
    });
    return map;
  }, [students]);

  // Only show time slots that have students or are in normal center hours (1500-1730)
  const visibleSlots = useMemo(() => {
    return TIME_SLOTS.filter((slot) => {
      // Always show normal center hours
      if (slot >= 1500 && slot <= 1730) return true;
      // Show extended slots only if any day has students there
      return DAYS.some((day) => (grid[`${day}-${slot}`]?.length ?? 0) > 0);
    });
  }, [grid]);

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
                {absenceCountByDay[d] > 0 && (
                  <span style={{ color: i === selectedDayIdx ? 'rgba(255,200,200,0.9)' : '#ef4444', fontSize: 9 }}>
                    {absenceCountByDay[d]} absent
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Time slot cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleSlots.map((slot) => {
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
                        {(() => {
                          const dayDate = weekDates.find((wd) => wd.name === day)?.date;
                          const absence = isAbsent(absenceMap, s.id, dayDate);
                          return (
                            <span style={{ fontWeight: 500, color: absence ? 'var(--neutral)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, opacity: absence ? 0.4 : 1, textDecoration: absence ? 'line-through' : 'none' }}>
                              {s.first_name} {s.last_name}
                              {absence && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textDecoration: 'none', opacity: 1 }}>
                                  {absence.reason}
                                </span>
                              )}
                              {s.schedule_detail?.[day]?.is_zoom && !absence && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '1px 4px', borderRadius: 3 }}>
                                  <Video size={9} /> Zoom
                                </span>
                              )}
                            </span>
                          );
                        })()}
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
                {absenceCountByDay[day] > 0 && (
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#ef4444', marginTop: 2 }}>
                    {absenceCountByDay[day]} absent
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleSlots.map((slot) => (
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
                            {(() => {
                              const dayDate = weekDates.find((wd) => wd.name === day)?.date;
                              const absence = isAbsent(absenceMap, s.id, dayDate);
                              return (
                                <span style={{ fontWeight: 500, color: absence ? 'var(--neutral)' : '#355caa', display: 'flex', alignItems: 'center', gap: 4, opacity: absence ? 0.4 : 1, textDecoration: absence ? 'line-through' : 'none' }}>
                                  {s.first_name} {s.last_name}
                                  {absence && (
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textDecoration: 'none', opacity: 1 }}>
                                      {absence.reason}
                                    </span>
                                  )}
                                  {s.schedule_detail?.[day]?.is_zoom && !absence && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '1px 4px', borderRadius: 3 }}>
                                      <Video size={9} /> Zoom
                                    </span>
                                  )}
                                </span>
                              );
                            })()}
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
