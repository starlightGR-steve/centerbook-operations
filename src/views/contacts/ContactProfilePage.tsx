'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, RefreshCw, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import SubjectBadges from '@/components/SubjectBadges';
import PosBadge from '@/components/PosBadge';
import EmptyState from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { useDemoMode } from '@/context/MockDataContext';
import type { Contact, LinkedStudent } from '@/lib/types';
import styles from './ContactProfilePage.module.css';

interface Props {
  contactId: number;
}

export default function ContactProfilePage({ contactId }: Props) {
  const router = useRouter();
  const { isDemoMode } = useDemoMode();

  const { data: contact, isLoading, error } = useSWR<Contact>(
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
          <h3 className={styles.sectionTitle}>Contact Details</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email</span>
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className={styles.detailLink}>
                  {contact.email}
                </a>
              ) : (
                <span className={styles.detailValue}>—</span>
              )}
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} className={styles.detailLink}>
                  {contact.phone}
                </a>
              ) : (
                <span className={styles.detailValue}>—</span>
              )}
            </div>
            <div className={`${styles.detailItem} ${styles.detailFull}`}>
              <span className={styles.detailLabel}>Address</span>
              <span className={styles.detailValue}>
                {contact.address_full || '—'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Preferred Contact Method</span>
              <span className={styles.detailValue}>
                {contact.preferred_contact_method ?? '—'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email Opt-in</span>
              <span className={Number(contact.email_opt_in) === 1 ? styles.optIn : styles.optOut}>
                {Number(contact.email_opt_in) === 1 ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>SMS Opt-in</span>
              <span className={Number(contact.sms_opt_in) === 1 ? styles.optIn : styles.optOut}>
                {Number(contact.sms_opt_in) === 1 ? 'Yes' : 'No'}
              </span>
            </div>
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
          </div>

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
                <div
                  key={s.id}
                  className={styles.studentCard}
                  onClick={() => router.push(`/students/${s.id}`)}
                >
                  <div className={styles.studentInfo}>
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
                    {s.grade_level && (
                      <span className={styles.levelText}>Grade {s.grade_level}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
