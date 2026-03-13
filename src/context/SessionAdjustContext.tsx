'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SessionAdjustContextValue {
  adjustments: Record<number, number>; // studentId → delta minutes
  getAdjustment: (studentId: number) => number;
  setAdjustment: (studentId: number, delta: number) => void;
  adjustBy: (studentId: number, amount: number) => void;
}

const SessionAdjustContext = createContext<SessionAdjustContextValue>({
  adjustments: {},
  getAdjustment: () => 0,
  setAdjustment: () => {},
  adjustBy: () => {},
});

export function SessionAdjustProvider({ children }: { children: ReactNode }) {
  const [adjustments, setAdjustments] = useState<Record<number, number>>({});

  const getAdjustment = useCallback(
    (studentId: number) => adjustments[studentId] || 0,
    [adjustments]
  );

  const setAdjustment = useCallback((studentId: number, delta: number) => {
    setAdjustments((prev) => ({ ...prev, [studentId]: delta }));
  }, []);

  const adjustBy = useCallback((studentId: number, amount: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || 0) + amount,
    }));
  }, []);

  return (
    <SessionAdjustContext.Provider value={{ adjustments, getAdjustment, setAdjustment, adjustBy }}>
      {children}
    </SessionAdjustContext.Provider>
  );
}

export function useSessionAdjust() {
  return useContext(SessionAdjustContext);
}
