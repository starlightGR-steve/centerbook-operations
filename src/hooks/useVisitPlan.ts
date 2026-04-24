import useSWR from 'swr';
import { api } from '@/lib/api';
import type { VisitPlanItem } from '@/lib/types';

export function useVisitPlan(studentId: number | null) {
  const key = studentId ? `visit-plan-${studentId}` : null;
  const { data, error, mutate } = useSWR<VisitPlanItem[]>(
    key,
    () => api.visitPlan.list(studentId!, 'all'),
    { dedupingInterval: 10000 }
  );

  const activeItems = (data || []).filter((i) => !i.completed_at);
  const completedItems = (data || []).filter((i) => !!i.completed_at);

  const addItems = async (
    items: Array<{
      item_key: string;
      item_type: string;
      item_label?: string;
      item_subject?: string;
      item_level?: string;
      notes?: string;
    }>
  ) => {
    await api.visitPlan.create(studentId!, items);
    mutate();
  };

  const markDone = async (itemId: number) => {
    await api.visitPlan.update(studentId!, itemId, { completed: true });
    mutate();
  };

  const reopen = async (itemId: number) => {
    await api.visitPlan.update(studentId!, itemId, { completed: false });
    mutate();
  };

  const removeItem = async (itemId: number) => {
    await api.visitPlan.remove(studentId!, itemId);
    mutate();
  };

  return {
    activeItems,
    completedItems,
    allItems: data || [],
    addItems,
    markDone,
    reopen,
    removeItem,
    mutate,
    isLoading: !data && !error,
  };
}
