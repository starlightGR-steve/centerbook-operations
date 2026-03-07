'use client';

import { useState, useMemo } from 'react';
import { Send, CheckCircle2, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SubjectBadges from '@/components/SubjectBadges';
import { useStudents } from '@/hooks/useStudents';
import { useCheckedInStudents } from '@/hooks/useAttendance';
import { parseSubjects, formatTimeKey } from '@/lib/types';
import type { Student } from '@/lib/types';
import styles from './AttendancePage.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getToday(): string {
  return DAY_NAMES[new Date().getDay()];
}

function isNoShow(student: Student): boolean {
  if (!student.class_time_sort_key) return false;
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const nowKey = h * 100 + m;
  // 15+ minutes past their scheduled time
  const scheduledMinutes = Math.floor(student.class_time_sort_key / 100) * 60 + (student.class_time_sort_key % 100);
  const nowMinutes = h * 60 + m;
  return nowMinutes - scheduledMinutes >= 15;
}

export default function AttendancePage() {
  const { data: allStudents } = useStudents();
  const { data: checkedIn } = useCheckedInStudents(undefined, 10000);
  const [sentMissedYou, setSentMissedYou] = useState<Set<string>>(new Set());
  const [sendingMissedYou, setSendingMissedYou] = useState<Set<string>>(new Set());
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const [excusedStudents, setExcusedStudents] = useState<Set<string>>(new Set());

  const today = getToday();

  const checkedInIds = useMemo(() => {
    if (!checkedIn) return new Set<number>();
    return new Set(checkedIn.map((a) => a.student_id));
  }, [checkedIn]);

  const expected = useMemo(() => {
    if (!allStudents) return [];
    return allStudents.filter((s) => {
      if (s.enrollment_status !== 'Active') return false;
      if (!s.class_schedule_days) return false;
      return s.class_schedule_days
        .split(',')
        .map((d) => d.trim())
        .includes(today);
    });
  }, [allStudents, today]);

  const checkedInStudents = useMemo(
    () => expected.filter((s) => checkedInIds.has(s.id)),
    [expected, checkedInIds]
  );

  const notCheckedIn = useMemo(
    () => expected.filter((s) => !checkedInIds.has(s.id)),
    [expected, checkedInIds]
  );

  const noShowStudents = useMemo(
    () => notCheckedIn.filter((s) => isNoShow(s) && !excusedStudents.has(String(s.id))),
    [notCheckedIn, excusedStudents]
  );

  const waitingStudents = useMemo(
    () => notCheckedIn.filter((s) => !isNoShow(s)),
    [notCheckedIn]
  );

  const handleMissedYou = async (student: Student) => {
    const sid = String(student.id);
    setSendingMissedYou((prev) => new Set(prev).add(sid));
    setSendErrors((prev) => { const next = { ...prev }; delete next[sid]; return next; });
    try {
      const res = await fetch('/api/attendance/missed-you', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          contactId: student.primary_contact_id,
        }),
      });
      const data = await res.json();
      if (res.ok || data.error === 'Endpoint not yet available') {
        setSentMissedYou((prev) => new Set(prev).add(sid));
      } else {
        setSendErrors((prev) => ({ ...prev, [sid]: data.error || 'Failed to send' }));
      }
    } catch {
      setSendErrors((prev) => ({ ...prev, [sid]: 'Network error' }));
    } finally {
      setSendingMissedYou((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    }
  };

  const handleExcuse = (studentId: number) => {
    setExcusedStudents((prev) => new Set(prev).add(String(studentId)));
  };

  const isLoading = !allStudents || !checkedIn;

  // Excused students shown separately in the no-show column
  const excusedList = useMemo(
    () => notCheckedIn.filter((s) => isNoShow(s) && excusedStudents.has(String(s.id))),
    [notCheckedIn, excusedStudents]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Today's"
          title="Attendance"
          subtitle={`${today} — ${expected.length} students expected`}
        />
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCol}>
                <div className={styles.skeletonHeader} />
                {[0, 1, 2].map((j) => (
                  <div key={j} className={styles.skeletonCard} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.columns}>
            {/* No-Show Column */}
            <div className={styles.column}>
              <div className={`${styles.colHeader} ${styles.colHeaderNoShow}`}>
                <AlertTriangle size={16} />
                <span>No-Show</span>
                <span className={styles.colBadge}>{noShowStudents.length}</span>
              </div>
              <div className={styles.colBody}>
                {noShowStudents.map((s) => {
                  const sid = String(s.id);
                  const isSent = sentMissedYou.has(sid);
                  const isSending = sendingMissedYou.has(sid);
                  const error = sendErrors[sid];
                  return (
                    <div key={s.id} className={styles.attendanceCard}>
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>
                          {s.first_name} {s.last_name}
                        </h4>
                        <SubjectBadges subjects={parseSubjects(s.subjects)} />
                      </div>
                      <p className={styles.cardTime}>
                        Scheduled: {formatTimeKey(s.class_time_sort_key)}
                      </p>
                      <div className={styles.cardActions}>
                        {isSent ? (
                          <span className={styles.sentBadge}>
                            <CheckCircle2 size={12} /> Sent
                          </span>
                        ) : (
                          <button
                            className={styles.missedYouBtn}
                            onClick={() => handleMissedYou(s)}
                            disabled={isSending}
                          >
                            <Send size={12} />
                            {isSending ? 'Sending...' : 'We Missed You'}
                          </button>
                        )}
                        <button
                          className={styles.excuseBtn}
                          onClick={() => handleExcuse(s.id)}
                        >
                          Mark Excused
                        </button>
                      </div>
                      {error && <p className={styles.cardError}>{error}</p>}
                    </div>
                  );
                })}
                {excusedList.map((s) => (
                  <div key={s.id} className={`${styles.attendanceCard} ${styles.cardExcused}`}>
                    <div className={styles.cardTop}>
                      <h4 className={styles.cardName}>
                        {s.first_name} {s.last_name}
                      </h4>
                      <span className={styles.excusedBadge}>Excused</span>
                    </div>
                    <p className={styles.cardTime}>
                      Scheduled: {formatTimeKey(s.class_time_sort_key)}
                    </p>
                  </div>
                ))}
                {noShowStudents.length === 0 && excusedList.length === 0 && (
                  <p className={styles.emptyCol}>No absences yet.</p>
                )}
              </div>
            </div>

            {/* Expected Column */}
            <div className={styles.column}>
              <div className={`${styles.colHeader} ${styles.colHeaderExpected}`}>
                <Clock size={16} />
                <span>Expected</span>
                <span className={styles.colBadge}>{waitingStudents.length}</span>
              </div>
              <div className={styles.colBody}>
                {waitingStudents.map((s) => (
                  <div key={s.id} className={styles.attendanceCard}>
                    <div className={styles.cardTop}>
                      <h4 className={styles.cardName}>
                        {s.first_name} {s.last_name}
                      </h4>
                      <SubjectBadges subjects={parseSubjects(s.subjects)} />
                    </div>
                    <p className={styles.cardTime}>
                      Scheduled: {formatTimeKey(s.class_time_sort_key)}
                    </p>
                  </div>
                ))}
                {waitingStudents.length === 0 && (
                  <p className={styles.emptyCol}>All expected students accounted for.</p>
                )}
              </div>
            </div>

            {/* Checked In Column */}
            <div className={styles.column}>
              <div className={`${styles.colHeader} ${styles.colHeaderCheckedIn}`}>
                <UserCheck size={16} />
                <span>Checked In</span>
                <span className={styles.colBadge}>{checkedInStudents.length}</span>
              </div>
              <div className={styles.colBody}>
                {checkedInStudents.map((s) => (
                  <div key={s.id} className={styles.attendanceCard}>
                    <div className={styles.cardTop}>
                      <h4 className={styles.cardName}>
                        {s.first_name} {s.last_name}
                      </h4>
                      <SubjectBadges subjects={parseSubjects(s.subjects)} />
                    </div>
                    <p className={styles.cardTime}>
                      Scheduled: {formatTimeKey(s.class_time_sort_key)}
                    </p>
                  </div>
                ))}
                {checkedInStudents.length === 0 && (
                  <p className={styles.emptyCol}>No students checked in yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
