import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';

export function useNotifications(staffId: number | null) {
  const key = staffId ? `notifications-${staffId}` : null;
  const countKey = staffId ? `notifications-count-${staffId}` : null;

  const { data, error, mutate } = useSWR<Notification[]>(
    key,
    () => api.notifications.list(staffId!, 'pending'),
    { refreshInterval: 5000 }
  );

  const { data: countData } = useSWR<{ count: number }>(
    countKey,
    () => api.notifications.count(staffId!),
    { refreshInterval: 5000 }
  );

  const dismiss = async (id: number) => {
    await api.notifications.update(id, { status: 'done' });
    mutate();
    globalMutate(countKey);
  };

  const review = async (
    id: number,
    decision: string,
    worksheetInstructions?: string,
    reviewNotes?: string
  ) => {
    await api.notifications.update(id, {
      status: 'reviewed',
      review_decision: decision,
      worksheet_instructions: worksheetInstructions,
      review_notes: reviewNotes,
    });
    mutate();
    globalMutate(countKey);
  };

  return {
    notifications: data || [],
    pendingCount: countData?.count || 0,
    dismiss,
    review,
    mutate,
    isLoading: !data && !error,
  };
}
