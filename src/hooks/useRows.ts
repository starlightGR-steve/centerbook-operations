import useSWR, { mutate } from 'swr';
import { api, useMockFor } from '@/lib/api';
import { MOCK_ROW_ASSIGNMENTS, MOCK_STUDENTS } from '@/lib/mock-data';
import type { RowAssignment, AssignRowRequest } from '@/lib/types';

const MOCK = useMockFor('rows');

/** Fetch row assignments for a specific row on a given date */
export function useRowAssignments(rowNumber: number, date?: string) {
  const d = date || new Date().toISOString().split('T')[0];

  return useSWR<RowAssignment[]>(
    `row-${rowNumber}-${d}`,
    async () => {
      if (MOCK) {
        return MOCK_ROW_ASSIGNMENTS.filter(
          (a) => a.row_number === rowNumber && a.assigned_date === d
        ).map((a) => ({
          ...a,
          student: MOCK_STUDENTS.find((s) => s.id === a.student_id),
        }));
      }
      return api.rows.forRow(rowNumber, d);
    },
    { dedupingInterval: 5000 }
  );
}

/** Assign a student to a row */
export async function assignToRow(data: AssignRowRequest): Promise<RowAssignment> {
  if (MOCK) {
    const assignment: RowAssignment = {
      id: Date.now(),
      student_id: data.student_id,
      row_number: data.row_number,
      assigned_date: data.date,
      assigned_by: null,
      created_at: new Date().toISOString(),
    };
    mutate(`row-${data.row_number}-${data.date}`);
    return assignment;
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
  if (MOCK) {
    mutate(`row-${rowNumber}-${date}`);
    return;
  }
  await api.rows.remove(assignmentId);
  mutate(`row-${rowNumber}-${date}`);
}
