import useSWR, { mutate } from 'swr';
import type { CenterSettings } from '@/lib/types';

// In-memory store — future: replace with api.settings.get()
let currentSettings: CenterSettings = {
  center_capacity: 48,
  operating_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  time_slots: [],
  staff_student_ratio: 4,
};

export function useCenterSettings() {
  return useSWR<CenterSettings>(
    'center-settings',
    async () => {
      // Future: api.settings.get()
      return { ...currentSettings };
    }
  );
}

export async function updateCenterSettings(
  updates: Partial<CenterSettings>
): Promise<CenterSettings> {
  currentSettings = { ...currentSettings, ...updates };
  // Future: api.settings.update(updates)
  mutate('center-settings');
  return currentSettings;
}
