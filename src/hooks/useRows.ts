import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { RowAssignment, RowAssignmentFlags, AssignRowRequest, RowTeacher, AssignRowTeacherRequest } from '@/lib/types';

function todayStr(): string {
  return getCenterToday();
}

/** SWR key for classroom assignments */
function assignmentsKey(date: string) {
  return `classroom-assignments-${date}`;
}

function teachersKey(date: string) {
  return `classroom-teachers-${date}`;
}

// ── Student Row Assignments ────────────────

/** Fetch all row assignments for a date (default: today) */
export function useClassroomAssignments(date?: string) {
  const d = date || todayStr();

  return useSWR<RowAssignment[]>(
    assignmentsKey(d),
    async () => {
      const data = await api.classroom.assignments(d);
      // The API may return flags as a JSON string rather than a parsed object
      return data.map((a) => ({
        ...a,
        flags: typeof a.flags === 'string'
          ? (() => { try { return JSON.parse(a.flags as unknown as string); } catch { return null; } })()
          : (a.flags ?? null),
      }));
    },
    {
      dedupingInterval: 5000,
      refreshInterval: 5000,
    }
  );
}

/** Build a lookup: studentId -> row id from assignments array */
export function buildOverridesMap(
  assignments: RowAssignment[] | undefined,
  rowLabelToId: Record<string, string>
): Record<string, string> {
  if (!assignments) return {};
  // Bug 2 fix: normalize both sides of the row_label lookup. Backend assignments
  // can carry slightly different capitalization or whitespace from the saved
  // classroom config (e.g. "All EL Seats" stored vs "ALL EL Seats" in config),
  // dropping students from their row bucket under strict equality.
  const normalizedLookup: Record<string, string> = {};
  Object.entries(rowLabelToId).forEach(([label, rowId]) => {
    normalizedLookup[label.toLowerCase().trim()] = rowId;
  });

  const map: Record<string, string> = {};
  assignments.forEach((a) => {
    const key = (a.row_label || '').toLowerCase().trim();
    const rowId = normalizedLookup[key];
    if (rowId) {
      map[String(a.student_id)] = rowId;
    }
  });
  return map;
}

/** Assign a student to a row (persisted) */
export async function assignStudentToRow(data: AssignRowRequest): Promise<RowAssignment> {
  const key = assignmentsKey(data.session_date);
  // Optimistically add to cache immediately
  const optimistic: RowAssignment = {
    id: -Date.now(),
    session_date: data.session_date,
    student_id: data.student_id,
    row_label: data.row_label,
    assigned_at: new Date().toISOString(),
    assigned_by: data.assigned_by || null,
  };
  globalMutate(
    key,
    (current: RowAssignment[] | undefined) => {
      const filtered = (current || []).filter((r) => r.student_id !== data.student_id);
      return [...filtered, optimistic];
    },
    { revalidate: false }
  );
  const result = await api.classroom.assign(data);
  globalMutate(key);
  return result;
}

/** Remove a student's row assignment */
export async function removeStudentFromRow(
  studentId: number,
  date?: string
): Promise<void> {
  const d = date || todayStr();
  const key = assignmentsKey(d);
  // Optimistically remove from cache immediately
  globalMutate(
    key,
    (current: RowAssignment[] | undefined) => (current || []).filter((r) => r.student_id !== studentId),
    { revalidate: false }
  );
  try {
    await api.classroom.unassign(studentId, d);
  } catch (err: unknown) {
    // 404 means no assignment exists (stale cache) — just revalidate
    const e = err as Record<string, unknown>;
    const status = e?.status;
    const msg = typeof e?.message === 'string' ? e.message : '';
    const is404 = status === 404 || msg.includes('404') || msg.includes('Not Found');
    if (!is404) throw err;
  }
  globalMutate(key);
}

/** Update flags on a student's row assignment */
export async function updateStudentFlags(
  studentId: number,
  flags: RowAssignmentFlags,
  date?: string
): Promise<void> {
  const d = date || todayStr();
  const key = assignmentsKey(d);
  // Optimistically update flags in cache
  globalMutate(
    key,
    (current: RowAssignment[] | undefined) => {
      if (!current) return current;
      return current.map((a) => a.student_id === studentId ? { ...a, flags } : a);
    },
    { revalidate: false }
  );
  await api.classroom.updateFlags(studentId, flags, d);
  globalMutate(key);
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

  return useSWR<RowTeacher[]>(
    teachersKey(d),
    async () => {
      return api.classroom.teachers(d);
    },
    { dedupingInterval: 5000, refreshInterval: 5000 }
  );
}

/** Assign a teacher to a row */
export async function assignTeacherToRow(data: AssignRowTeacherRequest): Promise<RowTeacher> {
  const result = await api.classroom.assignTeacher(data);
  globalMutate(teachersKey(data.session_date));
  return result;
}
