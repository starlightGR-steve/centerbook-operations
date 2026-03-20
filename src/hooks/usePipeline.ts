import useSWR from 'swr';
import { api } from '@/lib/api';
import { MOCK_FAMILIES, MOCK_PIPELINE_SUMMARY } from '@/lib/mock-data';
import { useDemoMode } from '@/context/MockDataContext';
import type { Family, PipelineSummary } from '@/lib/types';

export function usePipelineSummary() {
  const { isDemoMode } = useDemoMode();

  return useSWR<PipelineSummary>(
    isDemoMode ? 'demo-pipeline-summary' : 'pipeline-summary',
    async () => {
      if (isDemoMode) return MOCK_PIPELINE_SUMMARY;
      return api.pipeline.summary();
    },
    { dedupingInterval: isDemoMode ? 60000 : 10000, revalidateOnFocus: !isDemoMode }
  );
}

export function useFamilies(status?: string) {
  const { isDemoMode } = useDemoMode();
  const key = status
    ? (isDemoMode ? `demo-families-${status}` : `families-${status}`)
    : (isDemoMode ? 'demo-families-all' : 'families-all');

  return useSWR<Family[]>(
    key,
    async () => {
      if (isDemoMode) {
        return status
          ? MOCK_FAMILIES.filter((f) => f.pipeline_status === status)
          : MOCK_FAMILIES;
      }
      return api.pipeline.families(status);
    },
    { dedupingInterval: isDemoMode ? 60000 : 10000, revalidateOnFocus: !isDemoMode }
  );
}
