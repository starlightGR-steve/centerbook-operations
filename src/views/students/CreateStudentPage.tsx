'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './CreateStudentPage.module.css';

const GRADE_LEVELS = ['PK2', 'PK1', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
const ENROLLMENT_STATUSES = ['Active', 'On Hold', 'Withdrawn'];
const PROGRAM_TYPES = ['Paper', 'Kumon Connect'];
const CLASSROOM_POSITIONS = ['Early Learners', 'Main Classroom', 'Upper Classroom'];
const SCHEDULE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_OPTIONS = [
  { label: '3:00 PM', value: 1500 },
  { label: '3:30 PM', value: 1530 },
  { label: '4:00 PM', value: 1600 },
  { label: '4:30 PM', value: 1630 },
  { label: '5:00 PM', value: 1700 },
];

export default function CreateStudentPage() {
  const router = useRouter();

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [school, setSchool] = useState('');

  // Program
  const [enrollmentStatus, setEnrollmentStatus] = useState('Active');
  const [programType, setProgramType] = useState('');
  const [subjectMath, setSubjectMath] = useState(false);
  const [subjectReading, setSubjectReading] = useState(false);
  const [classroomPosition, setClassroomPosition] = useState('');

  // Schedule
  const [scheduleDays, setScheduleDays] = useState<Set<string>>(new Set());
  const [classTime, setClassTime] = useState<number | ''>('');

  // Additional
  const [studentId, setStudentId] = useState('');
  const [kcUsername, setKcUsername] = useState('');
  const [kcPassword, setKcPassword] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const toggleDay = (day: string) => {
    setScheduleDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.first_name = 'First name is required';
    if (!lastName.trim()) errors.last_name = 'Last name is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);

    const subjects: string[] = [];
    if (subjectMath) subjects.push('Math');
    if (subjectReading) subjects.push('Reading');

    const orderedDays = SCHEDULE_DAYS.filter((d) => scheduleDays.has(d));

    const body: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      enrollment_status: enrollmentStatus,
    };

    if (dateOfBirth) body.date_of_birth = dateOfBirth;
    if (gradeLevel) body.grade_level = gradeLevel;
    if (school.trim()) body.school = school.trim();
    if (programType) body.program_type = programType;
    if (subjects.length > 0) body.subjects = subjects.join(', ');
    if (classroomPosition) body.classroom_position = classroomPosition;
    if (orderedDays.length > 0) body.class_schedule_days = orderedDays.join(', ');
    if (classTime) body.class_time_sort_key = classTime;
    if (studentId.trim()) body.student_id = studentId.trim();
    if (kcUsername.trim()) body.kc_username = kcUsername.trim();
    if (kcPassword.trim()) body.kc_password = kcPassword.trim();
    if (medicalNotes.trim()) body.medical_notes = medicalNotes.trim();

    try {
      const result = await api.students.create(body);
      router.push(`/students/${result.id}`);
    } catch {
      setError('Failed to create student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/students')}>
          <ArrowLeft size={16} />
          Back to Roster
        </button>
        <h1 className={styles.title}>New Student</h1>
      </div>

      <div className={styles.body}>
        {error && (
          <p className={styles.error}>{error}</p>
        )}

        {/* Identity */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Identity</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>First Name *</label>
              <input
                className={`${styles.input} ${fieldErrors.first_name ? styles.inputError : ''}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
              {fieldErrors.first_name && <span className={styles.fieldError}>{fieldErrors.first_name}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Last Name *</label>
              <input
                className={`${styles.input} ${fieldErrors.last_name ? styles.inputError : ''}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
              {fieldErrors.last_name && <span className={styles.fieldError}>{fieldErrors.last_name}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Date of Birth</label>
              <input
                type="date"
                className={styles.input}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Grade Level</label>
              <select className={styles.select} value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                <option value="">—</option>
                {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>School</label>
              <input className={styles.input} value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School name" />
            </div>
          </div>
        </div>

        {/* Program */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Program</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Enrollment Status</label>
              <select className={styles.select} value={enrollmentStatus} onChange={(e) => setEnrollmentStatus(e.target.value)}>
                {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Program Type</label>
              <select className={styles.select} value={programType} onChange={(e) => setProgramType(e.target.value)}>
                <option value="">—</option>
                {PROGRAM_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Subjects</label>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`${styles.toggle} ${subjectMath ? styles.toggleMath : ''}`}
                  onClick={() => setSubjectMath(!subjectMath)}
                >
                  Math
                </button>
                <button
                  type="button"
                  className={`${styles.toggle} ${subjectReading ? styles.toggleReading : ''}`}
                  onClick={() => setSubjectReading(!subjectReading)}
                >
                  Reading
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Classroom Position</label>
              <select className={styles.select} value={classroomPosition} onChange={(e) => setClassroomPosition(e.target.value)}>
                <option value="">—</option>
                {CLASSROOM_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Schedule</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Class Days</label>
              <div className={styles.toggleRow}>
                {SCHEDULE_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.dayToggle} ${scheduleDays.has(d) ? styles.dayToggleActive : ''}`}
                    onClick={() => toggleDay(d)}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Class Time</label>
              <select className={styles.select} value={classTime} onChange={(e) => setClassTime(e.target.value ? Number(e.target.value) : '')}>
                <option value="">—</option>
                {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Additional */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Student ID</label>
              <input className={styles.input} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Kumon corporate ID" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>KC Username</label>
              <input className={styles.input} value={kcUsername} onChange={(e) => setKcUsername(e.target.value)} placeholder="Kumon Connect username" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>KC Password</label>
              <input className={styles.input} value={kcPassword} onChange={(e) => setKcPassword(e.target.value)} placeholder="Kumon Connect password" />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Medical / Allergies</label>
              <textarea
                className={styles.textarea}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Any medical notes or allergies..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Student'}
          </button>
          <button
            className={styles.cancelBtn}
            onClick={() => router.push('/students')}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
