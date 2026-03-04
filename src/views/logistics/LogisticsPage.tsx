'use client';

import { useState, useMemo, useCallback } from 'react';
import { Settings } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import WeekNavigator from './WeekNavigator';
import CapacityGrid from './CapacityGrid';
import SlotDetailModal from './SlotDetailModal';
import SettingsModal from './SettingsModal';
import RescheduleFlow from './RescheduleFlow';
import { useCapacityGrid } from '@/hooks/useCapacityGrid';
import { useCenterSettings } from '@/hooks/useCenterSettings';
import { useScheduleOverrides } from '@/hooks/useScheduleOverrides';
import type { CapacityCell, Student } from '@/lib/types';
import { getWeekDates } from '@/lib/types';
import styles from './LogisticsPage.module.css';

export default function LogisticsPage() {
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
          <WeekNavigator
            weekLabel={gridData?.weekLabel || ''}
            onPrev={() => setWeekOffset((o) => o - 1)}
            onNext={() => setWeekOffset((o) => o + 1)}
            onToday={() => setWeekOffset(0)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading capacity data...</div>
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
          staffStudentRatio={settings?.staff_student_ratio || 8}
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
