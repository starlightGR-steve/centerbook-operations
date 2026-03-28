'use client';

import { useState, useMemo, useCallback } from 'react';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import WeekNavigator from './WeekNavigator';
import CapacityGrid from './CapacityGrid';
import WeeklyPlanGrid from './WeeklyPlanGrid';
import SlotDetailModal from './SlotDetailModal';
import SettingsModal from './SettingsModal';
import RescheduleFlow from './RescheduleFlow';
import StaffSchedulePage from '@/views/staff-schedule/StaffSchedulePage';
import { useCapacityGrid } from '@/hooks/useCapacityGrid';
import { useCenterSettings } from '@/hooks/useCenterSettings';
import { useScheduleOverrides } from '@/hooks/useScheduleOverrides';
import type { CapacityCell, Student } from '@/lib/types';
import { getWeekDates } from '@/lib/types';
import LogisticsSkeleton from './LogisticsSkeleton';
import styles from './LogisticsPage.module.css';

// Returns an array of Monday Dates for weeks whose Mon–Thu overlap with the given month
function getMonthWeeks(year: number, month: number): Date[] {
  const mondays: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dow = firstDay.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - daysBack);
  let monday = new Date(start);
  while (monday <= lastDay) {
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    if (thursday >= firstDay) mondays.push(new Date(monday));
    monday.setDate(monday.getDate() + 7);
  }
  return mondays;
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatMonthWeekLabel(monday: Date): string {
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getCurrentWeekMonday(): Date {
  const today = new Date();
  const dow = today.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  const m = new Date(today);
  m.setDate(today.getDate() - daysBack);
  m.setHours(0, 0, 0, 0);
  return m;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function LogisticsPage() {
  const [section, setSection] = useState<'students' | 'staff'>('students');
  const [viewMode, setViewMode] = useState<'live' | 'weekly'>('live');
  const [weekOffset, setWeekOffset] = useState(0);
  const [planScale, setPlanScale] = useState<'week' | 'month'>('week');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedCell, setSelectedCell] = useState<CapacityCell | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [rescheduleStudent, setRescheduleStudent] = useState<Student | null>(null);

  const weekRef = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const { data: gridData, isLoading } = useCapacityGrid(weekRef);
  const { data: settings } = useCenterSettings();

  // Get overrides for the slot detail modal
  const weekStart = useMemo(() => {
    if (!settings) return '';
    const days = getWeekDates(weekRef, settings.operating_days);
    return days.length > 0 ? days[0].date : '';
  }, [weekRef, settings]);
  const { data: overrides } = useScheduleOverrides(weekStart);

  // Month view: compute the target month and its week Mondays
  const monthRef = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [monthOffset]);

  const monthMondays = useMemo(
    () => getMonthWeeks(monthRef.year, monthRef.month),
    [monthRef.year, monthRef.month]
  );

  const currentWeekMonday = useMemo(() => getCurrentWeekMonday(), []);

  const handleCellClick = useCallback((cell: CapacityCell) => {
    setSelectedCell(cell);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Manage Your"
            title="Center Logistics"
            subtitle={
              settings
                ? `Classroom capacity: ${settings.center_capacity} seats across all time slots`
                : 'Loading...'
            }
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.controlsRow}>
            <div className={styles.segmented}>
              <button
                className={`${styles.segBtn} ${section === 'students' ? styles.segActive : ''}`}
                onClick={() => setSection('students')}
              >
                Students
              </button>
              <button
                className={`${styles.segBtn} ${section === 'staff' ? styles.segActive : ''}`}
                onClick={() => setSection('staff')}
              >
                Staff
              </button>
            </div>
            {section === 'students' && (
              <>
                <div className={styles.segmented}>
                  <button
                    className={`${styles.segBtn} ${viewMode === 'live' ? styles.segActive : ''}`}
                    onClick={() => setViewMode('live')}
                  >
                    Live
                  </button>
                  <button
                    className={`${styles.segBtn} ${viewMode === 'weekly' ? styles.segActive : ''}`}
                    onClick={() => setViewMode('weekly')}
                  >
                    Weekly Plan
                  </button>
                </div>
                {viewMode === 'weekly' && (
                  <div className={`${styles.segmented} ${styles.segmentedSm}`}>
                    <button
                      className={`${styles.segBtn} ${styles.segBtnSm} ${planScale === 'week' ? styles.segActive : ''}`}
                      onClick={() => setPlanScale('week')}
                    >
                      Week
                    </button>
                    <button
                      className={`${styles.segBtn} ${styles.segBtnSm} ${planScale === 'month' ? styles.segActive : ''}`}
                      onClick={() => setPlanScale('month')}
                    >
                      Month
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings size={16} />
                  Settings
                </Button>
              </>
            )}
          </div>
          {section === 'students' && viewMode === 'live' && (
            <WeekNavigator
              weekLabel={gridData?.weekLabel || ''}
              onPrev={() => setWeekOffset((o) => o - 1)}
              onNext={() => setWeekOffset((o) => o + 1)}
              onToday={() => setWeekOffset(0)}
            />
          )}
          {section === 'students' && viewMode === 'weekly' && planScale === 'month' && (
            <div className={styles.monthNav}>
              <button
                className={styles.monthNavArrow}
                onClick={() => setMonthOffset((o) => o - 1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.monthNavLabel}>
                {formatMonthLabel(monthRef.year, monthRef.month)}
              </span>
              <button
                className={styles.monthNavArrow}
                onClick={() => setMonthOffset((o) => o + 1)}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
              <button
                className={styles.monthNavToday}
                onClick={() => setMonthOffset(0)}
              >
                Today
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {section === 'staff' ? (
          <StaffSchedulePage />
        ) : viewMode === 'weekly' && planScale === 'month' ? (
          <div className={styles.monthContainer}>
            {monthMondays.map((monday) => {
              const isCurrent = isSameDay(monday, currentWeekMonday);
              return (
                <div key={monday.toISOString()} className={styles.weekBlock}>
                  <div className={`${styles.weekLabel} ${isCurrent ? styles.weekLabelCurrent : ''}`}>
                    {isCurrent && <span className={styles.weekLabelCurrentDot} />}
                    {formatMonthWeekLabel(monday)}
                  </div>
                  <WeeklyPlanGrid weekReferenceDate={monday} />
                </div>
              );
            })}
          </div>
        ) : viewMode === 'weekly' ? (
          <WeeklyPlanGrid />
        ) : isLoading ? (
          <LogisticsSkeleton />
        ) : gridData ? (
          <CapacityGrid data={gridData} onCellClick={handleCellClick} />
        ) : (
          <div className={styles.loading}>No data available</div>
        )}
      </div>

      {selectedCell && (
        <SlotDetailModal
          open={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          cell={selectedCell}
          overrides={overrides || []}
          onReschedule={(student) => {
            setRescheduleStudent(student);
          }}
        />
      )}

      {rescheduleStudent && selectedCell && (
        <RescheduleFlow
          open={!!rescheduleStudent}
          onClose={() => setRescheduleStudent(null)}
          student={rescheduleStudent}
          fromCell={selectedCell}
        />
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
