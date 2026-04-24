'use client';

import { useState } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Square, CheckSquare } from 'lucide-react';
import { useVisitPlan } from '@/hooks/useVisitPlan';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import type { VisitPlanItem, Student } from '@/lib/types';
import styles from './NextClassPlanning.module.css';

interface NextClassPlanningProps {
  studentId: number;
  student: Student;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NextClassPlanning({ studentId, student: _student }: NextClassPlanningProps) {
  const { activeItems, completedItems, addItems, markDone, reopen, removeItem } = useVisitPlan(studentId);
  const { flags: flagConfig } = useFlagConfig();
  const { items: checklistConfig } = useChecklistConfig();
  const [showModal, setShowModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const getFlagColor = (key: string) =>
    flagConfig.find((f) => f.key === key)?.color || 'var(--neutral)';
  const getFlagLabel = (key: string) =>
    flagConfig.find((f) => f.key === key)?.label || key;
  const getChecklistLabel = (key: string) =>
    checklistConfig.find((c) => c.key === key)?.label || key;

  const getDisplayLabel = (item: VisitPlanItem): string => {
    if (item.item_type === 'flag') return getFlagLabel(item.item_key);
    if (item.item_type === 'checklist') return item.item_label || getChecklistLabel(item.item_key);
    if (item.item_type === 'custom') return item.item_label || item.item_key;
    if (item.item_type === 'teacher_note') return 'Note for Teacher';
    return item.item_label || item.item_key;
  };

  return (
    <>
      <div className={styles.heading}>
        <span>Next Class Planning</span>
        <button className={styles.planBtn} onClick={() => setShowModal(true)}>
          <Plus size={12} /> Plan Next Visit
        </button>
      </div>

      {activeItems.length === 0 && completedItems.length === 0 && (
        <p className={styles.emptyState}>No plan items yet. Use &ldquo;Plan Next Visit&rdquo; to prepare.</p>
      )}

      {activeItems.length > 0 && (
        <div className={styles.itemList}>
          {activeItems.map((item) => {
            const isNote = item.item_type === 'teacher_note';
            return (
              <div key={item.id} className={`${styles.item} ${isNote ? styles.teacherNoteBox : ''}`}>
                <button className={styles.itemCheckbox} onClick={() => markDone(item.id)} title="Mark done">
                  <Square size={12} color="var(--neutral)" />
                </button>
                <div className={styles.itemBody}>
                  <div className={styles.itemLabel}>
                    {item.item_type === 'flag' && (
                      <span className={styles.itemFlagDot} style={{ background: getFlagColor(item.item_key) }} />
                    )}
                    {getDisplayLabel(item)}
                  </div>
                  {(isNote ? item.notes : item.notes) && (
                    <div className={styles.itemNotes}>{item.notes}</div>
                  )}
                  {item.planned_by_name && (
                    <div className={styles.itemMeta}>Planned by {item.planned_by_name}</div>
                  )}
                </div>
                <button className={styles.deleteBtn} onClick={() => removeItem(item.id)} title="Remove">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {completedItems.length > 0 && (
        <>
          <button className={styles.completedToggle} onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Completed ({completedItems.length})
          </button>
          {showCompleted && (
            <div className={styles.itemList}>
              {completedItems.map((item) => (
                <div key={item.id} className={styles.completedItem}>
                  <button className={styles.itemCheckbox} onClick={() => reopen(item.id)} title="Reopen">
                    <Check size={10} color="#fff" />
                  </button>
                  <div className={styles.itemBody}>
                    <div className={styles.itemLabel}>{getDisplayLabel(item)}</div>
                    {item.completed_by_name && (
                      <div className={styles.itemMeta}>
                        Done by {item.completed_by_name} &middot; {item.completed_at ? formatTimestamp(item.completed_at) : ''}
                      </div>
                    )}
                  </div>
                  <button className={styles.deleteBtn} onClick={() => removeItem(item.id)} title="Remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <PlanNextVisitModal
          studentId={studentId}
          existingActiveItems={activeItems}
          onSave={async (items) => {
            await addItems(items);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Planning Modal ──────────────────────────

interface PlanModalProps {
  studentId: number;
  existingActiveItems: VisitPlanItem[];
  onSave: (items: Array<{ item_key: string; item_type: string; item_label?: string; notes?: string }>) => Promise<void>;
  onClose: () => void;
}

function PlanNextVisitModal({ existingActiveItems, onSave, onClose }: PlanModalProps) {
  const { flags: flagConfigItems } = useFlagConfig();
  const { items: checklistConfigItems } = useChecklistConfig();

  // Pre-select items that already exist in the active plan
  const existingFlagKeys = new Set(existingActiveItems.filter((i) => i.item_type === 'flag').map((i) => i.item_key));
  const existingChecklistKeys = new Set(existingActiveItems.filter((i) => i.item_type === 'checklist').map((i) => i.item_key));
  const existingNote = existingActiveItems.find((i) => i.item_type === 'teacher_note')?.notes || '';

  const [selectedFlags, setSelectedFlags] = useState<string[]>([...existingFlagKeys]);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([...existingChecklistKeys]);
  const [customTask, setCustomTask] = useState('');
  const [customTasks, setCustomTasks] = useState<string[]>([]);
  const [teacherNote, setTeacherNote] = useState(existingNote);
  const [saving, setSaving] = useState(false);

  const toggleFlag = (key: string) => {
    setSelectedFlags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleChecklist = (key: string) => {
    setSelectedChecklist((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addCustomTask = () => {
    if (!customTask.trim()) return;
    setCustomTasks((prev) => [...prev, customTask.trim()]);
    setCustomTask('');
  };

  const removeCustomTask = (index: number) => {
    setCustomTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    const items: Array<{ item_key: string; item_type: string; item_label?: string; notes?: string }> = [];

    // Flags — only add new ones (not already in active plan)
    selectedFlags.forEach((key) => {
      if (!existingFlagKeys.has(key)) {
        const label = flagConfigItems.find((f) => f.key === key)?.label;
        items.push({ item_key: key, item_type: 'flag', item_label: label });
      }
    });

    // Checklist — only add new ones
    selectedChecklist.forEach((key) => {
      if (!existingChecklistKeys.has(key)) {
        const label = checklistConfigItems.find((c) => c.key === key)?.label;
        items.push({ item_key: key, item_type: 'checklist', item_label: label });
      }
    });

    // Custom tasks
    customTasks.forEach((text) => {
      items.push({ item_key: 'custom', item_type: 'custom', item_label: text });
    });

    // Teacher note
    if (teacherNote.trim() && teacherNote.trim() !== existingNote) {
      items.push({ item_key: 'teacher_note', item_type: 'teacher_note', notes: teacherNote.trim() });
    }

    if (items.length > 0) {
      await onSave(items);
    } else {
      onClose();
    }
    setSaving(false);
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Plan Next Visit</h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Student Flags */}
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Student Flags</span>
          <div className={styles.pillGrid}>
            {flagConfigItems.map((fi) => (
              <button
                key={fi.key}
                className={`${styles.pill} ${selectedFlags.includes(fi.key) ? styles.pillSelected : ''}`}
                onClick={() => toggleFlag(fi.key)}
              >
                {selectedFlags.includes(fi.key) && <Check size={12} />}
                {fi.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Checklist */}
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Teacher Checklist</span>
          <div className={styles.pillGrid}>
            {checklistConfigItems.map((ci) => (
              <button
                key={ci.key}
                className={`${styles.pill} ${selectedChecklist.includes(ci.key) ? styles.pillSelected : ''}`}
                onClick={() => toggleChecklist(ci.key)}
              >
                {selectedChecklist.includes(ci.key) && <Check size={12} />}
                {ci.label}
              </button>
            ))}
            {customTasks.map((text, i) => (
              <button
                key={`custom-${i}`}
                className={`${styles.pill} ${styles.pillSelected}`}
                onClick={() => removeCustomTask(i)}
              >
                <Check size={12} /> {text}
              </button>
            ))}
          </div>
          <div className={styles.addTaskRow}>
            <input
              className={styles.addTaskInput}
              placeholder="Custom task..."
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
            />
            <button className={styles.addTaskBtn} onClick={addCustomTask} disabled={!customTask.trim()}>
              Add
            </button>
          </div>
        </div>

        {/* Note for Teacher */}
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Note for Teacher</span>
          <textarea
            className={styles.noteTextarea}
            placeholder="Add a note for the classroom teacher..."
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value)}
          />
        </div>

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
    </>
  );
}
