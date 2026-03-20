import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';
import { useDemoMode, isDemoModeActive } from '@/context/MockDataContext';
import { MOCK_ROW_ASSIGNMENTS } from '@/lib/mock-data';
import type { RowAssignment, RowAssignmentFlags, AssignRowRequest, RowTeacher, AssignRowTeacherRequest } from '@/lib/types';

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
            row_label: r.row_label || `Row ${r.row_number}`,
            assigned_at: r.created_at,
            assigned_by: null,
            flags: r.flags || null,
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
    // Upsert into mock array so SWR refetch picks it up
    const idx = MOCK_ROW_ASSIGNMENTS.findIndex(
      (r) => r.student_id === data.student_id && r.assigned_date === data.session_date
    );
    const entry = {
      id: idx >= 0 ? MOCK_ROW_ASSIGNMENTS[idx].id : Date.now(),
      student_id: data.student_id,
      row_number: 0,
      assigned_date: data.session_date,
      assigned_by: 0,
      created_at: new Date().toISOString(),
      row_label: data.row_label,
    };
    if (idx >= 0) {
      MOCK_ROW_ASSIGNMENTS[idx] = entry;
    } else {
      MOCK_ROW_ASSIGNMENTS.push(entry);
    }
    globalMutate(assignmentsKey(data.session_date, true));
    return {
      id: entry.id,
      session_date: data.session_date,
      student_id: data.student_id,
      row_label: data.row_label,
      assigned_at: entry.created_at,
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
    // Remove from mock array so SWR refetch picks it up
    const idx = MOCK_ROW_ASSIGNMENTS.findIndex(
      (r) => r.student_id === studentId && r.assigned_date === d
    );
    if (idx >= 0) MOCK_ROW_ASSIGNMENTS.splice(idx, 1);
    globalMutate(assignmentsKey(d, true));
    return;
  }
  await api.classroom.unassign(studentId, d);
  globalMutate(assignmentsKey(d, false));
}

/** Update flags on a student's row assignment */
export async function updateStudentFlags(
  studentId: number,
  flags: RowAssignmentFlags,
  date?: string
): Promise<void> {
  const d = date || todayStr();
  if (isDemoModeActive()) {
    globalMutate(assignmentsKey(d, true));
    return;
  }
  await api.classroom.updateFlags(studentId, flags, d);
  globalMutate(assignmentsKey(d, false));
}

/** Build a flags lookup: studentId -> RowAssignmentFlags from assignments */
export function buildFlagsMap(
  assignments: RowAssignment[] | undefined
): Record<number, RowAssignmentFlags> {
  if (!assignments) return {};
  const map: Record<number, RowAssignmentFlags> = {};
  assignments.forEach((a) => {
    if (a.flags) map[a.student_id] = a.flags;
  });
  return map;
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
    { dedupingInterval: isDemoMode ? 60000 : 5000, refreshInterval: isDemoMode ? 0 : 5000, revalidateOnFocus: !isDemoMode }
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
