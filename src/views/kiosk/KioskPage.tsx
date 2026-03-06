'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Scan } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import ClockDisplay from '@/components/ClockDisplay';
import CheckInPanel from './CheckInPanel';
import CheckOutPanel from './CheckOutPanel';
import TimeclockPanel from './TimeclockPanel';
import { useStudents } from '@/hooks/useStudents';
import { useCheckedInStudents, checkInStudent, checkOutStudent } from '@/hooks/useAttendance';
import { useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { getSessionDuration } from '@/lib/types';
import KioskSkeleton from './KioskSkeleton';
import styles from './KioskPage.module.css';

export default function KioskPage() {
  const [scan, setScan] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 5000);
  const { data: staff } = useActiveStaff();
  const { data: timeEntries } = useTimeclock();

  // Auto-focus scanner input
  useEffect(() => {
    inputRef.current?.focus();
    const refocus = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 3000);
    return () => clearInterval(refocus);
  }, []);

  // Get today's day name
  const todayDay = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  // Students scheduled for today who haven't checked in
  const awaitingCheckIn = useMemo(() => {
    if (!allStudents || !checkedIn) return [];
    const checkedInIds = new Set(checkedIn.map((a) => a.student_id));
    return allStudents.filter((s) => {
      if (!s.class_schedule_days) return false;
      const days = s.class_schedule_days.split(',').map((d) => d.trim());
      return days.includes(todayDay) && !checkedInIds.has(s.id);
    });
  }, [allStudents, checkedIn, todayDay]);

  // Handle barcode scan (Enter key)
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim() || !allStudents) return;

    const query = scan.trim().toLowerCase();
    const student = allStudents.find(
      (s) =>
        s.student_id?.toLowerCase() === query ||
        s.first_name.toLowerCase() === query ||
        `${s.first_name} ${s.last_name}`.toLowerCase() === query
    );

    if (!student) {
      setAnnouncement('Student not found');
      setScan('');
      return;
    }

    const isIn = checkedIn?.some((a) => a.student_id === student.id);
    if (isIn) {
      await checkOutStudent({ student_id: student.id });
      setAnnouncement(`${student.first_name} ${student.last_name} checked out`);
    } else {
      await checkInStudent({
        student_id: student.id,
        source: 'barcode',
        session_duration_minutes: getSessionDuration(student.subjects),
      });
      setAnnouncement(`${student.first_name} ${student.last_name} checked in`);
    }
    setScan('');
  };

  if (!allStudents || !staff || !timeEntries) {
    return <KioskSkeleton />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img
            src="/images/the_center_book_logo_with_GR_north_text_horiz.svg"
            alt="The Center Book"
            className={styles.logoImg}
          />
        </div>

        <form onSubmit={handleScan} className={styles.scannerWrap}>
          <SearchInput
            ref={inputRef}
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder="Scan folder barcode..."
            icon={<Scan size={18} />}
          />
        </form>

        <ClockDisplay size="lg" showIcon={false} />
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <div className={styles.columns}>
        <CheckInPanel students={awaitingCheckIn} />
        <CheckOutPanel
          attendance={checkedIn || []}
          students={allStudents}
        />
        <TimeclockPanel staff={staff} timeEntries={timeEntries} />
      </div>
    </div>
  );
}
