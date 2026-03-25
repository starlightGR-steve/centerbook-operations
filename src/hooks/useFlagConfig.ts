import { useMemo } from 'react';
import { useCenterSettings } from './useCenterSettings';
import { DEFAULT_FLAGS, DEFAULT_CHECKLIST } from '@/lib/flags';
import type { FlagConfigItem, ChecklistConfigItem } from '@/lib/types';

/** Lookup table for enriching API flags with icon/color from defaults */
const FLAG_DEFAULTS_BY_KEY = new Map(
  DEFAULT_FLAGS.map((f) => [f.key, f])
);

/**
 * Normalize an API flag item ({id, label} or full FlagConfigItem) into the
 * app's FlagConfigItem shape, enriching with icon/color from defaults.
 */
function normalizeFlag(
  raw: Partial<FlagConfigItem> & { id?: string },
  index: number
): FlagConfigItem {
  const key = raw.key || raw.id || `flag_${index}`;
  const defaults = FLAG_DEFAULTS_BY_KEY.get(key);
  return {
    key,
    label: raw.label || defaults?.label || key,
    icon: raw.icon || defaults?.icon || 'Flag',
    color: raw.color || defaults?.color || '#6b7280',
    enabled: raw.enabled ?? true,
    sort_order: raw.sort_order ?? index,
  };
}

/**
 * Normalize an API checklist item ({id, label} or full ChecklistConfigItem)
 * into the app's ChecklistConfigItem shape.
 */
function normalizeChecklist(
  raw: Partial<ChecklistConfigItem> & { id?: string },
  index: number
): ChecklistConfigItem {
  return {
    key: raw.key || raw.id || `checklist_${index}`,
    label: raw.label || raw.key || raw.id || `Item ${index + 1}`,
    enabled: raw.enabled ?? true,
    sort_order: raw.sort_order ?? index,
  };
}

/**
 * Returns the active flag configuration from center settings,
 * falling back to hardcoded defaults when settings haven't loaded
 * or the API returns un-configured defaults (_source === "default").
 */
export function useFlagConfig(): { flags: FlagConfigItem[]; isLoading: boolean } {
  const { data: settings, isLoading } = useCenterSettings();

  const flags = useMemo(() => {
    const raw = settings?.flags;
    if (!raw || raw.length === 0 || settings?._source === 'default') {
      return DEFAULT_FLAGS.filter((f) => f.enabled);
    }
    return raw
      .map((f, i) => normalizeFlag(f as Partial<FlagConfigItem> & { id?: string }, i))
      .filter((f) => f.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [settings?.flags, settings?._source]);

  return { flags, isLoading };
}

/**
 * Returns the active checklist configuration from center settings,
 * falling back to hardcoded defaults when settings haven't loaded
 * or the API returns un-configured defaults (_source === "default").
 */
export function useChecklistConfig(): { items: ChecklistConfigItem[]; isLoading: boolean } {
  const { data: settings, isLoading } = useCenterSettings();

  const items = useMemo(() => {
    const raw = settings?.checklist_items;
    if (!raw || raw.length === 0 || settings?._source === 'default') {
      return DEFAULT_CHECKLIST.filter((c) => c.enabled);
    }
    return raw
      .map((c, i) => normalizeChecklist(c as Partial<ChecklistConfigItem> & { id?: string }, i))
      .filter((c) => c.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [settings?.checklist_items, settings?._source]);

  return { items, isLoading };
}
