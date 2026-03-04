import useSWR, { mutate } from 'swr';
import { USE_MOCK } from '@/lib/api';
import { MOCK_CENTER_SETTINGS } from '@/lib/mock-data';
import type { CenterSettings } from '@/lib/types';

/** In-memory mock store for settings persistence */
let mockSettings: CenterSettings = { ...MOCK_CENTER_SETTINGS };

export function useCenterSettings() {
  return useSWR<CenterSettings>(
    'center-settings',
    async () => {
      if (USE_MOCK) {
        return { ...mockSettings };
      }
      // Future: api.settings.get()
      return MOCK_CENTER_SETTINGS;
    }
  );
}

export async function updateCenterSettings(
  updates: Partial<CenterSettings>
): Promise<CenterSettings> {
  if (USE_MOCK) {
    mockSettings = { ...mockSettings, ...updates };
    mutate('center-settings');
    return mockSettings;
  }
  // Future: api.settings.update(updates)
  mutate('center-settings');
  return mockSettings;
}
