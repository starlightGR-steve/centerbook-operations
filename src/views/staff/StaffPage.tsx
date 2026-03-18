'use client';

import { useState, useMemo, useEffect } from 'react';
import { Download, Eye, EyeOff, UserPlus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { mutate } from 'swr';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import PayPeriodNavigator from './PayPeriodNavigator';
import StaffTable from './StaffTable';
import StaffDetailModal from './StaffDetailModal';
import TimeclockPanel from './TimeclockPanel';
import { useStaff, useActiveStaff } from '@/hooks/useStaff';
import { useTimeclock } from '@/hooks/useTimeclock';
import { usePayPeriod } from '@/hooks/usePayPeriod';
import type { Staff, TimeEntry } from '@/lib/types';
import StaffSkeleton from './StaffSkeleton';
import styles from './StaffPage.module.css';

function getStaffName(s: Staff): string {
  if (s.full_name) return s.full_name;
  if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
  return s.first_name || s.last_name || 'Unnamed';
}

function exportPayrollCSV(
  staff: Staff[],
  timeEntries: TimeEntry[],
  periodStart: string,
  periodEnd: string
) {
  const rows = staff.map((s) => {
    const entries = timeEntries.filter(
      (e) =>
        e.staff_id === s.id &&
        e.clock_in >= periodStart &&
        e.clock_in <= periodEnd + 'T23:59:59' &&
        e.duration_minutes != null
    );
    const hours = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
    return [getStaffName(s), s.role, hours.toFixed(2), String(entries.length), `${periodStart} to ${periodEnd}`];
  });

  const header = 'Employee Name,Role,Total Hours,Entries,Period';
  const csv = [header, ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll_${periodStart}_${periodEnd}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════
   CREATE STAFF MODAL
   ═══════════════════════════════════════════ */
interface CreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateStaffModal({ onClose, onSuccess }: CreateModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [role, setRole] = useState<string>('staff');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const valid =
    firstName.trim() && lastName.trim() && email.includes('@') && role && password.length >= 6 && password === confirmPw;

  const handleSubmit = async () => {
    if (!valid) return;
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), phone: phone.trim(), hire_date: hireDate, role, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create staff'); setSaving(false); return; }
      onSuccess();
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add New Staff Member</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {error && <p className={styles.msgError}>{error}</p>}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>First Name *</label>
              <input className={styles.fieldInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Last Name *</label>
              <input className={styles.fieldInput} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Email *</label>
            <input className={styles.fieldInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Phone</label>
              <input className={styles.fieldInput} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Hire Date</label>
              <input className={styles.fieldInput} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Role *</label>
            <select className={styles.fieldSelect} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Temporary Password *</label>
            <div className={styles.passwordWrap}>
              <input className={styles.fieldInput} type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className={styles.toggleVis} onClick={() => setShowPw(!showPw)} type="button">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm Password *</label>
            <div className={styles.passwordWrap}>
              <input className={styles.fieldInput} type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              <button className={styles.toggleVis} onClick={() => setShowConfirm(!showConfirm)} type="button">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.modalSubmitBtn} disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? 'Creating...' : 'Create Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT STAFF MODAL
   ═══════════════════════════════════════════ */
interface EditModalProps {
  staff: Staff;
  onClose: () => void;
  onSuccess: () => void;
}

function EditStaffModal({ staff: s, onClose, onSuccess }: EditModalProps) {
  const nameParts = getStaffName(s).split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(s.email || '');
  const [phone, setPhone] = useState(s.phone || '');
  const [hireDate, setHireDate] = useState(s.hire_date || '');
  const [role, setRole] = useState<string>(s.role);
  const [isActive, setIsActive] = useState(s.status === 'Active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = firstName.trim() && lastName.trim() && email.includes('@') && role;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/staff/${s.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          hire_date: hireDate,
          role,
          is_active: isActive ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update'); setSaving(false); return; }
      onSuccess();
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Edit Staff Member</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {error && <p className={styles.msgError}>{error}</p>}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>First Name *</label>
              <input className={styles.fieldInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Last Name *</label>
              <input className={styles.fieldInput} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Email *</label>
            <input className={styles.fieldInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Phone</label>
              <input className={styles.fieldInput} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Hire Date</label>
              <input className={styles.fieldInput} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Role *</label>
              <select className={styles.fieldSelect} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Status</label>
              <select className={styles.fieldSelect} value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.modalSubmitBtn} disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RESET PASSWORD MODAL
   ═══════════════════════════════════════════ */
interface ResetPwModalProps {
  staff: Staff;
  onClose: () => void;
}

function ResetPasswordModal({ staff: s, onClose }: ResetPwModalProps) {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = newPw.length >= 6 && newPw === confirmPw;

  const handleSubmit = async () => {
    if (!valid) return;
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/staff/${s.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); setSaving(false); return; }
      setSuccess(`Password for ${getStaffName(s)} has been reset successfully.`);
      setNewPw('');
      setConfirmPw('');
      setSaving(false);
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Reset Password — {getStaffName(s)}</h3>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {error && <p className={styles.msgError}>{error}</p>}
          {success && <p className={styles.msgSuccess}>{success}</p>}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>New Temporary Password</label>
            <div className={styles.passwordWrap}>
              <input className={styles.fieldInput} type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <button className={styles.toggleVis} onClick={() => setShowNew(!showNew)} type="button">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm Password</label>
            <div className={styles.passwordWrap}>
              <input className={styles.fieldInput} type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              <button className={styles.toggleVis} onClick={() => setShowConfirm(!showConfirm)} type="button">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.modalSubmitBtn} disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STAFF MANAGEMENT SECTION
   ═══════════════════════════════════════════ */
interface MgmtProps {
  staff: Staff[];
}

function StaffManagement({ staff }: MgmtProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);

  const refreshStaff = () => {
    mutate('staff');
    setShowCreate(false);
    setEditTarget(null);
  };

  return (
    <div className={styles.mgmtSection}>
      <div className={styles.mgmtHeader}>
        <div>
          <h3 className={styles.mgmtTitle}>Staff User Management</h3>
          <p className={styles.mgmtDesc}>Create, edit, and manage staff accounts</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <UserPlus size={14} />
          Add Staff
        </Button>
      </div>

      <table className={styles.rosterTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td className={styles.rosterName}>{getStaffName(s)}</td>
              <td>{s.email || '—'}</td>
              <td className={styles.rosterRole}>{s.role}</td>
              <td>
                <span className={s.status === 'Active' ? styles.statusActive : styles.statusInactive}>
                  {s.status}
                </span>
              </td>
              <td>
                <div className={styles.rosterActions}>
                  <button className={styles.actionBtn} onClick={() => setEditTarget(s)}>Edit</button>
                  <button className={styles.actionBtnWarn} onClick={() => setResetTarget(s)}>Reset Password</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && <CreateStaffModal onClose={() => setShowCreate(false)} onSuccess={refreshStaff} />}
      {editTarget && <EditStaffModal staff={editTarget} onClose={() => setEditTarget(null)} onSuccess={refreshStaff} />}
      {resetTarget && <ResetPasswordModal staff={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function StaffPage() {
  const { data: session, status } = useSession();
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const { data: staff, isLoading: staffLoading, mutate: mutateStaff } = useStaff();
  const { data: activeStaff } = useActiveStaff();
  const { data: timeEntries, error: timeError, isLoading: timeLoading } = useTimeclock();
  const { start, end, label, goPrev, goNext, goToCurrent } = usePayPeriod();
  const [timeclockOpen, setTimeclockOpen] = useState(false);

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isManager = status === 'authenticated' && (userRole === 'admin' || userRole === 'superuser');

  const hasEntries = !!timeEntries && timeEntries.length > 0;
  const timeReady = !timeLoading;

  useEffect(() => {
    if (hasEntries) setTimeclockOpen(true);
  }, [hasEntries]);

  const clockedInIds = useMemo(() => {
    const ids = new Set<number>();
    timeEntries?.forEach((e) => {
      if (e.clock_out === null) ids.add(e.staff_id);
    });
    return ids;
  }, [timeEntries]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Track Your"
            title="Staff Hours & Payroll"
            subtitle="Export time data for payroll processing"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              staff &&
              timeEntries &&
              exportPayrollCSV(staff, timeEntries, start, end)
            }
          >
            <Download size={16} />
            Export
          </Button>
        </div>
        <PayPeriodNavigator
          label={label}
          onPrev={goPrev}
          onNext={goNext}
          onCurrent={goToCurrent}
        />
      </div>

      <div className={styles.content}>
        {staffLoading ? (
          <StaffSkeleton />
        ) : staff ? (
          <>
            <div className={styles.collapsibleSection}>
              <button
                className={styles.collapsibleHeader}
                onClick={() => setTimeclockOpen(!timeclockOpen)}
              >
                <span className={styles.collapsibleTitle}>
                  <Clock size={16} />
                  Timeclock &amp; Payroll
                  {hasEntries && (
                    <span className={styles.entryCount}>{timeEntries.length} entries</span>
                  )}
                </span>
                {timeclockOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <div className={`${styles.collapsibleContent} ${timeclockOpen ? styles.collapsibleOpen : ''}`}>
                {!timeReady ? (
                  <StaffSkeleton />
                ) : hasEntries ? (
                  <>
                    <StaffTable
                      staff={staff}
                      timeEntries={timeEntries}
                      clockedInIds={clockedInIds}
                      periodStart={start}
                      periodEnd={end}
                      onSelect={setSelectedStaff}
                    />
                    {activeStaff && (
                      <div className={styles.timeclockWrap}>
                        <TimeclockPanel staff={activeStaff} timeEntries={timeEntries} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <Clock size={32} />
                    <p>No timeclock entries for this pay period.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
        {isManager && staff && <StaffManagement staff={staff} />}
      </div>

      {selectedStaff && (
        <StaffDetailModal
          open={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
          staff={selectedStaff}
          timeEntries={timeEntries || []}
          periodStart={start}
          periodEnd={end}
          clockedInIds={clockedInIds}
          onDelete={() => mutateStaff()}
        />
      )}
    </div>
  );
}
