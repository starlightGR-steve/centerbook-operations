import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import { MOCK_ROW_ASSIGNMENTS } from '@/lib/mock-data';
import type { RowAssignment, AssignRowRequest, RowTeacher, AssignRowTeacherRequest } from '@/lib/types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** SWR key for classroom assignments */
function assignmentsKey(date: string, demo: boolean) {
  return demo ? `demo-classroom-${date}` : `classroom-assignments-${date}`;
}

function teachersKey(date: string, demo: boolean) {
  return demo ? `demo-teachers-${date}` : `classroom-teachers-${date}`;
}

// ── Student Row Assignments ────────────────

/** Fetch all row assignments for a date (default: today) */
export function useClassroomAssignments(date?: string) {
  const d = date || todayStr();
  const { isDemoMode } = useDemoMode();

  return useSWR<RowAssignment[]>(
    assignmentsKey(d, isDemoMode),
    async () => {
      if (isDemoMode) {
        return MOCK_ROW_ASSIGNMENTS
          .filter((r) => r.assigned_date === d)
          .map((r) => ({
            id: r.id,
            session_date: r.assigned_date,
            student_id: r.student_id,
            row_label: `Row ${r.row_number}`,
            assigned_at: r.created_at,
            assigned_by: null,
          }));
      }
      return api.classroom.assignments(d);
    },
    {
      dedupingInterval: isDemoMode ? 60000 : 5000,
      refreshInterval: isDemoMode ? 0 : 5000,
      revalidateOnFocus: !isDemoMode,
    }
  );
}

/** Build a lookup: studentId -> row id from assignments array */
export function buildOverridesMap(
  assignments: RowAssignment[] | undefined,
  rowLabelToId: Record<string, string>
): Record<string, string> {
  if (!assignments) return {};
  const map: Record<string, string> = {};
  assignments.forEach((a) => {
    const rowId = rowLabelToId[a.row_label];
    if (rowId) {
      map[String(a.student_id)] = rowId;
    }
  });
  return map;
}

/** Assign a student to a row (persisted) */
export async function assignStudentToRow(data: AssignRowRequest): Promise<RowAssignment> {
  if (isDemoModeActive()) {
    globalMutate(assignmentsKey(data.session_date, true));
    return {
      id: Date.now(),
      session_date: data.session_date,
      student_id: data.student_id,
      row_label: data.row_label,
      assigned_at: new Date().toISOString(),
      assigned_by: data.assigned_by || null,
    };
  }
  const result = await api.classroom.assign(data);
  globalMutate(assignmentsKey(data.session_date, false));
  return result;
}

/** Remove a student's row assignment */
export async function removeStudentFromRow(
  studentId: number,
  date?: string
): Promise<void> {
  const d = date || todayStr();
  if (isDemoModeActive()) {
    globalMutate(assignmentsKey(d, true));
    return;
  }
  await api.classroom.unassign(studentId, d);
  globalMutate(assignmentsKey(d, false));
}

// ── Teacher Row Assignments ────────────────

/** Fetch all teacher-to-row assignments for a date */
export function useClassroomTeachers(date?: string) {
  const d = date || todayStr();
  const { isDemoMode } = useDemoMode();

  return useSWR<RowTeacher[]>(
    teachersKey(d, isDemoMode),
    async () => {
      if (isDemoMode) return [];
      return api.classroom.teachers(d);
    },
    { dedupingInterval: isDemoMode ? 60000 : 10000, revalidateOnFocus: !isDemoMode }
  );
}

/** Assign a teacher to a row */
export async function assignTeacherToRow(data: AssignRowTeacherRequest): Promise<RowTeacher> {
  if (isDemoModeActive()) {
    globalMutate(teachersKey(data.session_date, true));
    return {
      id: Date.now(),
      session_date: data.session_date,
      row_label: data.row_label,
      staff_id: data.staff_id,
      assigned_at: new Date().toISOString(),
    };
  }
  const result = await api.classroom.assignTeacher(data);
  globalMutate(teachersKey(data.session_date, false));
  return result;
}
