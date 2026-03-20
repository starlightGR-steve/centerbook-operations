'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { updateAttendance } from '@/hooks/useAttendance';

interface SessionAdjustContextValue {
  /**
   * Optimistic overrides for session_duration_minutes.
   * Key: student_id, Value: absolute duration in minutes.
   * These are cleared once SWR revalidates with the DB value.
   */
  optimistic: Record<number, number>;
  getOptimistic: (studentId: number) => number | undefined;
  /**
   * Adjust a student's session duration. Persists to the attendance record
   * via PUT /attendance/{id} and sets an optimistic value for instant UI.
   */
  persistAdjustment: (attendanceId: number, studentId: number, newDuration: number) => void;
  /** Clear optimistic value after SWR revalidation */
  clearOptimistic: (studentId: number) => void;
}

const SessionAdjustContext = createContext<SessionAdjustContextValue>({
  optimistic: {},
  getOptimistic: () => undefined,
  persistAdjustment: () => {},
  clearOptimistic: () => {},
});

export function SessionAdjustProvider({ children }: { children: ReactNode }) {
  const [optimistic, setOptimistic] = useState<Record<number, number>>({});

  const getOptimistic = useCallback(
    (studentId: number) => optimistic[studentId],
    [optimistic]
  );

  const persistAdjustment = useCallback(
    (attendanceId: number, studentId: number, newDuration: number) => {
      // 1. Optimistic UI update
      setOptimistic((prev) => ({ ...prev, [studentId]: newDuration }));
      // 2. Persist to DB (attendance record)
      updateAttendance(attendanceId, { session_duration_minutes: newDuration } as Parameters<typeof updateAttendance>[1]).then(() => {
        // Clear optimistic after DB confirms (SWR will have fresh data)
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
      });
    },
    []
  );

  const clearOptimistic = useCallback((studentId: number) => {
    setOptimistic((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }, []);

  return (
    <SessionAdjustContext.Provider value={{ optimistic, getOptimistic, persistAdjustment, clearOptimistic }}>
      {children}
    </SessionAdjustContext.Provider>
  );
}

export function useSessionAdjust() {
  return useContext(SessionAdjustContext);
}
