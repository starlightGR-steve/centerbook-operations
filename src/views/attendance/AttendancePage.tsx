'use client';

import { useState, useMemo, useCallback } from 'react';
import { Send, CheckCircle2, Clock, AlertTriangle, UserCheck, CalendarPlus, Pencil } from 'lucide-react';
import AttendanceEditModal from '@/components/AttendanceEditModal';
import SectionHeader from '@/components/ui/SectionHeader';
import SubjectBadges from '@/components/SubjectBadges';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
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
  const [makeupPopupStudent, setMakeupPopupStudent] = useState<Student | null>(null);
  const [makeupDay, setMakeupDay] = useState<string | null>(null);
  const [makeupTime, setMakeupTime] = useState('16:00');
  const [makeupScheduled, setMakeupScheduled] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editAttendance, setEditAttendance] = useState<{ attendance: import('@/lib/types').Attendance; studentName: string } | null>(null);

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

  const handleExcuse = (student: Student) => {
    setMakeupPopupStudent(student);
    setMakeupDay(null);
    setMakeupTime('16:00');
  };

  const MAKEUP_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const MAKEUP_DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

  const handleScheduleMakeup = useCallback(() => {
    if (!makeupPopupStudent || !makeupDay) return;
    const sid = String(makeupPopupStudent.id);
    // Format time for display
    const [h, m] = makeupTime.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const displayTime = `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
    const label = `${MAKEUP_DAY_SHORT[makeupDay]} ${displayTime}`;

    setMakeupScheduled((prev) => ({ ...prev, [sid]: label }));
    setExcusedStudents((prev) => new Set(prev).add(sid));
    setMakeupPopupStudent(null);
    setToastMessage(`Makeup scheduled: ${makeupPopupStudent.first_name} ${makeupPopupStudent.last_name} — ${label}`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [makeupPopupStudent, makeupDay, makeupTime]);

  const handleSkipMakeup = useCallback(() => {
    if (!makeupPopupStudent) return;
    setExcusedStudents((prev) => new Set(prev).add(String(makeupPopupStudent.id)));
    setMakeupPopupStudent(null);
  }, [makeupPopupStudent]);

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
                          onClick={() => handleExcuse(s)}
                        >
                          Mark Excused
                        </button>
                      </div>
                      {error && <p className={styles.cardError}>{error}</p>}
                    </div>
                  );
                })}
                {excusedList.map((s) => {
                  const sid = String(s.id);
                  const makeup = makeupScheduled[sid];
                  return (
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
                      {makeup && (
                        <p className={styles.makeupLine}>
                          <CalendarPlus size={11} /> Makeup: {makeup}
                        </p>
                      )}
                    </div>
                  );
                })}
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
                {checkedInStudents.map((s) => {
                  const att = checkedIn?.find((a) => a.student_id === s.id);
                  return (
                    <div key={s.id} className={styles.attendanceCard}>
                      <div className={styles.cardTop}>
                        <h4 className={styles.cardName}>
                          {s.first_name} {s.last_name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <SubjectBadges subjects={parseSubjects(s.subjects)} />
                          {att && (
                            <button
                              className={styles.editBtn}
                              onClick={() => setEditAttendance({ attendance: att, studentName: `${s.first_name} ${s.last_name}` })}
                              aria-label={`Edit attendance for ${s.first_name} ${s.last_name}`}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={styles.cardTime}>
                        Scheduled: {formatTimeKey(s.class_time_sort_key)}
                      </p>
                    </div>
                  );
                })}
                {checkedInStudents.length === 0 && (
                  <p className={styles.emptyCol}>No students checked in yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Makeup Scheduling Modal */}
      <Modal
        open={!!makeupPopupStudent}
        onClose={() => setMakeupPopupStudent(null)}
        title="Schedule Makeup Session"
        subtitle={makeupPopupStudent ? `${makeupPopupStudent.first_name} ${makeupPopupStudent.last_name}` : ''}
        maxWidth="400px"
      >
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--neutral)', fontFamily: 'var(--font-primary)' }}>
          Select a day and time for the makeup class, or skip to mark as excused without a makeup.
        </p>

        {/* Day buttons */}
        <div className={styles.makeupDays}>
          {MAKEUP_DAYS.map((day) => (
            <button
              key={day}
              className={`${styles.makeupDayBtn} ${makeupDay === day ? styles.makeupDayActive : ''}`}
              onClick={() => setMakeupDay(day)}
            >
              {MAKEUP_DAY_SHORT[day]}
            </button>
          ))}
        </div>

        {/* Time selector */}
        <div style={{ margin: '12px 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral)', fontFamily: 'var(--font-primary)' }}>
            Time:
          </label>
          <input
            type="time"
            value={makeupTime}
            onChange={(e) => setMakeupTime(e.target.value)}
            className={styles.makeupTimeInput}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className={styles.makeupSkipBtn} onClick={handleSkipMakeup}>
            Skip
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleScheduleMakeup}
            disabled={!makeupDay}
          >
            Schedule Makeup
          </Button>
        </div>
      </Modal>

      {editAttendance && (
        <AttendanceEditModal
          attendance={editAttendance.attendance}
          studentName={editAttendance.studentName}
          onClose={() => setEditAttendance(null)}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div className={styles.toast}>
          <CheckCircle2 size={14} />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
