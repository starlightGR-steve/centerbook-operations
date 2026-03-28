import useSWR from 'swr';
import { api } from '@/lib/api';

export function usePersistentItems(studentId: number | null) {
  const key = studentId ? `persistent-items-${studentId}` : null;
  const { data, error, mutate } = useSWR(
    key,
    () => api.persistentItems.list(studentId!),
    { dedupingInterval: 30000 }
  );

  const addItem = async (itemKey: string, itemType?: string) => {
    try {
      await api.persistentItems.add(studentId!, itemKey, itemType);
      mutate();
    } catch (err) {
      console.error('Failed to add persistent item:', err);
    }
  };

  const removeItem = async (itemKey: string) => {
    try {
      await api.persistentItems.remove(studentId!, itemKey);
      mutate();
    } catch (err) {
      console.error('Failed to remove persistent item:', err);
    }
  };

  const isStayOn = (itemKey: string) =>
    (data || []).some((p) => p.item_key === itemKey);

  return { items: data || [], addItem, removeItem, isStayOn, mutate, isLoading: !data && !error };
}
