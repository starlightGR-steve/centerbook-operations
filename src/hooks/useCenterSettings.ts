import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { CenterSettings, TimeSlot } from '@/lib/types';

/**
 * Convert API time_slots ({time, label}) to the app's TimeSlot shape
 * ({sort_key, display, open_days}), using operating_days for open_days.
 */
function normalizeTimeSlots(
  raw: Array<{ time?: string; label?: string; sort_key?: number; display?: string; open_days?: string[] }> | undefined,
  operatingDays: string[]
): TimeSlot[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((slot) => {
    // Already in app shape
    if (slot.sort_key !== undefined && slot.display !== undefined) {
      return slot as TimeSlot;
    }
    // API shape: { time: "15:00", label: "3:00 PM" }
    const [h, m] = (slot.time || '00:00').split(':').map(Number);
    return {
      sort_key: h * 100 + m,
      display: slot.label || slot.time || '',
      open_days: slot.open_days || operatingDays,
    };
  });
}

export function useCenterSettings() {
  return useSWR<CenterSettings>(
    'center-settings',
    async () => {
      const data = await api.center.settings();
      // Normalize time_slots from API shape to app shape
      if (data.time_slots) {
        data.time_slots = normalizeTimeSlots(
          data.time_slots as unknown as Array<Record<string, unknown>>,
          data.operating_days || []
        );
      }
      // Normalize staff_student_ratio from object to number if needed
      const ratio = data.staff_student_ratio as unknown;
      if (typeof ratio === 'object' && ratio !== null) {
        const values = Object.values(ratio as Record<string, number>);
        data.staff_student_ratio = values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 4;
      }
      return data;
    },
    { dedupingInterval: 30000 }
  );
}

export async function updateCenterSettings(
  updates: Partial<CenterSettings>
): Promise<CenterSettings> {
  // Future: api.center.updateSettings(updates)
  mutate('center-settings');
  return updates as CenterSettings;
}
