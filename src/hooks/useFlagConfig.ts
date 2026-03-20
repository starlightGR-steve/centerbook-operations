import { useMemo } from 'react';
import { useCenterSettings } from './useCenterSettings';
import { DEFAULT_FLAGS, DEFAULT_CHECKLIST } from '@/lib/flags';
import type { FlagConfigItem, ChecklistConfigItem } from '@/lib/types';

/**
 * Returns the active flag configuration from center settings,
 * falling back to hardcoded defaults while settings load.
 */
export function useFlagConfig(): { flags: FlagConfigItem[]; isLoading: boolean } {
  const { data: settings, isLoading } = useCenterSettings();

  const flags = useMemo(() => {
    const raw = settings?.flags;
    if (!raw || raw.length === 0) return DEFAULT_FLAGS.filter((f) => f.enabled);
    return [...raw]
      .filter((f) => f.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [settings?.flags]);

  return { flags, isLoading };
}

/**
 * Returns the active checklist configuration from center settings,
 * falling back to hardcoded defaults while settings load.
 */
export function useChecklistConfig(): { items: ChecklistConfigItem[]; isLoading: boolean } {
  const { data: settings, isLoading } = useCenterSettings();

  const items = useMemo(() => {
    const raw = settings?.checklist_items;
    if (!raw || raw.length === 0) return DEFAULT_CHECKLIST.filter((c) => c.enabled);
    return [...raw]
      .filter((c) => c.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [settings?.checklist_items]);

  return { items, isLoading };
}
