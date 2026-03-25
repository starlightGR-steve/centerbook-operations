import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Family, PipelineSummary, CreateFamilyRequest } from '@/lib/types';

export function usePipelineSummary() {
  return useSWR<PipelineSummary>(
    'pipeline-summary',
    async () => {
      return api.pipeline.summary();
    },
    { dedupingInterval: 10000 }
  );
}

export function useFamilies(status?: string) {
  const key = status ? `families-${status}` : 'families-all';

  return useSWR<Family[]>(
    key,
    async () => {
      return api.pipeline.families(status);
    },
    { dedupingInterval: 10000 }
  );
}

/** Create a new family lead */
export async function createFamilyLead(data: CreateFamilyRequest): Promise<Family> {
  const result = await api.pipeline.createFamily(data);
  mutate('families-all');
  mutate('pipeline-summary');
  return result;
}

/** Update a family's status (or other fields) */
export async function updateFamilyStatus(id: number, updates: Partial<Family>): Promise<Family> {
  const result = await api.pipeline.updateFamily(id, updates);
  mutate('families-all');
  mutate('pipeline-summary');
  return result;
}
