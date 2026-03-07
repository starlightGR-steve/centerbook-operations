import useSWR, { mutate } from 'swr';
import { MOCK_CENTER_SETTINGS } from '@/lib/mock-data';
import type { CenterSettings } from '@/lib/types';

// In-memory store — future: replace with api.settings.get()
let currentSettings: CenterSettings = { ...MOCK_CENTER_SETTINGS };

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
