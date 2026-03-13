'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type DemoRole = 'admin' | 'staff';

interface MockDataContextValue {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
}

const MockDataContext = createContext<MockDataContextValue>({
  isDemoMode: false,
  toggleDemoMode: () => {},
  demoRole: 'admin',
  setDemoRole: () => {},
});

const STORAGE_KEY = 'cb_ops_demo_mode';
const ROLE_STORAGE_KEY = 'cb_ops_demo_role';

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRoleState] = useState<DemoRole>('admin');

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setIsDemoMode(true);
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole === 'admin' || storedRole === 'staff') setDemoRoleState(storedRole);
    } catch {
      // localStorage unavailable (SSR or privacy mode)
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setDemoRole = useCallback((role: DemoRole) => {
    setDemoRoleState(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      // ignore
    }
  }, []);

  return (
    <MockDataContext.Provider value={{ isDemoMode, toggleDemoMode, demoRole, setDemoRole }}>
      {children}
    </MockDataContext.Provider>
  );
}

/** Hook for components to read demo mode state */
export function useDemoMode() {
  return useContext(MockDataContext);
}

/**
 * Standalone check for non-hook contexts (mutation functions).
 * Reads directly from localStorage so it works outside React tree.
 */
export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
