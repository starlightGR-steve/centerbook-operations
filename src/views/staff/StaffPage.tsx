'use client';

import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import PayPeriodNavigator from './PayPeriodNavigator';
import StaffTable from './StaffTable';
import StaffDetailModal from './StaffDetailModal';
import { useStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { usePayPeriod } from '@/hooks/usePayPeriod';
import type { Staff, TimeEntry } from '@/lib/types';
import StaffSkeleton from './StaffSkeleton';
import styles from './StaffPage.module.css';

function exportPayrollCSV(
  staff: Staff[],
  timeEntries: TimeEntry[],
  periodStart: string,
  periodEnd: string
) {
  const rows = staff.map((s) => {
    const entries = timeEntries.filter(
      (e) =>
        e.staff_id === s.id &&
        e.clock_in >= periodStart &&
        e.clock_in <= periodEnd + 'T23:59:59' &&
        e.duration_minutes != null
    );
    const hours = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
    return [s.full_name, s.role, hours.toFixed(2), String(entries.length), `${periodStart} to ${periodEnd}`];
  });

  const header = 'Employee Name,Role,Total Hours,Entries,Period';
  const csv = [header, ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll_${periodStart}_${periodEnd}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const { data: staff } = useStaff();
  const { data: timeEntries } = useTimeclock();
  const { start, end, label, goPrev, goNext, goToCurrent } = usePayPeriod();

  const clockedInIds = useMemo(() => {
    const ids = new Set<number>();
    timeEntries?.forEach((e) => {
      if (e.clock_out === null) ids.add(e.staff_id);
    });
    return ids;
  }, [timeEntries]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Track Your"
            title="Staff Hours & Payroll"
            subtitle="Export time data for payroll processing"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              staff &&
              timeEntries &&
              exportPayrollCSV(staff, timeEntries, start, end)
            }
          >
            <Download size={16} />
            Export
          </Button>
        </div>
        <PayPeriodNavigator
          label={label}
          onPrev={goPrev}
          onNext={goNext}
          onCurrent={goToCurrent}
        />
      </div>

      <div className={styles.content}>
        {!staff || !timeEntries ? (
          <StaffSkeleton />
        ) : (
          <StaffTable
            staff={staff}
            timeEntries={timeEntries}
            clockedInIds={clockedInIds}
            periodStart={start}
            periodEnd={end}
            onSelect={setSelectedStaff}
          />
        )}
      </div>

      {selectedStaff && (
        <StaffDetailModal
          open={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
          staff={selectedStaff}
          timeEntries={timeEntries || []}
          periodStart={start}
          periodEnd={end}
        />
      )}
    </div>
  );
}
