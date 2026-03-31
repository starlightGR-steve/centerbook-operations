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
  clockedInIds?: Set<number>;
}

function EditStaffModal({ staff: s, onClose, onSuccess, clockedInIds }: EditModalProps) {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const staffName = getStaffName(s);
  const isClockedIn = clockedInIds?.has(s.id) ?? false;

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

        {/* Delete */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 28px' }}>
          {showDeleteConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>
                Are you sure you want to delete <strong>{staffName}</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    if (isClockedIn) {
                      setError('Cannot delete a staff member who is currently clocked in. Clock them out first.');
                      setShowDeleteConfirm(false);
                      return;
                    }
                    setDeleting(true);
                    setError('');
                    try {
                      await fetch(`/api/staff/${s.id}/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_active: 0 }),
                      });
                      onSuccess();
                    } catch {
                      setError('Failed to delete staff member.');
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  style={{
                    padding: '6px 16px', border: '1px solid var(--red)', borderRadius: 6,
                    background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--text-sm)', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 6,
                    background: 'var(--white)', color: 'var(--neutral)', fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setError(''); setShowDeleteConfirm(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1_5)', background: 'none', border: 'none',
                color: 'var(--red)', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-sm)', fontWeight: 600,
                cursor: 'pointer', padding: 0,
              }}
            >
              Delete Staff Member
            </button>
          )}
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
  clockedInIds: Set<number>;
}

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'instruction_manager', label: 'Instruction Manager' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'grader', label: 'Grader' },
];

type StaffSortOption = 'name_asc' | 'name_desc' | 'role';

function StaffManagement({ staff, clockedInIds }: MgmtProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<StaffSortOption>('name_asc');

  const filteredStaff = useMemo(() => {
    let result = [...staff];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => getStaffName(s).toLowerCase().includes(q));
    }
    if (roleFilter) {
      result = result.filter((s) => s.role === roleFilter);
    }
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return getStaffName(a).localeCompare(getStaffName(b));
      if (sortBy === 'name_desc') return getStaffName(b).localeCompare(getStaffName(a));
      return (a.role || '').localeCompare(b.role || '');
    });
    return result;
  }, [staff, searchQuery, roleFilter, sortBy]);

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

      <div className={styles.staffControls}>
        <input
          className={styles.staffSearch}
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.staffFilter}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {ROLE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className={styles.staffFilter}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as StaffSortOption)}
        >
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="role">Role</option>
        </select>
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
          {filteredStaff.map((s) => (
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
          {filteredStaff.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '16px', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', color: 'var(--neutral)' }}>
                No staff members match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showCreate && <CreateStaffModal onClose={() => setShowCreate(false)} onSuccess={refreshStaff} />}
      {editTarget && <EditStaffModal staff={editTarget} onClose={() => setEditTarget(null)} onSuccess={refreshStaff} clockedInIds={clockedInIds} />}
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
        {isManager && staff && <StaffManagement staff={staff} clockedInIds={clockedInIds} />}
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
