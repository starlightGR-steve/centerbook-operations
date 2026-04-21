/**
 * Date helpers anchored to the center's local timezone.
 *
 * Why this exists: raw `new Date().toISOString().split('T')[0]` returns the UTC
 * day, which rolls forward to the next day during evening hours in
 * America/Detroit. SWR cache keys built from UTC date split-brain against the
 * attendance keys built from center-local date, dropping students from row
 * assignment buckets after ~8 PM local time.
 *
 * Hardcoded America/Detroit for now. cb_center_settings.timezone integration
 * is a separate concern; once wired, callers in component scope can pass
 * `useCenterSettings().data?.timezone` to override.
 *
 * Established pattern matches commits c8595a6 (useAttendance.centerToday) and
 * 036b7f4 (StudentAttendanceLog).
 */

const DEFAULT_CENTER_TIMEZONE = 'America/Detroit';

/** Returns today in YYYY-MM-DD format, anchored to the center's timezone.
 *  en-CA locale is the established way to get ISO-style YYYY-MM-DD output. */
export function getCenterToday(timezone: string = DEFAULT_CENTER_TIMEZONE): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}
