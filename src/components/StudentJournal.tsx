'use client';

import { useState } from 'react';
import { Pencil, Trash2, BookOpen, Plus } from 'lucide-react';
import { useStudentJournal, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/hooks/useStudentJournal';
import type { JournalEntry, JournalEntryType } from '@/lib/types';
import styles from './StudentJournal.module.css';

// ── Entry type config ──

const JOURNAL_ENTRY_TYPES: { value: JournalEntryType; label: string }[] = [
  { value: 'behavioral_log', label: 'Behavioral Log' },
  { value: 'goal_setting', label: 'Goal Setting' },
  { value: 'parent_conversation', label: 'Parent Conversation' },
  { value: 'student_checkin', label: 'Student Check-in' },
  { value: 'progress_meeting', label: 'Progress Meeting' },
];

const TYPE_LABELS: Record<string, string> = {
  behavioral_log: 'Behavioral Log',
  goal_setting: 'Goal Setting',
  parent_conversation: 'Parent Conversation',
  student_checkin: 'Student Check-in',
  progress_meeting: 'Progress Meeting',
  general: 'General',
};

function typeBadgeClass(t: string): string {
  switch (t) {
    case 'behavioral_log': return styles.typeBehavioral;
    case 'goal_setting': return styles.typeGoal;
    case 'parent_conversation': return styles.typeParent;
    case 'student_checkin': return styles.typeCheckin;
    case 'progress_meeting': return styles.typeMeeting;
    default: return styles.typeGeneral;
  }
}

// ── Relative time ──

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Metadata renderers ──

function renderMetadata(entry: JournalEntry) {
  const m = entry.metadata as Record<string, any> | null;
  if (!m) return null;
  switch (entry.entry_type) {
    case 'behavioral_log':
      return (
        <div className={styles.metaRow}>
          {m.severity && <span>Severity: {String(m.severity)}</span>}
          {m.resolution && <span>Resolution: {String(m.resolution)}</span>}
          {m.parent_notified !== undefined && <span>Parent notified: {m.parent_notified ? 'Yes' : 'No'}</span>}
        </div>
      );
    case 'goal_setting':
      return (
        <div className={styles.metaRow}>
          {m.target_date && <span>Target: {new Date(String(m.target_date) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          {m.goal_status && <span className={`${styles.goalBadge} ${styles[`goal${String(m.goal_status).charAt(0).toUpperCase()}${String(m.goal_status).slice(1)}`] || ''}`}>Status: {String(m.goal_status)}</span>}
        </div>
      );
    case 'parent_conversation':
      return (
        <div className={styles.metaRow}>
          {m.who_initiated && <span>Initiated by: {String(m.who_initiated)}</span>}
          {m.topic && <span>Topic: {String(m.topic)}</span>}
          {m.outcome && <span>Outcome: {String(m.outcome)}</span>}
          {m.follow_up_needed !== undefined && <span>Follow-up needed: {m.follow_up_needed ? 'Yes' : 'No'}</span>}
        </div>
      );
    case 'student_checkin':
      return (
        <div className={styles.metaRow}>
          {m.homework_status && <span>Homework: {String(m.homework_status)}</span>}
          {m.school_update && <span>School: {String(m.school_update)}</span>}
        </div>
      );
    case 'progress_meeting':
      return (
        <div className={styles.metaRow}>
          {m.meeting_date && <span>Meeting date: {new Date(String(m.meeting_date) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
        </div>
      );
    default:
      return null;
  }
}

// ── Type-specific fields component ──

interface TypeFieldsProps {
  entryType: JournalEntryType;
  metadata: Record<string, unknown>;
  onChange: (m: Record<string, unknown>) => void;
}

function TypeSpecificFields({ entryType, metadata, onChange }: TypeFieldsProps) {
  const set = (key: string, val: unknown) => onChange({ ...metadata, [key]: val });

  switch (entryType) {
    case 'behavioral_log':
      return (
        <div className={styles.typeFields}>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Severity</label>
            <select className={styles.typeFieldSelect} value={String(metadata.severity ?? '')} onChange={(e) => set('severity', e.target.value || null)}>
              <option value="">—</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Resolution</label>
            <input className={styles.typeFieldInput} value={String(metadata.resolution ?? '')} onChange={(e) => set('resolution', e.target.value || null)} placeholder="Resolution..." />
          </div>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={!!metadata.parent_notified} onChange={(e) => set('parent_notified', e.target.checked)} />
            Parent Notified
          </label>
        </div>
      );
    case 'goal_setting':
      return (
        <div className={styles.typeFields}>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Target Date</label>
            <input type="date" className={styles.typeFieldInput} value={String(metadata.target_date ?? '')} onChange={(e) => set('target_date', e.target.value || null)} />
          </div>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Goal Status</label>
            <div className={styles.pillRow}>
              {(['active', 'met', 'revised'] as const).map((s) => (
                <button key={s} type="button" className={`${styles.pill} ${metadata.goal_status === s ? styles.pillActive : ''}`} onClick={() => set('goal_status', s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    case 'parent_conversation':
      return (
        <div className={styles.typeFields}>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Who Initiated</label>
            <div className={styles.pillRow}>
              {(['Parent', 'Staff'] as const).map((s) => (
                <button key={s} type="button" className={`${styles.pill} ${metadata.who_initiated === s ? styles.pillActive : ''}`} onClick={() => set('who_initiated', s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Topic</label>
            <input className={styles.typeFieldInput} value={String(metadata.topic ?? '')} onChange={(e) => set('topic', e.target.value || null)} placeholder="Topic..." />
          </div>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Outcome</label>
            <input className={styles.typeFieldInput} value={String(metadata.outcome ?? '')} onChange={(e) => set('outcome', e.target.value || null)} placeholder="Outcome..." />
          </div>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={!!metadata.follow_up_needed} onChange={(e) => set('follow_up_needed', e.target.checked)} />
            Follow-up Needed
          </label>
        </div>
      );
    case 'student_checkin':
      return (
        <div className={styles.typeFields}>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Homework Status</label>
            <input className={styles.typeFieldInput} value={String(metadata.homework_status ?? '')} onChange={(e) => set('homework_status', e.target.value || null)} placeholder="Homework status..." />
          </div>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>School Update</label>
            <input className={styles.typeFieldInput} value={String(metadata.school_update ?? '')} onChange={(e) => set('school_update', e.target.value || null)} placeholder="School update..." />
          </div>
        </div>
      );
    case 'progress_meeting':
      return (
        <div className={styles.typeFields}>
          <div className={styles.typeFieldRow}>
            <label className={styles.typeFieldLabel}>Meeting Date</label>
            <input type="date" className={styles.typeFieldInput} value={String(metadata.meeting_date ?? '')} onChange={(e) => set('meeting_date', e.target.value || null)} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

// ── Main component ──

interface Props {
  studentId: number;
  staffId: number;
  staffName: string;
}

export default function StudentJournal({ studentId, staffId, staffName }: Props) {
  const { data: entries, mutate: mutateEntries } = useStudentJournal(studentId);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<JournalEntryType>('behavioral_log');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMeta, setFormMeta] = useState<Record<string, unknown>>({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editType, setEditType] = useState<JournalEntryType>('behavioral_log');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMeta, setEditMeta] = useState<Record<string, unknown>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<JournalEntryType | 'all'>('all');

  const resetForm = () => {
    setFormType('behavioral_log');
    setFormTitle('');
    setFormContent('');
    setFormMeta({});
    setFormError(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (formSaving) return;
    setFormSaving(true);
    setFormError(null);
    try {
      await createJournalEntry({
        student_id: studentId,
        entry_type: formType,
        author_id: staffId,
        title: formTitle.trim() || undefined,
        content: formContent.trim() || undefined,
        metadata: Object.keys(formMeta).length > 0 ? formMeta : undefined,
      });
      resetForm();
      mutateEntries();
    } catch {
      setFormError('Failed to save entry. Please try again.');
    } finally {
      setFormSaving(false);
    }
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditType(entry.entry_type);
    setEditTitle(entry.title ?? '');
    setEditContent(entry.content);
    setEditMeta(entry.metadata ? { ...entry.metadata } : {});
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleUpdate = async (id: number) => {
    if (editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateJournalEntry(id, studentId, {
        entry_type: editType,
        title: editTitle.trim() || undefined,
        content: editContent.trim() || undefined,
        metadata: Object.keys(editMeta).length > 0 ? editMeta : undefined,
      });
      setEditingId(null);
      mutateEntries();
    } catch {
      setEditError('Failed to update entry. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteJournalEntry(id, studentId);
      setDeleteConfirm(null);
      mutateEntries();
    } catch {
      // silent — entry will remain in list
    }
  };

  const filtered = entries
    ? (filterType === 'all' ? entries : entries.filter((e) => e.entry_type === filterType))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  return (
    <div>
      {/* Section heading */}
      <div className={styles.journalHeader}>
        <h4 className={styles.groupHeading}>Student Journal</h4>
        <button className={styles.newEntryBtn} onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> New Entry
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className={styles.entryForm}>
          <div className={styles.typePills}>
            {JOURNAL_ENTRY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`${styles.typePill} ${formType === t.value ? styles.typePillActive : ''} ${typeBadgeClass(t.value)}`}
                onClick={() => { setFormType(t.value); setFormMeta({}); }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            className={styles.formInput}
            placeholder="Entry title (optional)"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          <textarea
            className={styles.formTextarea}
            placeholder="Write your notes here..."
            rows={4}
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
          />

          <TypeSpecificFields entryType={formType} metadata={formMeta} onChange={setFormMeta} />

          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleCreate} disabled={formSaving}>
              {formSaving ? 'Saving…' : 'Save Entry'}
            </button>
            <button className={styles.cancelBtn} onClick={resetForm} disabled={formSaving}>
              Cancel
            </button>
          </div>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
        </div>
      )}

      {/* ── Filter pills ── */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterPill} ${filterType === 'all' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        {JOURNAL_ENTRY_TYPES.map((t) => (
          <button
            key={t.value}
            className={`${styles.filterPill} ${filterType === t.value ? styles.filterPillActive : ''}`}
            onClick={() => setFilterType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Entry list ── */}
      <div className={styles.entryList}>
        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <BookOpen size={24} className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {entries && entries.length > 0
                ? 'No entries match this filter.'
                : 'No journal entries yet. Click + New Entry to start tracking this student.'}
            </p>
          </div>
        )}

        {filtered.map((entry) =>
          editingId === entry.id ? (
            /* ── Inline edit form ── */
            <div key={entry.id} className={styles.entryCard}>
              <div className={styles.typePills}>
                {JOURNAL_ENTRY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`${styles.typePill} ${editType === t.value ? styles.typePillActive : ''} ${typeBadgeClass(t.value)}`}
                    onClick={() => { setEditType(t.value); setEditMeta({}); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                className={styles.formInput}
                placeholder="Entry title (optional)"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <textarea
                className={styles.formTextarea}
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <TypeSpecificFields entryType={editType} metadata={editMeta} onChange={setEditMeta} />
              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={() => handleUpdate(entry.id)} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className={styles.cancelBtn} onClick={cancelEdit} disabled={editSaving}>
                  Cancel
                </button>
              </div>
              {editError && <p className={styles.errorMsg}>{editError}</p>}
            </div>
          ) : (
            /* ── Read-only entry card ── */
            <div key={entry.id} className={styles.entryCard}>
              <div className={styles.entryHeader}>
                <div className={styles.entryHeaderLeft}>
                  <span className={`${styles.typeBadge} ${typeBadgeClass(entry.entry_type)}`}>
                    {TYPE_LABELS[entry.entry_type] || entry.entry_type}
                  </span>
                  {entry.title && <span className={styles.entryTitle}>{entry.title}</span>}
                </div>
                <div className={styles.entryHeaderRight}>
                  <span className={styles.entryMeta}>
                    {entry.author_name || 'Staff'} — {formatRelativeTime(entry.created_at)}
                  </span>
                  <div className={styles.entryActions}>
                    <button className={styles.iconBtn} onClick={() => startEdit(entry)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    {deleteConfirm === entry.id ? (
                      <span className={styles.deleteConfirm}>
                        <span className={styles.deleteText}>Delete?</span>
                        <button className={styles.deleteYes} onClick={() => handleDelete(entry.id)}>Yes</button>
                        <button className={styles.deleteNo} onClick={() => setDeleteConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <button className={styles.iconBtn} onClick={() => setDeleteConfirm(entry.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {entry.content && <p className={styles.entryContent}>{entry.content}</p>}
              {renderMetadata(entry)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
