'use client';

import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Trash2, Video, CalendarX } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import DurationBadge from '@/components/DurationBadge';
import SearchInput from '@/components/ui/SearchInput';
import ExcusedAbsenceModal from '@/components/attendance/ExcusedAbsenceModal';
import { useStudents } from '@/hooks/useStudents';
import { createOverride } from '@/hooks/useScheduleOverrides';
import { api } from '@/lib/api';
import type { AppRole } from '@/lib/auth';
import type { CapacityCell, Student, ScheduleOverride } from '@/lib/types';
import { parseScheduleDays, bucketTimeKey, formatTimeSortKey } from '@/lib/types';
import styles from './SlotDetailModal.module.css';

interface SlotDetailModalProps {
  open: boolean;
  onClose: () => void;
  cell: CapacityCell;
  overrides: ScheduleOverride[];
  onReschedule: (student: Student) => void;
}

export default function SlotDetailModal({
  open,
  onClose,
  cell,
  overrides,
  onReschedule,
}: SlotDetailModalProps) {
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [excuseStudent, setExcuseStudent] = useState<Student | null>(null);

  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const isAdmin = role === 'admin' || role === 'superuser';

  const { data: allStudents, mutate: mutateStudents } = useStudents();

  // Students scheduled for this slot (regular + overrides)
  const scheduledStudents = useMemo(() => {
    if (!allStudents) return [];
    const dateOverrides = overrides.filter((o) => o.effective_date === cell.date);

    // Regular schedule students
    const regular = allStudents.filter(
      (s) =>
        s.enrollment_status === 'Active' &&
        parseScheduleDays(s.class_schedule_days).includes(cell.day) &&
        s.class_time_sort_key !== null &&
        bucketTimeKey(s.class_time_sort_key) === cell.timeSortKey
    );

    // Remove students with 'remove' overrides
    const removedIds = new Set(
      dateOverrides
        .filter((o) => o.override_type === 'remove' && o.original_day === cell.day && o.original_time === cell.timeSortKey)
        .map((o) => o.student_id)
    );
    // Remove students moved OUT of this slot
    const movedOutIds = new Set(
      dateOverrides
        .filter((o) => o.override_type === 'move' && o.original_day === cell.day && o.original_time === cell.timeSortKey)
        .map((o) => o.student_id)
    );

    const filtered = regular.filter((s) => !removedIds.has(s.id) && !movedOutIds.has(s.id));

    // Add students moved/added INTO this slot
    const addedOverrides = dateOverrides.filter(
      (o) =>
        (o.override_type === 'add' || o.override_type === 'move') &&
        o.new_day === cell.day &&
        o.new_time === cell.timeSortKey
    );
    const addedStudents = addedOverrides
      .map((o) => {
        const stu = allStudents.find((s) => s.id === o.student_id);
        return stu ? { student: stu, override: o } : null;
      })
      .filter(Boolean) as { student: Student; override: ScheduleOverride }[];

    return [
      ...filtered.map((s) => ({ student: s, override: null as ScheduleOverride | null })),
      ...addedStudents,
    ];
  }, [allStudents, overrides, cell]);

  // Students available to add (not already in this slot)
  const availableStudents = useMemo(() => {
    if (!allStudents) return [];
    const inSlotIds = new Set(scheduledStudents.map((s) => s.student.id));
    return allStudents
      .filter((s) => s.enrollment_status === 'Active' && !inSlotIds.has(s.id))
      .filter((s) =>
        studentQuery
          ? `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentQuery.toLowerCase())
          : true
      );
  }, [allStudents, scheduledStudents, studentQuery]);

  async function handleToggleZoom(student: Student) {
    const detail = { ...(student.schedule_detail || {}) };
    const dayDetail = detail[cell.day];
    if (!dayDetail) return;
    const isZoom = !dayDetail.is_zoom;
    detail[cell.day] = { ...dayDetail, is_zoom: isZoom };
    await api.students.update(student.id, { schedule_detail: detail, zoom_student: isZoom || undefined } as Partial<Student>);
    mutateStudents();
  }

  async function handleAddStudent(studentId: number) {
    await createOverride({
      student_id: studentId,
      override_type: 'add',
      original_day: null,
      original_time: null,
      new_day: cell.day,
      new_time: cell.timeSortKey,
      effective_date: cell.date,
      reason: 'Scheduled via Logistics',
    });
    setShowStudentSearch(false);
    setStudentQuery('');
  }

  async function handleRemoveStudent(studentId: number) {
    await createOverride({
      student_id: studentId,
      override_type: 'remove',
      original_day: cell.day,
      original_time: cell.timeSortKey,
      new_day: null,
      new_time: null,
      effective_date: cell.date,
      reason: 'Removed via Logistics',
    });
  }

  const dateDisplay = new Date(cell.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
    <Modal open={open} onClose={onClose} title="" maxWidth="580px">
      <div className={styles.header}>
        <h3 className={styles.title}>{cell.day} at {cell.timeDisplay}</h3>
        <p className={styles.date}>{dateDisplay}</p>
        <div className={styles.capacitySummary}>
          <span className={`${styles.capacityBadge} ${styles[`capacity_${cell.stoplightColor}`]}`}>
            {cell.studentCount} students
          </span>
          <span className={styles.capacityText}>
            of {cell.utilization}% capacity
          </span>
        </div>
      </div>

      <div>
        {/* Students */}
        <div>
          <h4 className={styles.columnLabel}>Scheduled Students ({scheduledStudents.length})</h4>
          <div className={styles.list}>
            {scheduledStudents.map(({ student, override }) => (
              <div key={student.id} className={styles.studentRow}>
                <div className={styles.studentInfo}>
                  <span className={styles.studentName}>{student.first_name} {student.last_name}</span>
                  <div className={styles.studentMeta}>
                    <SubjectBadges subjects={student.subjects} />
                    <DurationBadge subjects={student.subjects} scheduleDetail={student.schedule_detail} />
                    {override && (
                      <Badge variant="info">
                        {override.override_type === 'add' ? 'Makeup' : `Moved from ${override.original_day} ${formatTimeSortKey(override.original_time || 0)}`}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={styles.studentActions}>
                  {isAdmin && (
                    <label className={styles.zoomToggle} title="Virtual session">
                      <input
                        type="checkbox"
                        checked={!!student.schedule_detail?.[cell.day]?.is_zoom}
                        onChange={() => handleToggleZoom(student)}
                      />
                      <Video size={12} />
                      <span className={styles.zoomLabel}>Virtual</span>
                    </label>
                  )}
                  {!isAdmin && student.schedule_detail?.[cell.day]?.is_zoom && (
                    <span className={styles.zoomBadge}><Video size={10} /> Virtual</span>
                  )}
                  {isAdmin && (
                    <button
                      className={styles.iconBtnWarn}
                      onClick={() => setExcuseStudent(student)}
                      title="Mark Absent"
                    >
                      <CalendarX size={14} />
                    </button>
                  )}
                  <button
                    className={styles.iconBtn}
                    onClick={() => onReschedule(student)}
                    title="Reschedule"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className={styles.iconBtnDanger}
                    onClick={() => handleRemoveStudent(student.id)}
                    title="Remove for this date"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showStudentSearch ? (
            <div className={styles.searchArea}>
              <SearchInput
                placeholder="Search students..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
              <div className={styles.searchResults}>
                {availableStudents.slice(0, 8).map((s) => (
                  <button key={s.id} className={styles.searchRow} onClick={() => handleAddStudent(s.id)}>
                    {s.first_name} {s.last_name}
                    <Plus size={14} />
                  </button>
                ))}
                {availableStudents.length === 0 && (
                  <p className={styles.emptySearch}>No available students</p>
                )}
              </div>
            </div>
          ) : (
            <button className={styles.dashedBtn} onClick={() => setShowStudentSearch(true)}>
              <Plus size={14} /> Schedule Student
            </button>
          )}
        </div>
      </div>
    </Modal>

      {excuseStudent && (
        <ExcusedAbsenceModal
          student={excuseStudent}
          onClose={() => setExcuseStudent(null)}
          onSave={() => { setExcuseStudent(null); }}
        />
      )}
    </>
  );
}
