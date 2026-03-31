'use client';

import { useState, useCallback } from 'react';
import { Plus, Clock, MapPin, Calendar, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { clockInStaff } from '@/hooks/useTimeclock';
import { api } from '@/lib/api';
import type { Staff, TimeEntry } from '@/lib/types';
import { formatTime } from '@/lib/types';
import { getPeriodHours } from './StaffTable';
import styles from './StaffDetailModal.module.css';

interface StaffDetailModalProps {
  open: boolean;
  onClose: () => void;
  staff: Staff;
  timeEntries: TimeEntry[];
  periodStart: string;
  periodEnd: string;
  clockedInIds?: Set<number>;
  onDelete?: () => void;
}

function getStaffName(s: Staff): string {
  if (s.full_name) return s.full_name;
  if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
  return s.first_name || s.last_name || 'Unnamed';
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StaffDetailModal({
  open,
  onClose,
  staff,
  timeEntries,
  periodStart,
  periodEnd,
  clockedInIds,
  onDelete,
}: StaffDetailModalProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const staffName = getStaffName(staff);
  const isClockedIn = clockedInIds?.has(staff.id) ?? false;
  const [manualDate, setManualDate] = useState('');
  const [manualIn, setManualIn] = useState('15:00');
  const [manualOut, setManualOut] = useState('18:00');
  const [rowOverride, setRowOverride] = useState<string | null | undefined>(undefined);
  const [showRowDropdown, setShowRowDropdown] = useState(false);

  const effectiveRow = rowOverride !== undefined ? rowOverride : (staff.assigned_row || null);

  const periodEntries = timeEntries
    .filter(
      (e) =>
        e.staff_id === staff.id &&
        e.clock_in >= periodStart &&
        e.clock_in <= periodEnd + 'T23:59:59'
    )
    .sort((a, b) => b.clock_in.localeCompare(a.clock_in));

  const totalHours = getPeriodHours(timeEntries, staff.id, periodStart, periodEnd);
  const completedEntries = periodEntries.filter((e) => e.duration_minutes != null);
  const uniqueDays = new Set(completedEntries.map((e) => e.clock_in.split('T')[0]));
  const avgHours = uniqueDays.size > 0 ? totalHours / uniqueDays.size : 0;

  async function handleAddManual() {
    if (!manualDate || !manualIn || !manualOut) return;
    // Create via clockIn (simplified — in production would use a dedicated manual entry endpoint)
    await clockInStaff({ staff_id: staff.id, source: 'manual' });
    setShowManualForm(false);
    setManualDate('');
  }

  return (
    <Modal open={open} onClose={onClose} title="" maxWidth="520px">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatarLarge}>{getInitials(staffName)}</div>
        <div className={styles.headerInfo}>
          <h3 className={styles.name}>{staffName}</h3>
          <div className={styles.badges}>
            <Badge variant="neutral">{staff.role}</Badge>
            <Badge variant={staff.status === 'Active' ? 'success' : 'danger'}>
              {staff.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <div className={styles.section}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>EMAIL</span>
            <span className={styles.infoValue}>{staff.email || '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>PHONE</span>
            <span className={styles.infoValue}>{staff.phone || '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>HIRE DATE</span>
            <span className={styles.infoValue}>
              {staff.hire_date
                ? new Date(staff.hire_date + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Period Summary */}
      <div className={styles.section}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryMain}>
            <span className={styles.summaryHours}>{totalHours.toFixed(1)}</span>
            <span className={styles.summaryUnit}> hrs</span>
          </div>
          <div className={styles.summaryMeta}>
            {completedEntries.length} entries over {uniqueDays.size} days
            {uniqueDays.size > 0 && ` · ${avgHours.toFixed(1)} hrs/day avg`}
          </div>
        </div>
      </div>

      {/* Today's Schedule & Assigned Row */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Today&apos;s Schedule</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} color="var(--neutral)" />
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: staff.scheduled_shift ? 'var(--text)' : 'var(--neutral)' }}>
              {staff.scheduled_shift || 'No schedule set'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', position: 'relative' }}>
            <MapPin size={14} color="var(--neutral)" />
            {effectiveRow ? (
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: effectiveRow === 'EL' ? 'rgba(139,92,246,0.15)' :
                    effectiveRow === 'MC' ? 'rgba(14,165,233,0.15)' :
                    'rgba(245,158,11,0.15)',
                  color: effectiveRow === 'EL' ? '#8b5cf6' :
                    effectiveRow === 'MC' ? '#0ea5e9' :
                    '#92400e',
                }}
              >
                {effectiveRow === 'EL' ? 'EL (Early Learners)' :
                  effectiveRow === 'MC' ? 'MC (Main Classroom)' :
                  'UC (Upper Classroom)'}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--text-base)', color: 'var(--neutral)' }}>Not assigned to a row</span>
            )}
            <button
              onClick={() => setShowRowDropdown(!showRowDropdown)}
              style={{
                marginLeft: 'auto',
                padding: '3px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--white)',
                color: 'var(--neutral)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Change
            </button>
            {showRowDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  zIndex: 20,
                  minWidth: 160,
                  padding: 'var(--space-1)',
                }}
              >
                {[
                  { value: 'EL', label: 'EL (Early Learners)', color: '#8b5cf6' },
                  { value: 'MC', label: 'MC (Main Classroom)', color: '#0ea5e9' },
                  { value: 'UC', label: 'UC (Upper Classroom)', color: '#92400e' },
                  { value: null, label: 'None', color: 'var(--neutral)' },
                ].map((opt) => (
                  <button
                    key={opt.value || 'none'}
                    onClick={() => {
                      setRowOverride(opt.value);
                      setShowRowDropdown(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: 6,
                      background: effectiveRow === opt.value ? 'var(--base)' : 'transparent',
                      textAlign: 'left',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--text-sm)',
                      fontWeight: effectiveRow === opt.value ? 700 : 500,
                      color: opt.color,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Entries */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Time Entries</h4>
        <div className={styles.entries}>
          {periodEntries.length === 0 && (
            <EmptyState icon={Clock} title="No entries this period" description="Manual entries can be added below" />
          )}
          {periodEntries.map((entry) => {
            const duration = entry.duration_minutes
              ? (entry.duration_minutes / 60).toFixed(2)
              : 'In progress';
            return (
              <div key={entry.id} className={styles.entry}>
                <span className={styles.entryDate}>{formatEntryDate(entry.clock_in)}</span>
                <span className={styles.entryTime}>
                  {formatTime(entry.clock_in)}
                  {entry.clock_out ? ` – ${formatTime(entry.clock_out)}` : ' – now'}
                </span>
                <span
                  className={
                    entry.duration_minutes ? styles.entryDuration : styles.entryDurationActive
                  }
                >
                  {entry.duration_minutes ? `${duration} hrs` : duration}
                </span>
                <Badge variant="neutral">{entry.source}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Manual Entry */}
      <div className={styles.section}>
        {showManualForm ? (
          <div className={styles.manualForm}>
            <h4 className={styles.sectionTitle}>Add Manual Entry</h4>
            <div className={styles.manualRow}>
              <input
                type="date"
                className={styles.manualInput}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
              <input
                type="time"
                className={styles.manualInput}
                value={manualIn}
                onChange={(e) => setManualIn(e.target.value)}
              />
              <span className={styles.manualTo}>to</span>
              <input
                type="time"
                className={styles.manualInput}
                value={manualOut}
                onChange={(e) => setManualOut(e.target.value)}
              />
            </div>
            <div className={styles.manualActions}>
              <Button variant="primary" size="sm" onClick={handleAddManual}>
                Add Entry
              </Button>
              <button className={styles.cancelLink} onClick={() => setShowManualForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className={styles.dashedBtn} onClick={() => setShowManualForm(true)}>
            <Plus size={14} /> Add Manual Entry
          </button>
        )}
      </div>

      {/* Delete Staff */}
      <div className={styles.section} style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        {deleteError && (
          <p style={{ color: 'var(--red)', fontSize: 'var(--text-sm)', margin: '0 0 10px', fontFamily: 'var(--font-primary)' }}>{deleteError}</p>
        )}
        {showDeleteConfirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>
              Are you sure you want to delete <strong>{staffName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (isClockedIn) {
                    setDeleteError('Cannot delete a staff member who is currently clocked in. Clock them out first.');
                    setShowDeleteConfirm(false);
                    return;
                  }
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    await api.staff.deactivate(staff.id);
                    setShowDeleteConfirm(false);
                    onDelete?.();
                    onClose();
                  } catch {
                    setDeleteError('Failed to delete staff member.');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--red)',
                  borderRadius: 6,
                  background: 'var(--red)',
                  color: 'var(--white)',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--white)',
                  color: 'var(--neutral)',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1_5)',
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Trash2 size={14} /> Delete Staff Member
          </button>
        )}
      </div>
    </Modal>
  );
}
