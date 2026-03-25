import useSWR from 'swr';
import { api } from '@/lib/api';
import type { LevelHistoryEntry } from '@/lib/types';

export function useLevelHistory(studentId: number | null) {
  return useSWR<LevelHistoryEntry[]>(
    studentId ? `level-history-${studentId}` : null,
    async () => {
      if (!studentId) return [];
      return api.levelHistory.forStudent(studentId);
    },
    { dedupingInterval: 10000 }
  );
}
