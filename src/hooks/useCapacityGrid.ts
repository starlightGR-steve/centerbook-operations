import { useMemo } from 'react';
import { useStudents } from './useStudents';
import { useAllStaffSlots } from './useStaffSlots';
import { useScheduleOverrides } from './useScheduleOverrides';
import { useCenterSettings } from './useCenterSettings';
import type {
  CapacityCell,
  CapacityGridData,
  Student,
  StaffSlotAssignment,
  ScheduleOverride,
  CenterSettings,
} from '@/lib/types';
import {
  parseScheduleDays,
  bucketTimeKey,
  getWeekDates,
  formatWeekLabel,
  formatTimeSortKey,
  getStoplightColor,
  getRecommendedStaff,
} from '@/lib/types';

interface StudentCounts {
  total: number;
  el: number;
  mc: number;
  uc: number;
}

function computeStudentCounts(
  students: Student[],
  day: string,
  timeSortKey: number,
  overrides: ScheduleOverride[],
  targetDate: string
): StudentCounts {
  // 1. Students with this day + time in their regular schedule
  const scheduled = students.filter(
    (s) =>
      s.enrollment_status === 'Active' &&
      parseScheduleDays(s.class_schedule_days).includes(day) &&
      s.class_time_sort_key !== null &&
      bucketTimeKey(s.class_time_sort_key) === timeSortKey
  );

  let total = scheduled.length;
  const el = scheduled.filter((s) => s.classroom_position === 'Early Learners').length;
  const mc = scheduled.filter((s) => s.classroom_position === 'Main Classroom').length;
  const uc = scheduled.filter((s) => s.classroom_position === 'Upper Classroom').length;

  // 2. Apply overrides for this specific date
  const dateOverrides = overrides.filter((o) => o.effective_date === targetDate);

  total -= dateOverrides.filter(
    (o) =>
      o.override_type === 'remove' &&
      o.original_day === day &&
      o.original_time === timeSortKey
  ).length;

  total += dateOverrides.filter(
    (o) =>
      (o.override_type === 'add' || o.override_type === 'move') &&
      o.new_day === day &&
      o.new_time === timeSortKey
  ).length;

  total -= dateOverrides.filter(
    (o) =>
      o.override_type === 'move' &&
      o.original_day === day &&
      o.original_time === timeSortKey
  ).length;

  return { total: Math.max(0, total), el, mc, uc };
}

function countStaffAssigned(
  staffSlots: StaffSlotAssignment[],
  day: string,
  timeSortKey: number
): number {
  return staffSlots.filter(
    (s) => s.day_of_week === day && s.time_sort_key === timeSortKey
  ).length;
}

export function useCapacityGrid(weekReferenceDate: Date): {
  data: CapacityGridData | undefined;
  isLoading: boolean;
} {
  const { data: students } = useStudents();
  const { data: staffSlots } = useAllStaffSlots();
  const { data: settings } = useCenterSettings();

  // Compute week dates from settings operating days
  const days = useMemo(() => {
    if (!settings) return [];
    return getWeekDates(weekReferenceDate, settings.operating_days);
  }, [weekReferenceDate, settings]);

  // Get the Monday of the week for overrides query
  const weekStart = days.length > 0 ? days[0].date : '';
  const { data: overrides } = useScheduleOverrides(weekStart);

  const isLoading = !students || !staffSlots || !settings || !overrides;

  const grid = useMemo<CapacityGridData | undefined>(() => {
    if (!students || !staffSlots || !settings || !overrides || days.length === 0) {
      return undefined;
    }

    const { time_slots, center_capacity, staff_student_ratio } = settings;

    const cells: CapacityCell[][] = time_slots.map((slot) =>
      days.map(({ name, date }) => {
        const isOpen = slot.open_days.includes(name);
        const counts = isOpen
          ? computeStudentCounts(students, name, slot.sort_key, overrides, date)
          : { total: 0, el: 0, mc: 0, uc: 0 };
        const staffAssigned = isOpen
          ? countStaffAssigned(staffSlots, name, slot.sort_key)
          : 0;
        const staffRecommended = getRecommendedStaff(counts.total, staff_student_ratio);
        const utilization =
          center_capacity > 0
            ? Math.round((counts.total / center_capacity) * 100)
            : 0;

        return {
          day: name,
          date,
          timeSortKey: slot.sort_key,
          timeDisplay: slot.display,
          isOpen,
          studentCount: counts.total,
          staffAssigned,
          staffRecommended,
          utilization,
          stoplightColor: getStoplightColor(utilization),
          isUnderstaffed: isOpen && staffAssigned < staffRecommended,
          elCount: counts.el,
          mcCount: counts.mc,
          ucCount: counts.uc,
        };
      })
    );

    return {
      cells,
      timeSlots: time_slots,
      days,
      capacity: center_capacity,
      weekLabel: formatWeekLabel(days),
    };
  }, [students, staffSlots, settings, overrides, days]);

  return { data: grid, isLoading };
}
