/**
 * Class-prep payload helpers.
 *
 * The CheckInPopup hands AttendancePage a flat `CheckInOptions` shape (arrays
 * of flag keys, checklist keys, and teacher notes). The wire format on
 * cb_attendance.pending_class_prep — and the server-side merge target on
 * cb_row_assignments.flags — is RowAssignmentFlags-shaped. This module is the
 * single place that translates between them, so the same packaging logic
 * applies to:
 *
 *   - POST /attendance/checkin              (initial check-in payload)
 *   - PATCH /attendance/{id}                (Update Class Prep before assignment)
 *   - PATCH /classroom/assignments/{id}     (Update Class Prep after assignment)
 *
 * Custom checklist items use a "__custom__:<text>" sentinel in the popup's
 * selectedChecklist array. Server-side they round-trip as flags.tasks.custom
 * = "<text>" (legacy) or flags.tasks["custom:<text>"] = false (newer shape).
 * buildClassPrepFlags emits the legacy shape — Phase 6c handlers read both.
 */
import type { RowAssignmentFlags } from './types';

export interface ClassPrepInput {
  selectedFlags: string[];
  selectedChecklist: string[];
  noteForTeacher?: string | null;
  teacherNotes?: Array<{ text: string; done: false | boolean }>;
}

const CUSTOM_PREFIX = '__custom__:';

/** Pack the popup's flat selections into a RowAssignmentFlags-shaped object
 *  suitable for cb_attendance.pending_class_prep / cb_row_assignments.flags. */
export function buildClassPrepFlags(input: ClassPrepInput): RowAssignmentFlags {
  const out: Record<string, unknown> = {};
  input.selectedFlags.forEach((key) => {
    out[key] = true;
  });
  const tasks: Record<string, boolean | string> = {};
  input.selectedChecklist.forEach((key) => {
    if (key.startsWith(CUSTOM_PREFIX)) {
      tasks.custom = key.slice(CUSTOM_PREFIX.length);
    } else {
      tasks[key] = false;
    }
  });
  if (Object.keys(tasks).length > 0) out.tasks = tasks;
  if (input.teacherNotes && input.teacherNotes.length > 0) {
    out.teacher_notes = input.teacherNotes;
  } else if (input.noteForTeacher) {
    out.teacher_note = input.noteForTeacher;
  }
  return out as RowAssignmentFlags;
}

/** True when the popup yielded any class-prep at all. Used to skip
 *  the field on the wire when the user just check-ins without prep. */
export function hasAnyClassPrep(input: ClassPrepInput): boolean {
  return (
    input.selectedFlags.length > 0 ||
    input.selectedChecklist.length > 0 ||
    !!input.noteForTeacher ||
    (input.teacherNotes?.length ?? 0) > 0
  );
}
