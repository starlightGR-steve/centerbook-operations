import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { RowAssignment, AssignRowRequest } from '@/lib/types';

/** Fetch row assignments for a specific row on a given date */
export function useRowAssignments(rowNumber: number, date?: string) {
  const d = date || new Date().toISOString().split('T')[0];

  return useSWR<RowAssignment[]>(
    `row-${rowNumber}-${d}`,
    async () => {
      return api.rows.forRow(rowNumber, d);
    },
    { dedupingInterval: 5000 }
  );
}

/** Assign a student to a row */
export async function assignToRow(data: AssignRowRequest): Promise<RowAssignment> {
  const result = await api.rows.assign(data);
  mutate(`row-${data.row_number}-${data.date}`);
  return result;
}

/** Remove a row assignment */
export async function removeFromRow(
  assignmentId: number,
  rowNumber: number,
  date: string
): Promise<void> {
  await api.rows.remove(assignmentId);
  mutate(`row-${rowNumber}-${date}`);
}
