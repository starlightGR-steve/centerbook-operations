/**
 * 86ah3f3xp Finding 2A: client-side staging for class-prep data collected at
 * check-in. The check-in popup gathers flags/checklist/teacher notes before a
 * student has a classroom_assignments row, so we can't PATCH them server-side
 * until the student is assigned to a row in Live Class. Stash here at check-in;
 * RowsPage.moveStudentToRow consumes and PATCHes onto the new assignment.
 *
 * Per-tablet (localStorage). If a different tablet does the row assignment,
 * the stash is lost — that's acceptable single-tablet behavior; multi-tablet
 * sync would need a backend column.
 */

const KEY_PREFIX = 'cbops.pendingClassPrep.';

export interface PendingClassPrep {
  flags: string[];
  checklist: string[];
  noteForTeacher: string;
  teacherNotes: Array<{ text: string; done: boolean }>;
  /** attendance row id this prep was captured for; consumers verify match before
   *  applying so a stash from a previous session can't bleed into a new one. */
  attendanceId: number;
}

function key(studentId: number): string {
  return `${KEY_PREFIX}${studentId}`;
}

export function stashPendingClassPrep(studentId: number, prep: PendingClassPrep): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(studentId), JSON.stringify(prep));
  } catch {
    // Quota or disabled storage — silently no-op.
  }
}

export function readPendingClassPrep(studentId: number): PendingClassPrep | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(studentId));
    if (!raw) return null;
    return JSON.parse(raw) as PendingClassPrep;
  } catch {
    return null;
  }
}

export function clearPendingClassPrep(studentId: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(studentId));
  } catch { /* ignore */ }
}
