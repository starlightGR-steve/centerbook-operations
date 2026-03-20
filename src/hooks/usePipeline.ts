import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_FAMILIES, MOCK_PIPELINE_SUMMARY } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { Family, PipelineSummary, CreateFamilyRequest } from '@/lib/types';

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

/** Create a new family lead */
export async function createFamilyLead(data: CreateFamilyRequest): Promise<Family> {
  if (isDemoModeActive()) {
    const family: Family = {
      id: Date.now(),
      family_name: data.family_name,
      primary_contact_name: data.primary_contact_name || '',
      lead_source: data.lead_source || null,
      inquiry_date: data.inquiry_date || new Date().toISOString().split('T')[0],
      pipeline_status: (data.status as Family['pipeline_status']) || 'prospect',
      notes: data.family_notes || null,
      created_at: new Date().toISOString(),
    };
    MOCK_FAMILIES.push(family);
    mutate('demo-families-all');
    mutate('demo-pipeline-summary');
    return family;
  }
  const result = await api.pipeline.createFamily(data);
  mutate('families-all');
  mutate('pipeline-summary');
  return result;
}

/** Update a family's status (or other fields) */
export async function updateFamilyStatus(id: number, updates: Partial<Family>): Promise<Family> {
  if (isDemoModeActive()) {
    const idx = MOCK_FAMILIES.findIndex((f) => f.id === id);
    if (idx >= 0) Object.assign(MOCK_FAMILIES[idx], updates);
    mutate('demo-families-all');
    mutate('demo-pipeline-summary');
    return MOCK_FAMILIES[idx] ?? ({} as Family);
  }
  const result = await api.pipeline.updateFamily(id, updates);
  mutate('families-all');
  mutate('pipeline-summary');
  return result;
}
