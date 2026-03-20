'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { createFamilyLead } from '@/hooks/usePipeline';
import styles from './NewFamilyLeadModal.module.css';

const LEAD_SOURCES = ['Website', 'Referral', 'Walk-in', 'Phone', 'Social Media', 'Other'];
const PIPELINE_STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'assessment_scheduled', label: 'Assessment Scheduled' },
  { value: 'lead', label: 'Lead' },
];

interface NewFamilyLeadModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewFamilyLeadModal({ onClose, onCreated }: NewFamilyLeadModalProps) {
  const [familyName, setFamilyName] = useState('');
  const [leadSource, setLeadSource] = useState('Website');
  const [referralName, setReferralName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [numStudents, setNumStudents] = useState(1);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('prospect');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!familyName.trim()) {
      setError('Family name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createFamilyLead({
        family_name: familyName.trim(),
        status,
        lead_source: leadSource,
        referral_name: leadSource === 'Referral' ? referralName.trim() || undefined : undefined,
        primary_contact_name: contactName.trim() || undefined,
        primary_contact_email: contactEmail.trim() || undefined,
        primary_contact_phone: contactPhone.trim() || undefined,
        number_of_students: numStudents,
        family_notes: notes.trim() || undefined,
        inquiry_date: new Date().toISOString().split('T')[0],
      });
      onCreated();
      onClose();
    } catch {
      setError('Failed to create lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New Family Lead" maxWidth="30rem">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Family / Lead Name *</label>
          <input
            className={styles.input}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g., Smith Family"
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Lead Source</label>
            <select className={styles.select} value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
              {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Pipeline Status</label>
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              {PIPELINE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {leadSource === 'Referral' && (
          <div className={styles.field}>
            <label className={styles.label}>Referral Name</label>
            <input
              className={styles.input}
              value={referralName}
              onChange={(e) => setReferralName(e.target.value)}
              placeholder="Who referred them?"
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Contact Name</label>
          <input
            className={styles.input}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Parent/guardian name"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input
              type="tel"
              className={styles.input}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Number of Students</label>
          <input
            type="number"
            className={styles.input}
            value={numStudents}
            onChange={(e) => setNumStudents(Math.max(1, Number(e.target.value)))}
            min={1}
            style={{ maxWidth: '5rem' }}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any initial notes about this lead..."
            rows={3}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.createBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
