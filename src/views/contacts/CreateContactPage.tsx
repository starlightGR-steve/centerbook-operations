'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './CreateContactPage.module.css';

const RELATIONSHIPS = ['Mother', 'Father', 'Step-Mother', 'Step-Father', 'Guardian'];
const CONTACT_METHODS = ['Text', 'Email', 'Both', 'Call'];

export default function CreateContactPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [relationship, setRelationship] = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.first_name = 'First name is required';
    if (!lastName.trim()) errors.last_name = 'Last name is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email format';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email_opt_in: emailOptIn,
      sms_opt_in: smsOptIn,
    };

    if (email.trim()) body.email = email.trim();
    if (phone.trim()) body.phone = phone.trim();
    if (address.trim()) body.address_full = address.trim();
    if (relationship) body.relationship_to_students = relationship;
    if (contactMethod) body.preferred_contact_method = contactMethod;

    try {
      const result = await api.contacts.create(body);
      router.push(`/contacts/${result.id}`);
    } catch {
      setError('Failed to create contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/contacts')}>
          <ArrowLeft size={16} />
          Back to Contacts
        </button>
        <h1 className={styles.title}>New Contact</h1>
      </div>

      <div className={styles.body}>
        {error && <p className={styles.error}>{error}</p>}

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
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone</label>
              <input
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="616-555-0101"
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Address</label>
              <textarea
                className={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address..."
                rows={2}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Relationship to Students</label>
              <select className={styles.select} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                <option value="">—</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Preferred Contact Method</label>
              <select className={styles.select} value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}>
                <option value="">—</option>
                {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Communication Preferences */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Communication Preferences</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className={styles.checkbox}
                />
                Email Opt-in
              </label>
            </div>
            <div className={styles.field}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className={styles.checkbox}
                />
                SMS Opt-in
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Contact'}
          </button>
          <button className={styles.cancelBtn} onClick={() => router.push('/contacts')} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
