'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { updateFamilyStatus } from '@/hooks/usePipeline';
import type { Family, AssessmentOutcome } from '@/lib/types';
import styles from './FamilyDetailModal.module.css';

const STATUS_COLORS: Record<string, string> = {
  prospect: '#6b7280',
  assessment_scheduled: '#d97706',
  lead: '#3b82f6',
  trial: '#009AAB',
  enrolled: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  assessment_scheduled: 'Assessment',
  lead: 'Lead',
  trial: 'Trial',
  enrolled: 'Enrolled',
};

interface FamilyDetailModalProps {
  family: Family;
  onClose: () => void;
  onSaved: () => void;
}

export default function FamilyDetailModal({ family, onClose, onSaved }: FamilyDetailModalProps) {
  const [contactName, setContactName] = useState(family.primary_contact_name || '');
  const [contactEmail, setContactEmail] = useState(family.primary_contact_email || '');
  const [contactPhone, setContactPhone] = useState(family.primary_contact_phone || '');
  const [assessmentDate, setAssessmentDate] = useState(family.assessment_date || '');
  const [assessmentOutcome, setAssessmentOutcome] = useState<string>(family.assessment_outcome || '');
  const [assessmentNotes, setAssessmentNotes] = useState(family.assessment_notes || '');
  const [familyNotes, setFamilyNotes] = useState(family.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateFamilyStatus(family.id, {
        primary_contact_name: contactName.trim() || family.primary_contact_name,
        primary_contact_email: contactEmail.trim() || null,
        primary_contact_phone: contactPhone.trim() || null,
        assessment_date: assessmentDate || null,
        assessment_outcome: (assessmentOutcome as AssessmentOutcome) || null,
        assessment_notes: assessmentNotes.trim() || null,
        notes: familyNotes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = STATUS_COLORS[family.pipeline_status] || '#6b7280';

  return (
    <Modal open onClose={onClose} title="" maxWidth="32.5rem">
      <div className={styles.header}>
        <h3 className={styles.familyName}>{family.family_name}</h3>
        <span className={styles.statusBadge} style={{ background: statusColor }}>
          {STATUS_LABELS[family.pipeline_status] || family.pipeline_status}
        </span>
      </div>

      {/* Contact Info */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Contact Information</h4>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Contact Name</label>
            <input className={styles.input} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" className={styles.input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input type="tel" className={styles.input} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 555-5555" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Lead Source</label>
            <span className={styles.readOnly}>{family.lead_source || '—'}{family.referral_name ? ` (${family.referral_name})` : ''}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Inquiry Date</label>
            <span className={styles.readOnly}>{family.inquiry_date || '—'}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Students</label>
            <span className={styles.readOnly}>{family.number_of_students ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Assessment */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Assessment</h4>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Assessment Date</label>
            <input type="date" className={styles.input} value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Outcome</label>
            <select className={styles.select} value={assessmentOutcome} onChange={(e) => setAssessmentOutcome(e.target.value)}>
              <option value="">— Select —</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="No-Show">No-Show</option>
            </select>
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Assessment Notes</label>
            <textarea className={styles.textarea} value={assessmentNotes} onChange={(e) => setAssessmentNotes(e.target.value)} rows={3} placeholder="Assessment details..." />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Notes</h4>
        <textarea className={styles.textarea} value={familyNotes} onChange={(e) => setFamilyNotes(e.target.value)} rows={3} placeholder="Family notes..." />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
