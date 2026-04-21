import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/api';
import { getCenterToday } from '@/lib/dates';
import type { Attendance, RowAssignment, RowAssignmentFlags, AssignRowRequest, RowTeacher, AssignRowTeacherRequest } from '@/lib/types';

function todayStr(): string {
  return getCenterToday();
}

/** SWR key for classroom assignments */
function assignmentsKey(date: string) {
  return `classroom-assignments-${date}`;
}

/** SWR key for the session-scoped active-assignments cache (v2.51.0+). */
const ASSIGNMENTS_ACTIVE_KEY = 'classroom-assignments-active';

function teachersKey(date: string) {
  return `classroom-teachers-${date}`;
}

/** Look up an open attendance record's id for a given student. Used by classroom
 *  write call sites to bind row assignments to the active session under v2.51.0+. */
export function getAttendanceIdForStudent(
  activeAttendance: Attendance[] | undefined,
  studentId: number
): number | undefined {
  return activeAttendance?.find((a) => a.student_id === studentId)?.id;
}

// ── Student Row Assignments ────────────────

/** Normalize a raw assignment record from the API.
 *  - parses flags JSON-string into a structured object
 *  - leaves attendance_id alone (may be undefined on legacy records) */
function normalizeAssignment(a: RowAssignment): RowAssignment {
  return {
    ...a,
    flags: typeof a.flags === 'string'
      ? (() => { try { return JSON.parse(a.flags as unknown as string); } catch { return null; } })()
      : (a.flags ?? null),
  };
}

/** Fetch all row assignments for a date (default: center-today). Date-scoped;
 *  prefer useClassroomAssignmentsActive() for Live Class surfaces. */
export function useClassroomAssignments(date?: string) {
  const d = date || todayStr();

  return useSWR<RowAssignment[]>(
    assignmentsKey(d),
    async () => {
      const data = await api.classroom.assignments(d);
      return data.map(normalizeAssignment);
    },
    {
      dedupingInterval: 5000,
      refreshInterval: 5000,
    }
  );
}

/** Fetch row assignments for all currently-active check-ins (session-scoped, v2.51.0+).
 *  Returns assignments where the linked attendance row has check_out IS NULL,
 *  regardless of session_date. Use this for Live Class surfaces (Row View, Whole
 *  Class, Edit Class Prep, AssignStudentPicker) so cards survive midnight rollover
 *  and don't depend on date-keyed lookups. */
export function useClassroomAssignmentsActive() {
  return useSWR<RowAssignment[]>(
    ASSIGNMENTS_ACTIVE_KEY,
    async () => {
      const data = await api.classroom.assignmentsActive();
      return data.map(normalizeAssignment);
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

/** Assign a student to a row (persisted). Optimistically updates both the
 *  date-keyed and active-keyed caches so legacy and new surfaces stay in sync. */
export async function assignStudentToRow(data: AssignRowRequest): Promise<RowAssignment> {
  const key = assignmentsKey(data.session_date);
  const optimistic: RowAssignment = {
    id: -Date.now(),
    session_date: data.session_date,
    student_id: data.student_id,
    row_label: data.row_label,
    assigned_at: new Date().toISOString(),
    assigned_by: data.assigned_by || null,
    attendance_id: data.attendance_id ?? null,
  };
  const upsertOptimistic = (current: RowAssignment[] | undefined) => {
    const filtered = (current || []).filter((r) => r.student_id !== data.student_id);
    return [...filtered, optimistic];
  };
  globalMutate(key, upsertOptimistic, { revalidate: false });
  globalMutate(ASSIGNMENTS_ACTIVE_KEY, upsertOptimistic, { revalidate: false });
  const result = await api.classroom.assign(data);
  globalMutate(key);
  globalMutate(ASSIGNMENTS_ACTIVE_KEY);
  return result;
}

/** Remove a student's row assignment */
export async function removeStudentFromRow(
  studentId: number,
  date?: string
): Promise<void> {
  const d = date || todayStr();
  const key = assignmentsKey(d);
  const optimisticRemove = (current: RowAssignment[] | undefined) =>
    (current || []).filter((r) => r.student_id !== studentId);
  globalMutate(key, optimisticRemove, { revalidate: false });
  globalMutate(ASSIGNMENTS_ACTIVE_KEY, optimisticRemove, { revalidate: false });
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
  globalMutate(ASSIGNMENTS_ACTIVE_KEY);
}

/** Update flags on a student's row assignment.
 *  attendanceId is optional but preferred under v2.51.0+. */
export async function updateStudentFlags(
  studentId: number,
  flags: RowAssignmentFlags,
  date?: string,
  attendanceId?: number,
): Promise<void> {
  const d = date || todayStr();
  const key = assignmentsKey(d);
  const optimisticPatch = (current: RowAssignment[] | undefined) => {
    if (!current) return current;
    return current.map((a) => a.student_id === studentId ? { ...a, flags } : a);
  };
  globalMutate(key, optimisticPatch, { revalidate: false });
  globalMutate(ASSIGNMENTS_ACTIVE_KEY, optimisticPatch, { revalidate: false });
  await api.classroom.updateFlags(studentId, flags, d, attendanceId);
  globalMutate(key);
  globalMutate(ASSIGNMENTS_ACTIVE_KEY);
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
