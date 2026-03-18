'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './ClassroomSetup.module.css';

interface ConfigSection {
  id: string;
  name: string;
  order: number;
}

interface ConfigRow {
  id: string;
  section_id: string;
  name: string;
  seats: number;
  order: number;
}

interface ClassroomSetupProps {
  onBack: () => void;
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export default function ClassroomSetup({ onBack }: ClassroomSetupProps) {
  const [sections, setSections] = useState<ConfigSection[]>([]);
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load config
  useEffect(() => {
    (async () => {
      try {
        const data = await api.classroomConfig.get();
        setSections(data.sections || []);
        setRows(data.rows || []);
      } catch {
        // Start with empty if no config
        setSections([]);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCapacity = useMemo(
    () => rows.reduce((sum, r) => sum + (r.seats || 0), 0),
    [rows]
  );

  // Section operations
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: genId('sec'), name: '', order: prev.length + 1 },
    ]);
  };

  const updateSection = (id: string, field: keyof ConfigSection, value: string | number) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setRows((prev) => prev.filter((r) => r.section_id !== id));
    setDeleteConfirm(null);
  };

  // Row operations
  const addRow = (sectionId: string) => {
    const sectionRows = rows.filter((r) => r.section_id === sectionId);
    setRows((prev) => [
      ...prev,
      {
        id: genId('row'),
        section_id: sectionId,
        name: '',
        seats: 2,
        order: sectionRows.length + 1,
      },
    ]);
  };

  const updateRow = (id: string, field: keyof ConfigRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Validation
  const validate = (): string | null => {
    if (sections.length === 0) return 'Add at least one section.';
    for (const s of sections) {
      if (!s.name.trim()) return `Section "${s.id}" needs a name.`;
    }
    if (rows.length === 0) return 'Add at least one row.';
    for (const r of rows) {
      if (!r.name.trim()) return `Row in section needs a label.`;
      if (!r.seats || r.seats < 1) return `Row "${r.name}" needs at least 1 seat.`;
    }
    return null;
  };

  // Save
  const handleSave = async () => {
    const err = validate();
    if (err) {
      setSaveMessage({ type: 'error', text: err });
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.classroomConfig.save({
        sections: sections.map((s, i) => ({ ...s, order: i + 1 })),
        rows: rows.map((r) => {
          const sectionRows = rows.filter((rr) => rr.section_id === r.section_id);
          return { ...r, order: sectionRows.indexOf(r) + 1 };
        }),
      });
      setSaveMessage({ type: 'success', text: 'Saved successfully.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading classroom config...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
          <Pencil size={16} className={styles.headerIcon} />
          <h3 className={styles.title}>Classroom Setup</h3>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.capacityLabel}>
            Total capacity: <strong>{totalCapacity} seats</strong>
          </span>
          {saveMessage && (
            <span className={saveMessage.type === 'success' ? styles.msgSuccess : styles.msgError}>
              {saveMessage.text}
            </span>
          )}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {sections.map((section) => {
          const sectionRows = rows
            .filter((r) => r.section_id === section.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div key={section.id} className={styles.sectionCard}>
              {/* Section header */}
              <div className={styles.sectionHeader}>
                <div className={styles.sectionInputs}>
                  <input
                    className={styles.sectionNameInput}
                    placeholder="Section name..."
                    value={section.name}
                    onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                  />
                </div>
                {deleteConfirm === section.id ? (
                  <div className={styles.confirmDelete}>
                    <span className={styles.confirmText}>Delete section?</span>
                    <button className={styles.confirmYes} onClick={() => removeSection(section.id)}>Yes</button>
                    <button className={styles.confirmNo} onClick={() => setDeleteConfirm(null)}>No</button>
                  </div>
                ) : (
                  <button
                    className={styles.trashBtn}
                    onClick={() => setDeleteConfirm(section.id)}
                    title="Delete section"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Row labels (header) */}
              {sectionRows.length > 0 && (
                <div className={styles.rowHeader}>
                  <span className={styles.rowHeaderLabel} style={{ flex: 2 }}>Row Label</span>
                  <span className={styles.rowHeaderLabel} style={{ width: 80 }}>Seats</span>
                  <span className={styles.rowHeaderLabel} style={{ width: 60 }}></span>
                  <span className={styles.rowHeaderLabel} style={{ width: 28 }}></span>
                </div>
              )}

              {/* Row entries */}
              {sectionRows.map((row) => (
                <div key={row.id} className={styles.rowEntry}>
                  <input
                    className={styles.rowLabelInput}
                    placeholder="Row label..."
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <input
                    className={styles.rowNumInput}
                    type="number"
                    min={1}
                    max={20}
                    value={row.seats}
                    onChange={(e) => updateRow(row.id, 'seats', Number(e.target.value) || 0)}
                    style={{ width: 80 }}
                  />
                  <span className={styles.seatCount} style={{ width: 60 }}>
                    {row.seats} seats
                  </span>
                  <button
                    className={styles.removeRowBtn}
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Add row */}
              <button className={styles.addRowBtn} onClick={() => addRow(section.id)}>
                <Plus size={14} /> Add Row
              </button>
            </div>
          );
        })}

        {/* Add section */}
        <button className={styles.addSectionBtn} onClick={addSection}>
          <Plus size={16} /> Add Section
        </button>
      </div>
    </div>
  );
}
