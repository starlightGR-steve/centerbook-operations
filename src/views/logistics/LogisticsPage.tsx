'use client';

import { useState, useMemo, useCallback } from 'react';
import { Settings } from 'lucide-react';
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

export default function LogisticsPage() {
  const [section, setSection] = useState<'students' | 'staff'>('students');
  const [viewMode, setViewMode] = useState<'live' | 'weekly'>('live');
  const [weekOffset, setWeekOffset] = useState(0);
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
        </div>
      </div>

      <div className={styles.content}>
        {section === 'staff' ? (
          <StaffSchedulePage />
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
