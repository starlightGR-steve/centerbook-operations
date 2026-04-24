'use client';

import { useState } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { useVisitPlan } from '@/hooks/useVisitPlan';
import { useFlagConfig, useChecklistConfig } from '@/hooks/useFlagConfig';
import type { VisitPlanItem, Student } from '@/lib/types';
import PlanNextVisitModal, { type VisitPlanDraft } from '@/components/classroom/PlanNextVisitModal';
import styles from './NextClassPlanning.module.css';

interface NextClassPlanningProps {
  studentId: number;
  student: Student;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CUSTOM_PREFIX = 'custom:';

export default function NextClassPlanning({ studentId, student }: NextClassPlanningProps) {
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

  // Adapter: flatten shared-modal VisitPlanDraft into per-item inserts.
  // No diffing against existingActiveItems -- backend dedupes on (student_id,
  // item_type, item_key) per v2.53.0 contract. Spec section 5 is explicit:
  // "selection interface, not a completion tracker" -- every open is a clean slate,
  // Amy taps to ADD, server handles the rest.
  const handleSave = async (draft: VisitPlanDraft) => {
    const items: Array<{
      item_key: string;
      item_type: string;
      item_label?: string;
      notes?: string;
    }> = [];

    // Flags
    draft.flags.forEach((key) => {
      const label = flagConfig.find((f) => f.key === key)?.label ?? key;
      items.push({ item_key: key, item_type: 'flag', item_label: label });
    });

    // Checklist -- split out custom: prefixes
    draft.checklist.forEach((entry) => {
      if (entry.startsWith(CUSTOM_PREFIX)) {
        items.push({
          item_key: 'custom',
          item_type: 'custom',
          item_label: entry.slice(CUSTOM_PREFIX.length),
        });
      } else {
        const label = checklistConfig.find((c) => c.key === entry)?.label ?? entry;
        items.push({ item_key: entry, item_type: 'checklist', item_label: label });
      }
    });

    // Teacher note
    if (draft.note.trim()) {
      items.push({
        item_key: 'teacher_note',
        item_type: 'teacher_note',
        notes: draft.note.trim(),
      });
    }

    if (items.length > 0) {
      await addItems(items);
    }
    setShowModal(false);
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

      <PlanNextVisitModal
        student={student}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </>
  );
}
