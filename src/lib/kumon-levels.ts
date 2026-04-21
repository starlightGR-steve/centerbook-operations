/**
 * Authoritative Kumon level ladders.
 * Source: CenterBook_Kumon_Level_Reference_v1_2.md
 *
 * Math (20 levels): starts at 6A; single-letter from A onward (no I/II split, no 1A).
 * Reading (27 levels): starts at 7A; A-H each split into I/II;
 *   level "I" splits into "II" and "III" (Kumon roman-numeral convention,
 *   NOT level 2 / level 3); J, K, L are single-section.
 */

export const MATH_LEVELS = [
  '6A', '5A', '4A', '3A', '2A',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
] as const;

export const READING_LEVELS = [
  '7A', '6A', '5A', '4A', '3A', '2A',
  'AI', 'AII',
  'BI', 'BII',
  'CI', 'CII',
  'DI', 'DII',
  'EI', 'EII',
  'FI', 'FII',
  'GI', 'GII',
  'HI', 'HII',
  'II', 'III',
  'J', 'K', 'L',
] as const;

export type MathLevel = typeof MATH_LEVELS[number];
export type ReadingLevel = typeof READING_LEVELS[number];

export type KumonSubject = 'math' | 'reading';

export function ladderFor(subject: KumonSubject): readonly string[] {
  return subject === 'math' ? MATH_LEVELS : READING_LEVELS;
}

/**
 * Resolve the dropdown's default level for a student.
 * Returns the student's current level if it appears in the ladder; otherwise
 * the first level in the ladder, with a console warning. Never throws.
 */
export function defaultLevelFor(
  subject: KumonSubject,
  studentId: number,
  currentLevel: string | null | undefined
): string {
  const ladder = ladderFor(subject);
  const trimmed = (currentLevel ?? '').trim();
  if (trimmed && (ladder as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  console.warn(
    `[kumon-levels] student ${studentId} has out-of-ladder ${subject} level "${currentLevel ?? ''}"; defaulting to ${ladder[0]}`
  );
  return ladder[0];
}
