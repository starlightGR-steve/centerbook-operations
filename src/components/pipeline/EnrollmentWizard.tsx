'use client';

import { useState, useCallback } from 'react';
import { Check, ChevronRight, Plus, Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { isDemoModeActive } from '@/context/MockDataContext';
import { MOCK_STUDENTS, MOCK_CONTACTS } from '@/lib/mock-data';
import type { Family, Student, Contact } from '@/lib/types';
import styles from './EnrollmentWizard.module.css';

/* ── Constants ───────────────────────────── */

const GRADE_LEVELS = ['PK2', 'PK1', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
const SUBJECT_OPTIONS = ['Math', 'Reading', 'Math, Reading'];
const PROGRAM_TYPES = ['Paper', 'Kumon Connect'];
const RELATIONSHIPS = ['Mother', 'Father', 'Step-Mother', 'Step-Father', 'Guardian'];
const POSITIONS = ['Early Learners', 'Main Classroom', 'Upper Classroom'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { label: '3:00 PM', key: 1500 },
  { label: '3:30 PM', key: 1530 },
  { label: '4:00 PM', key: 1600 },
  { label: '4:30 PM', key: 1630 },
  { label: '5:00 PM', key: 1700 },
  { label: '5:30 PM', key: 1730 },
  { label: '6:00 PM', key: 1800 },
  { label: '6:30 PM', key: 1830 },
];

const STEP_LABELS = ['Students', 'Contacts', 'Roles', 'Schedule'];

/* ── Form Types ──────────────────────────── */

interface StudentForm {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string;
  subjects: string;
  program_type: string;
}

interface ContactForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship: string;
}

interface ScheduleForm {
  days: string[];
  times: Record<string, number>; // day -> sort_key
  duration: number;
  classroom_position: string;
}

/* ── Props ───────────────────────────────── */

interface EnrollmentWizardProps {
  family: Family;
  onClose: () => void;
  onComplete: () => void;
}

/* ── Component ───────────────────────────── */

export default function EnrollmentWizard({ family, onClose, onComplete }: EnrollmentWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Step 1: Students */
  const [studentForms, setStudentForms] = useState<StudentForm[]>(() => {
    const count = family.number_of_students || 1;
    const familyLastName = family.family_name.replace(' Family', '');
    return Array.from({ length: count }, () => ({
      first_name: '',
      last_name: familyLastName,
      date_of_birth: '',
      grade_level: '',
      subjects: 'Math, Reading',
      program_type: 'Paper',
    }));
  });
  const [createdStudents, setCreatedStudents] = useState<Student[]>([]);

  /* Step 2: Contacts */
  const [contactForms, setContactForms] = useState<ContactForm[]>(() => {
    const nameParts = (family.primary_contact_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return [{
      first_name: firstName,
      last_name: lastName,
      email: family.primary_contact_email || '',
      phone: family.primary_contact_phone || '',
      relationship: 'Mother',
    }];
  });
  const [createdContacts, setCreatedContacts] = useState<Contact[]>([]);

  /* Step 3: Roles */
  const [primaryComm, setPrimaryComm] = useState<Record<number, number>>({});
  const [primaryBilling, setPrimaryBilling] = useState<Record<number, number>>({});

  /* Step 4: Schedule */
  const [schedules, setSchedules] = useState<Record<number, ScheduleForm>>({});

  /* ── Helpers ─────────────────────────────── */

  const updateStudentForm = useCallback((index: number, field: keyof StudentForm, value: string) => {
    setStudentForms(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addStudentForm = useCallback(() => {
    const familyLastName = family.family_name.replace(' Family', '');
    setStudentForms(prev => [...prev, {
      first_name: '',
      last_name: familyLastName,
      date_of_birth: '',
      grade_level: '',
      subjects: 'Math, Reading',
      program_type: 'Paper',
    }]);
  }, [family.family_name]);

  const removeStudentForm = useCallback((index: number) => {
    setStudentForms(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateContactForm = useCallback((index: number, field: keyof ContactForm, value: string) => {
    setContactForms(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addContactForm = useCallback(() => {
    setContactForms(prev => [...prev, {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      relationship: 'Father',
    }]);
  }, []);

  const removeContactForm = useCallback((index: number) => {
    setContactForms(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSchedule = useCallback((studentId: number, field: keyof ScheduleForm, value: unknown) => {
    setSchedules(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }, []);

  const toggleScheduleDay = useCallback((studentId: number, day: string) => {
    setSchedules(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      const days = current.days.includes(day)
        ? current.days.filter(d => d !== day)
        : [...current.days, day];
      const times = { ...current.times };
      if (!days.includes(day)) {
        delete times[day];
      }
      return { ...prev, [studentId]: { ...current, days, times } };
    });
  }, []);

  const setScheduleTime = useCallback((studentId: number, day: string, sortKey: number) => {
    setSchedules(prev => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: {
          ...current,
          times: { ...current.times, [day]: sortKey },
        },
      };
    });
  }, []);

  /* ── Step Handlers ───────────────────────── */

  const handleSaveStudents = async () => {
    const invalid = studentForms.find(f => !f.first_name.trim() || !f.last_name.trim());
    if (invalid) {
      setError('First and last name required for all students.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const created: Student[] = [];
      for (const form of studentForms) {
        if (isDemoModeActive()) {
          const mockStudent = {
            id: Date.now() + Math.round(Math.random() * 10000),
            system_id: `SYS-${Date.now()}`,
            clickup_task_id: null,
            first_name: form.first_name,
            last_name: form.last_name,
            student_id: null,
            kc_username: null,
            kc_password: null,
            date_of_birth: form.date_of_birth || null,
            grade_level: form.grade_level || null,
            school: null,
            medical_notes: null,
            enrollment_status: 'Active' as const,
            program_type: (form.program_type || null) as Student['program_type'],
            subjects: form.subjects || null,
            enroll_date: today,
            classroom_position: null,
            class_schedule_days: null,
            class_time_sort_key: null,
            schedule_detail: null,
            current_level_math: null,
            current_level_reading: null,
            ashr_math_status: null,
            ashr_reading_status: null,
            primary_contact_id: null,
            billing_contact_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies Student;
          MOCK_STUDENTS.push(mockStudent);
          created.push(mockStudent);
        } else {
          const s = await api.students.create({
            first_name: form.first_name,
            last_name: form.last_name,
            date_of_birth: form.date_of_birth || undefined,
            grade_level: form.grade_level || undefined,
            subjects: form.subjects || undefined,
            program_type: (form.program_type || undefined) as Student['program_type'],
            enrollment_status: 'Active',
            enroll_date: today,
          });
          created.push(s);
        }
      }
      setCreatedStudents(created);

      // Initialize schedules for each created student
      const sched: Record<number, ScheduleForm> = {};
      created.forEach(s => {
        sched[s.id] = { days: [], times: {}, duration: 60, classroom_position: 'Main Classroom' };
      });
      setSchedules(sched);

      // Initialize roles
      setPrimaryComm({});
      setPrimaryBilling({});

      setStep(2);
    } catch {
      setError('Failed to create students.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContacts = async () => {
    const invalid = contactForms.find(f => !f.first_name.trim() || !f.last_name.trim());
    if (invalid) {
      setError('First and last name required for all contacts.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created: Contact[] = [];
      for (const form of contactForms) {
        if (isDemoModeActive()) {
          const mockContact = {
            id: Date.now() + Math.round(Math.random() * 10000),
            system_id: `SYS-C-${Date.now()}`,
            clickup_task_id: null,
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email || null,
            phone: form.phone || null,
            relationship_to_students: form.relationship || null,
            preferred_contact_method: null,
            portal_access_enabled: 0 as const,
            wp_user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies Contact;
          MOCK_CONTACTS.push(mockContact);
          created.push(mockContact);
        } else {
          const c = await api.contacts.create({
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            relationship_to_students: form.relationship || undefined,
          });
          created.push(c);
        }
      }
      setCreatedContacts(created);

      // Link each contact to each student
      for (const student of createdStudents) {
        for (const contact of created) {
          if (!isDemoModeActive()) {
            await api.studentContact.link({
              student_id: student.id,
              contact_id: contact.id,
            });
          }
        }
      }

      // Auto-set first contact as default for all roles
      if (created.length > 0) {
        const firstContactId = created[0].id;
        const comm: Record<number, number> = {};
        const bill: Record<number, number> = {};
        createdStudents.forEach(s => {
          comm[s.id] = firstContactId;
          bill[s.id] = firstContactId;
        });
        setPrimaryComm(comm);
        setPrimaryBilling(bill);
      }

      setStep(3);
    } catch {
      setError('Failed to create contacts.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoles = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const student of createdStudents) {
        const commId = primaryComm[student.id] || null;
        const billId = primaryBilling[student.id] || null;
        if (isDemoModeActive()) {
          const idx = MOCK_STUDENTS.findIndex(s => s.id === student.id);
          if (idx >= 0) {
            MOCK_STUDENTS[idx].primary_contact_id = commId;
            MOCK_STUDENTS[idx].billing_contact_id = billId;
          }
        } else {
          await api.students.update(student.id, {
            primary_contact_id: commId,
            billing_contact_id: billId,
          });
        }
      }
      setStep(4);
    } catch {
      setError('Failed to set contact roles.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const student of createdStudents) {
        const sched = schedules[student.id];
        if (!sched || sched.days.length === 0) continue;

        // Build schedule_detail JSON
        const scheduleDetail: Record<string, { start: string; sort_key: number; duration: number }> = {};
        for (const day of sched.days) {
          const sortKey = sched.times[day] || 1500;
          const h = Math.floor(sortKey / 100);
          const m = sortKey % 100;
          const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const startStr = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
          scheduleDetail[day] = {
            start: startStr,
            sort_key: sortKey,
            duration: sched.duration,
          };
        }

        const classDays = sched.days.join(', ');
        const firstDaySortKey = sched.times[sched.days[0]] || 1500;

        if (isDemoModeActive()) {
          const idx = MOCK_STUDENTS.findIndex(s => s.id === student.id);
          if (idx >= 0) {
            MOCK_STUDENTS[idx].schedule_detail = scheduleDetail;
            MOCK_STUDENTS[idx].class_schedule_days = classDays;
            MOCK_STUDENTS[idx].class_time_sort_key = firstDaySortKey;
            MOCK_STUDENTS[idx].classroom_position = sched.classroom_position as Student['classroom_position'];
          }
        } else {
          await api.students.update(student.id, {
            schedule_detail: scheduleDetail,
            class_schedule_days: classDays,
            class_time_sort_key: firstDaySortKey,
            classroom_position: sched.classroom_position as Student['classroom_position'],
          });
        }
      }
      setStep(5);
    } catch {
      setError('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render Helpers ──────────────────────── */

  const renderStepIndicator = () => (
    <div className={styles.steps}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isComplete = step > num;
        const isCurrent = step === num;
        return (
          <div key={label} className={styles.stepItem}>
            <div className={`${styles.stepCircle} ${isComplete ? styles.stepDone : isCurrent ? styles.stepActive : ''}`}>
              {isComplete ? <Check size={12} /> : num}
            </div>
            <span className={`${styles.stepLabel} ${isCurrent ? styles.stepLabelActive : ''}`}>{label}</span>
            {i < 3 && <div className={`${styles.stepLine} ${isComplete ? styles.stepLineDone : ''}`} />}
          </div>
        );
      })}
    </div>
  );

  const renderStudentsStep = () => (
    <div className={styles.stepContent}>
      {studentForms.map((form, idx) => (
        <div key={idx} className={styles.studentBlock}>
          <div className={styles.blockHeader}>
            <span className={styles.blockTitle}>Student {idx + 1}</span>
            {studentForms.length > 1 && (
              <button type="button" className={styles.removeBtn} onClick={() => removeStudentForm(idx)}>
                Remove
              </button>
            )}
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>First Name *</span>
              <input
                type="text"
                className={styles.input}
                value={form.first_name}
                onChange={e => updateStudentForm(idx, 'first_name', e.target.value)}
                placeholder="First name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Last Name *</span>
              <input
                type="text"
                className={styles.input}
                value={form.last_name}
                onChange={e => updateStudentForm(idx, 'last_name', e.target.value)}
                placeholder="Last name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Date of Birth</span>
              <input
                type="date"
                className={styles.input}
                value={form.date_of_birth}
                onChange={e => updateStudentForm(idx, 'date_of_birth', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Grade Level</span>
              <select
                className={styles.input}
                value={form.grade_level}
                onChange={e => updateStudentForm(idx, 'grade_level', e.target.value)}
              >
                <option value="">Select grade</option>
                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Subjects</span>
              <select
                className={styles.input}
                value={form.subjects}
                onChange={e => updateStudentForm(idx, 'subjects', e.target.value)}
              >
                {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Program Type</span>
              <select
                className={styles.input}
                value={form.program_type}
                onChange={e => updateStudentForm(idx, 'program_type', e.target.value)}
              >
                {PROGRAM_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
        </div>
      ))}
      <button type="button" className={styles.addBtn} onClick={addStudentForm}>
        <Plus size={14} /> Add Another Student
      </button>
      <div className={styles.footer}>
        <button type="button" className={styles.skipLink} onClick={() => setStep(2)}>
          Skip
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleSaveStudents}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Continue'} {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );

  const renderContactsStep = () => (
    <div className={styles.stepContent}>
      {contactForms.map((form, idx) => (
        <div key={idx} className={styles.studentBlock}>
          <div className={styles.blockHeader}>
            <span className={styles.blockTitle}>Contact {idx + 1}</span>
            {contactForms.length > 1 && (
              <button type="button" className={styles.removeBtn} onClick={() => removeContactForm(idx)}>
                Remove
              </button>
            )}
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>First Name *</span>
              <input
                type="text"
                className={styles.input}
                value={form.first_name}
                onChange={e => updateContactForm(idx, 'first_name', e.target.value)}
                placeholder="First name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Last Name *</span>
              <input
                type="text"
                className={styles.input}
                value={form.last_name}
                onChange={e => updateContactForm(idx, 'last_name', e.target.value)}
                placeholder="Last name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                type="email"
                className={styles.input}
                value={form.email}
                onChange={e => updateContactForm(idx, 'email', e.target.value)}
                placeholder="email@example.com"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Phone</span>
              <input
                type="tel"
                className={styles.input}
                value={form.phone}
                onChange={e => updateContactForm(idx, 'phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Relationship</span>
              <select
                className={styles.input}
                value={form.relationship}
                onChange={e => updateContactForm(idx, 'relationship', e.target.value)}
              >
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
        </div>
      ))}
      <button type="button" className={styles.addBtn} onClick={addContactForm}>
        <Plus size={14} /> Add Another Contact
      </button>
      <div className={styles.footer}>
        <button type="button" className={styles.skipLink} onClick={() => setStep(3)}>
          Skip
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleSaveContacts}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Continue'} {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );

  const renderRolesStep = () => (
    <div className={styles.stepContent}>
      {createdStudents.map(student => (
        <div key={student.id} className={styles.studentBlock}>
          <div className={styles.blockHeader}>
            <span className={styles.blockTitle}>{student.first_name} {student.last_name}</span>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Primary Contact (Communication)</span>
              <select
                className={styles.input}
                value={primaryComm[student.id] || ''}
                onChange={e => setPrimaryComm(prev => ({ ...prev, [student.id]: Number(e.target.value) }))}
              >
                <option value="">Select contact</option>
                {createdContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Billing Contact</span>
              <select
                className={styles.input}
                value={primaryBilling[student.id] || ''}
                onChange={e => setPrimaryBilling(prev => ({ ...prev, [student.id]: Number(e.target.value) }))}
              >
                <option value="">Select contact</option>
                {createdContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}
      {createdContacts.length === 0 && (
        <p className={styles.emptyNote}>No contacts created yet. You can skip this step and assign roles later.</p>
      )}
      <div className={styles.footer}>
        <button type="button" className={styles.skipLink} onClick={() => setStep(4)}>
          Skip
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleSaveRoles}
          disabled={saving || createdContacts.length === 0}
        >
          {saving ? 'Saving...' : 'Save & Continue'} {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className={styles.stepContent}>
      {createdStudents.map(student => {
        const sched = schedules[student.id];
        if (!sched) return null;
        return (
          <div key={student.id} className={styles.studentBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.blockTitle}>{student.first_name} {student.last_name}</span>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Classroom Position</span>
              <select
                className={styles.input}
                value={sched.classroom_position}
                onChange={e => updateSchedule(student.id, 'classroom_position', e.target.value)}
              >
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Session Duration (minutes)</span>
              <select
                className={styles.input}
                value={sched.duration}
                onChange={e => updateSchedule(student.id, 'duration', Number(e.target.value))}
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Class Days</span>
              <div className={styles.dayChips}>
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.dayChip} ${sched.days.includes(day) ? styles.dayChipActive : ''}`}
                    onClick={() => toggleScheduleDay(student.id, day)}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            {sched.days.length > 0 && (
              <div className={styles.timesGrid}>
                {sched.days.map(day => (
                  <label key={day} className={styles.field}>
                    <span className={styles.fieldLabel}>{day} Time</span>
                    <select
                      className={styles.input}
                      value={sched.times[day] || ''}
                      onChange={e => setScheduleTime(student.id, day, Number(e.target.value))}
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {createdStudents.length === 0 && (
        <p className={styles.emptyNote}>No students created yet. You can skip this step and set schedules later.</p>
      )}
      <div className={styles.footer}>
        <button type="button" className={styles.skipLink} onClick={() => setStep(5)}>
          Skip
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={handleSaveSchedule}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Complete Enrollment'} {!saving && <Check size={14} />}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className={styles.completeScreen}>
      <div className={styles.completeIcon}>
        <Check size={32} />
      </div>
      <h3 className={styles.completeTitle}>Enrollment Complete</h3>
      <p className={styles.completeSubtitle}>
        {createdStudents.length} student{createdStudents.length !== 1 ? 's' : ''} enrolled for the {family.family_name}.
      </p>
      {createdStudents.length > 0 && (
        <ul className={styles.studentList}>
          {createdStudents.map(s => (
            <li key={s.id} className={styles.studentListItem}>
              {s.first_name} {s.last_name}
              {s.subjects && <span className={styles.subjectTag}>{s.subjects}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.completeActions}>
        <button type="button" className={styles.doneBtn} onClick={onClose}>
          Done
        </button>
        <button type="button" className={styles.nextBtn} onClick={onComplete}>
          View Students
        </button>
      </div>
    </div>
  );

  /* ── Main Render ─────────────────────────── */

  const stepTitles: Record<number, string> = {
    1: 'Add Students',
    2: 'Add Contacts',
    3: 'Assign Roles',
    4: 'Set Schedule',
    5: 'Complete',
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Enroll ${family.family_name}`}
      subtitle={stepTitles[step]}
      maxWidth="36rem"
    >
      {step <= 4 && renderStepIndicator()}
      {error && <div className={styles.error}>{error}</div>}
      {step === 1 && renderStudentsStep()}
      {step === 2 && renderContactsStep()}
      {step === 3 && renderRolesStep()}
      {step === 4 && renderScheduleStep()}
      {step === 5 && renderCompleteStep()}
    </Modal>
  );
}
