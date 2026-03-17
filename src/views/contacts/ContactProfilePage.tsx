'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, RefreshCw, Users, Pencil, Link2, Unlink } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import EmptyState from '@/components/ui/EmptyState';
import LinkPickerModal from '@/components/LinkPickerModal';
import { api } from '@/lib/api';
import { useAllStudents } from '@/hooks/useStudents';
import { useDemoMode } from '@/context/MockDataContext';
import type { Contact, LinkedStudent, Student } from '@/lib/types';
import styles from './ContactProfilePage.module.css';

const RELATIONSHIPS = ['Mother', 'Father', 'Step-Mother', 'Step-Father', 'Guardian'];
const CONTACT_METHODS = ['Text', 'Email', 'Both', 'Call'];

type EditableFields = {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  address_full?: string | null;
  relationship_to_students?: string | null;
  preferred_contact_method?: string | null;
  email_opt_in?: 0 | 1;
  sms_opt_in?: 0 | 1;
};

interface Props {
  contactId: number;
}

export default function ContactProfilePage({ contactId }: Props) {
  const router = useRouter();
  const { isDemoMode } = useDemoMode();

  const { data: contact, isLoading, error, mutate: mutateContact } = useSWR<Contact>(
    isDemoMode ? null : `contact-${contactId}`,
    () => api.contacts.get(contactId),
    { dedupingInterval: 10000, revalidateOnFocus: false }
  );

  const {
    data: linkedStudents,
    error: studentsError,
    isLoading: studentsLoading,
    mutate: mutateStudents,
  } = useSWR<LinkedStudent[]>(
    isDemoMode ? null : `contact-students-${contactId}`,
    () => api.contacts.students(contactId),
    { dedupingInterval: 10000, revalidateOnFocus: false }
  );

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditableFields>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Link student
  const [showLinkStudent, setShowLinkStudent] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState<number | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const { data: allStudents, isLoading: allStudentsLoading } = useAllStudents();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading contact...</div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          {error ? 'Failed to load contact.' : 'Contact not found.'}
        </div>
      </div>
    );
  }

  const portalActive = Number(contact.portal_access_enabled) === 1;

  const startEditing = () => {
    setEditFields({});
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditFields({});
    setEditError(null);
    setIsEditing(false);
  };

  const setField = (key: keyof EditableFields, value: unknown) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const getField = (key: keyof EditableFields): string => {
    if (key in editFields) return String(editFields[key] ?? '');
    return String((contact as unknown as Record<string, unknown>)[key] ?? '');
  };

  const getOptIn = (key: 'email_opt_in' | 'sms_opt_in'): boolean => {
    if (key in editFields) return Number(editFields[key]) === 1;
    return Number((contact as unknown as Record<string, unknown>)[key]) === 1;
  };

  const isChanged = (key: keyof EditableFields): boolean => {
    if (!(key in editFields)) return false;
    const orig = String((contact as unknown as Record<string, unknown>)[key] ?? '');
    return String(editFields[key] ?? '') !== orig;
  };

  const changedFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(editFields)) {
    const orig = String((contact as unknown as Record<string, unknown>)[k] ?? '');
    if (String(v ?? '') !== orig) changedFields[k] = v === '' ? null : v;
  }
  const hasChanges = Object.keys(changedFields).length > 0;

  const handleSave = async () => {
    if (!hasChanges) { setIsEditing(false); return; }
    // Validate required fields
    const fn = getField('first_name');
    const ln = getField('last_name');
    if (!fn.trim() || !ln.trim()) {
      setEditError('First name and last name are required.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await api.contacts.update(contactId, changedFields as Partial<Contact>);
      await mutateContact();
      setEditFields({});
      setIsEditing(false);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const linkedStudentIds = new Set(linkedStudents?.map((s) => s.id) ?? []);

  const handleLinkStudent = async (studentId: number, role: string) => {
    setLinkError(null);
    await api.studentContact.link({ student_id: studentId, contact_id: contactId, role: role || undefined });
    mutateStudents();
  };

  const handleUnlinkStudent = async (studentId: number) => {
    setLinkError(null);
    try {
      await api.studentContact.unlink({ student_id: studentId, contact_id: contactId });
      mutateStudents();
      setUnlinkConfirm(null);
    } catch (e) {
      const msg = e instanceof Error && e.message.includes('409')
        ? 'Cannot unlink — this contact is designated as Primary Communication or Billing parent. Change the designation first.'
        : 'Failed to unlink student.';
      setLinkError(msg);
      setUnlinkConfirm(null);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/contacts')}>
          <ArrowLeft size={16} />
          Back to Contacts
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.contactName}>
            {contact.first_name} {contact.last_name}
          </h1>
          <div className={styles.headerBadges}>
            <Badge variant="neutral">{contact.system_id}</Badge>
            {contact.relationship_to_students && (
              <Badge variant="info">{contact.relationship_to_students}</Badge>
            )}
            <Badge variant={portalActive ? 'success' : 'neutral'}>
              {portalActive ? 'Portal Active' : 'No Portal'}
            </Badge>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Details Grid ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Contact Details</h3>
            {!isEditing ? (
              <button className={styles.editBtn} onClick={startEditing}>
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <div className={styles.editActions}>
                <button className={styles.saveBtn} onClick={handleSave} disabled={editSaving || !hasChanges}>
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
                <button className={styles.cancelEditBtn} onClick={cancelEditing} disabled={editSaving}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editError && (
            <p className={styles.editError}>{editError}</p>
          )}

          <div className={styles.detailsGrid}>
            {/* First Name */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('first_name') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>First Name *</span>
                <input className={styles.editInput} value={getField('first_name')} onChange={(e) => setField('first_name', e.target.value)} />
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>First Name</span>
                <span className={styles.detailValue}>{contact.first_name}</span>
              </div>
            )}

            {/* Last Name */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('last_name') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Last Name *</span>
                <input className={styles.editInput} value={getField('last_name')} onChange={(e) => setField('last_name', e.target.value)} />
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Last Name</span>
                <span className={styles.detailValue}>{contact.last_name}</span>
              </div>
            )}

            {/* Email */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('email') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Email</span>
                <input type="email" className={styles.editInput} value={getField('email')} onChange={(e) => setField('email', e.target.value || null)} />
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Email</span>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className={styles.detailLink}>{contact.email}</a>
                ) : (
                  <span className={styles.detailValue}>—</span>
                )}
              </div>
            )}

            {/* Phone */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('phone') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Phone</span>
                <input type="tel" className={styles.editInput} value={getField('phone')} onChange={(e) => setField('phone', e.target.value || null)} />
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phone</span>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className={styles.detailLink}>{contact.phone}</a>
                ) : (
                  <span className={styles.detailValue}>—</span>
                )}
              </div>
            )}

            {/* Address */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${styles.detailFull} ${isChanged('address_full') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Address</span>
                <textarea className={styles.editTextarea} value={getField('address_full')} onChange={(e) => setField('address_full', e.target.value || null)} rows={2} />
              </div>
            ) : (
              <div className={`${styles.detailItem} ${styles.detailFull}`}>
                <span className={styles.detailLabel}>Address</span>
                <span className={styles.detailValue}>{contact.address_full || '—'}</span>
              </div>
            )}

            {/* Relationship */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('relationship_to_students') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Relationship</span>
                <select className={styles.editSelect} value={getField('relationship_to_students')} onChange={(e) => setField('relationship_to_students', e.target.value || null)}>
                  <option value="">—</option>
                  {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Relationship</span>
                <span className={styles.detailValue}>{contact.relationship_to_students ?? '—'}</span>
              </div>
            )}

            {/* Preferred Contact Method */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('preferred_contact_method') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Preferred Contact Method</span>
                <select className={styles.editSelect} value={getField('preferred_contact_method')} onChange={(e) => setField('preferred_contact_method', e.target.value || null)}>
                  <option value="">—</option>
                  {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Preferred Contact Method</span>
                <span className={styles.detailValue}>{contact.preferred_contact_method ?? '—'}</span>
              </div>
            )}

            {/* Email Opt-in */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('email_opt_in') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>Email Opt-in</span>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={getOptIn('email_opt_in')}
                    onChange={(e) => setField('email_opt_in', e.target.checked ? 1 : 0)}
                    className={styles.checkbox}
                  />
                  {getOptIn('email_opt_in') ? 'Yes' : 'No'}
                </label>
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Email Opt-in</span>
                <span className={Number(contact.email_opt_in) === 1 ? styles.optIn : styles.optOut}>
                  {Number(contact.email_opt_in) === 1 ? 'Yes' : 'No'}
                </span>
              </div>
            )}

            {/* SMS Opt-in */}
            {isEditing ? (
              <div className={`${styles.detailItem} ${isChanged('sms_opt_in') ? styles.fieldChanged : ''}`}>
                <span className={styles.detailLabel}>SMS Opt-in</span>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={getOptIn('sms_opt_in')}
                    onChange={(e) => setField('sms_opt_in', e.target.checked ? 1 : 0)}
                    className={styles.checkbox}
                  />
                  {getOptIn('sms_opt_in') ? 'Yes' : 'No'}
                </label>
              </div>
            ) : (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>SMS Opt-in</span>
                <span className={Number(contact.sms_opt_in) === 1 ? styles.optIn : styles.optOut}>
                  {Number(contact.sms_opt_in) === 1 ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Linked Students ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Linked Students
              {linkedStudents && linkedStudents.length > 0 && (
                <span className={styles.count}>{linkedStudents.length}</span>
              )}
            </h3>
            <button className={styles.editBtn} onClick={() => setShowLinkStudent(true)}>
              <Link2 size={14} /> Link Student
            </button>
          </div>

          {linkError && (
            <p className={styles.editError}>{linkError}</p>
          )}

          {studentsLoading && (
            <p className={styles.empty}>Loading students...</p>
          )}

          {studentsError && (
            <div className={styles.errorRow}>
              <p>Unable to load linked students.</p>
              <button className={styles.retryBtn} onClick={() => mutateStudents()}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!studentsLoading && !studentsError && (!linkedStudents || linkedStudents.length === 0) && (
            <EmptyState icon={Users} title="No students linked to this contact" description="" />
          )}

          {linkedStudents && linkedStudents.length > 0 && (
            <div className={styles.studentList}>
              {linkedStudents.map((s) => (
                <div key={s.id} className={styles.studentCard}>
                  <div className={styles.studentInfo} onClick={() => router.push(`/students/${s.id}`)}>
                    <span className={styles.studentName}>
                      {s.first_name} {s.last_name}
                    </span>
                    <div className={styles.studentMeta}>
                      <Badge variant={s.enrollment_status === 'Active' ? 'success' : 'neutral'}>
                        {s.enrollment_status}
                      </Badge>
                      <SubjectBadges subjects={s.subjects} />
                      {s.classroom_position && (
                        <PosBadge position={s.classroom_position as 'Early Learners' | 'Main Classroom' | 'Upper Classroom'} />
                      )}
                      {s.is_primary_contact && (
                        <Badge variant="reading">Primary</Badge>
                      )}
                      {s.is_billing_contact && (
                        <Badge variant="math">Billing</Badge>
                      )}
                    </div>
                  </div>
                  <div className={styles.studentRight}>
                    {s.current_level_math && (
                      <span className={styles.levelText}>Math: {s.current_level_math}</span>
                    )}
                    {s.current_level_reading && (
                      <span className={styles.levelText}>Reading: {s.current_level_reading}</span>
                    )}
                    {unlinkConfirm === s.id ? (
                      <span className={styles.confirmRow}>
                        <span className={styles.confirmText}>Unlink?</span>
                        <button className={styles.confirmYes} onClick={(e) => { e.stopPropagation(); handleUnlinkStudent(s.id); }}>Yes</button>
                        <button className={styles.confirmNo} onClick={(e) => { e.stopPropagation(); setUnlinkConfirm(null); }}>No</button>
                      </span>
                    ) : (
                      <button className={styles.unlinkBtn} onClick={(e) => { e.stopPropagation(); setUnlinkConfirm(s.id); }} title="Unlink student">
                        <Unlink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showLinkStudent && (
          <LinkPickerModal
            title="Link Student"
            items={(allStudents ?? []).map((s) => ({
              id: s.id,
              label: `${s.last_name}, ${s.first_name}`,
              sub: s.school || s.enrollment_status || '',
              linked: linkedStudentIds.has(s.id),
            }))}
            loading={allStudentsLoading}
            onLink={handleLinkStudent}
            onClose={() => setShowLinkStudent(false)}
          />
        )}
      </div>
    </div>
  );
}
