import useSWR from 'swr';
import { api } from '@/lib/api';
import { MOCK_LEVEL_HISTORY } from '@/lib/mock-data';
import { useDemoMode } from '@/context/MockDataContext';
import type { LevelHistoryEntry } from '@/lib/types';

export function useLevelHistory(studentId: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<LevelHistoryEntry[]>(
    studentId ? (isDemoMode ? `demo-level-history-${studentId}` : `level-history-${studentId}`) : null,
    async () => {
      if (!studentId) return [];
      if (isDemoMode) {
        return MOCK_LEVEL_HISTORY.filter((e) => e.student_id === studentId);
      }
      return api.levelHistory.forStudent(studentId);
    },
    { dedupingInterval: isDemoMode ? 60000 : 10000, revalidateOnFocus: !isDemoMode }
  );
}
