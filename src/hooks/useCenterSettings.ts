import useSWR, { mutate } from 'swr';
import { useMockFor } from '@/lib/api';
import { MOCK_CENTER_SETTINGS } from '@/lib/mock-data';
import type { CenterSettings } from '@/lib/types';

const MOCK = useMockFor('settings');

/** In-memory mock store for settings persistence */
let mockSettings: CenterSettings = { ...MOCK_CENTER_SETTINGS };

export function useCenterSettings() {
  return useSWR<CenterSettings>(
    'center-settings',
    async () => {
      if (MOCK) {
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
  if (MOCK) {
    mockSettings = { ...mockSettings, ...updates };
    mutate('center-settings');
    return mockSettings;
  }
  // Future: api.settings.update(updates)
  mutate('center-settings');
  return mockSettings;
}
