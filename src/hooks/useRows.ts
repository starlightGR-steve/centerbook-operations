import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { MOCK_ROW_ASSIGNMENTS, MOCK_STUDENTS } from '@/lib/mock-data';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import type { RowAssignment, AssignRowRequest } from '@/lib/types';

/** Fetch row assignments for a specific row on a given date */
export function useRowAssignments(rowNumber: number, date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  const { isDemoMode } = useDemoMode();

  return useSWR<RowAssignment[]>(
    isDemoMode ? `demo-row-${rowNumber}-${d}` : `row-${rowNumber}-${d}`,
    async () => {
      if (isDemoMode) {
        return MOCK_ROW_ASSIGNMENTS
          .filter((r) => r.row_number === rowNumber && r.assigned_date === d)
          .map((r) => ({
            ...r,
            student: MOCK_STUDENTS.find((s) => s.id === r.student_id),
          }));
      }
      return api.rows.forRow(rowNumber, d);
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Assign a student to a row */
export async function assignToRow(data: AssignRowRequest): Promise<RowAssignment> {
  if (isDemoModeActive()) {
    mutate(`demo-row-${data.row_number}-${data.date}`);
    return { id: Date.now(), student_id: data.student_id, row_number: data.row_number, assigned_date: data.date, assigned_by: null, created_at: new Date().toISOString() };
  }
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
  if (isDemoModeActive()) {
    mutate(`demo-row-${rowNumber}-${date}`);
    return;
  }
  await api.rows.remove(assignmentId);
  mutate(`row-${rowNumber}-${date}`);
}
