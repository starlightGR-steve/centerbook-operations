import { useState, useMemo, useCallback } from 'react';

interface PayPeriod {
  start: string; // YYYY-MM-DD
  end: string;
  label: string; // "Mar 1–15, 2026"
}

function getPayPeriod(referenceDate: Date): PayPeriod {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let start: string;
  let end: string;

  if (day <= 15) {
    start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    end = `${year}-${String(month + 1).padStart(2, '0')}-15`;
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    start = `${year}-${String(month + 1).padStart(2, '0')}-16`;
    end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });

  let label: string;
  if (startDate.getMonth() === endDate.getMonth()) {
    label = `${monthName} ${startDate.getDate()}–${endDate.getDate()}, ${year}`;
  } else {
    const endMonthName = endDate.toLocaleDateString('en-US', { month: 'short' });
    label = `${monthName} ${startDate.getDate()} – ${endMonthName} ${endDate.getDate()}, ${year}`;
  }

  return { start, end, label };
}

export function usePayPeriod() {
  const [offset, setOffset] = useState(0);

  const period = useMemo(() => {
    const ref = new Date();
    // Navigate by half-months
    if (offset !== 0) {
      const day = ref.getDate();
      const isFirstHalf = day <= 15;
      // Each offset step = one half-month
      let totalHalves = offset;
      if (isFirstHalf) {
        // Currently in first half (1-15)
        totalHalves += 0;
      } else {
        // Currently in second half (16-end)
        totalHalves += 1;
      }
      // Calculate target half
      const currentMonth = ref.getMonth() + (isFirstHalf ? 0 : 0);
      const targetHalf = (isFirstHalf ? 0 : 1) + offset;
      const monthShift = Math.floor(targetHalf / 2);
      const halfInMonth = ((targetHalf % 2) + 2) % 2;

      ref.setMonth(currentMonth + monthShift);
      ref.setDate(halfInMonth === 0 ? 1 : 16);
    }
    return getPayPeriod(ref);
  }, [offset]);

  const goPrev = useCallback(() => setOffset((o) => o - 1), []);
  const goNext = useCallback(() => setOffset((o) => o + 1), []);
  const goToCurrent = useCallback(() => setOffset(0), []);

  return { ...period, goPrev, goNext, goToCurrent };
}
