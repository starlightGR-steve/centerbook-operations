'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { clockInStaff } from '@/hooks/useTimeclock';
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
}

function getInitials(name: string): string {
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
}: StaffDetailModalProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualIn, setManualIn] = useState('15:00');
  const [manualOut, setManualOut] = useState('18:00');

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
        <div className={styles.avatarLarge}>{getInitials(staff.full_name)}</div>
        <div className={styles.headerInfo}>
          <h3 className={styles.name}>{staff.full_name}</h3>
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

      {/* Time Entries */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Time Entries</h4>
        <div className={styles.entries}>
          {periodEntries.length === 0 && (
            <p className={styles.empty}>No entries for this period.</p>
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
    </Modal>
  );
}
