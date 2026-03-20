'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GripVertical,
  Plus,
  X,
  Lightbulb,
  CircleHelp,
  BookOpen,
  Star,
  AlertCircle,
  Zap,
  Flag,
  Heart,
  UserCheck,
  Sparkles,
  Settings as SettingsIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useCenterSettings, updateCenterSettings } from '@/hooks/useCenterSettings';
import { DEFAULT_FLAGS, DEFAULT_CHECKLIST } from '@/lib/flags';
import type { FlagConfigItem, ChecklistConfigItem } from '@/lib/types';
import styles from './CenterSetupPage.module.css';

/* ── Icon options for the selector ── */
const ICON_OPTIONS = [
  'Lightbulb',
  'CircleHelp',
  'BookOpen',
  'Star',
  'AlertCircle',
  'Zap',
  'Flag',
  'Heart',
  'UserCheck',
  'Sparkles',
  ...Array.from({ length: 26 }, (_, i) => `text:${String.fromCharCode(65 + i)}`),
];

/* ── Render icon from config string ── */
function renderIcon(icon: string, size: number = 8, color: string = '#fff') {
  if (icon.startsWith('text:')) {
    return (
      <span style={{ fontSize: size, fontWeight: 700, color, lineHeight: 1 }}>
        {icon.slice(5)}
      </span>
    );
  }
  const props = { size, color };
  switch (icon) {
    case 'Lightbulb':
      return <Lightbulb {...props} />;
    case 'CircleHelp':
      return <CircleHelp {...props} />;
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'AlertCircle':
      return <AlertCircle {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    case 'Flag':
      return <Flag {...props} />;
    case 'Heart':
      return <Heart {...props} />;
    case 'UserCheck':
      return <UserCheck {...props} />;
    case 'Sparkles':
      return <Sparkles {...props} />;
    default:
      return <Flag {...props} />;
  }
}

/* ── Helpers ── */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export default function CenterSetupPage() {
  const { data: settings, isLoading } = useCenterSettings();

  // ── Flags state ──
  const [flagsList, setFlagsList] = useState<FlagConfigItem[]>([]);
  const [savingFlags, setSavingFlags] = useState(false);
  const [flagsSaved, setFlagsSaved] = useState(false);
  const [deletingFlagIdx, setDeletingFlagIdx] = useState<number | null>(null);

  // ── Checklist state ──
  const [checklistList, setChecklistList] = useState<ChecklistConfigItem[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistSaved, setChecklistSaved] = useState(false);
  const [deletingCheckIdx, setDeletingCheckIdx] = useState<number | null>(null);

  // ── Initialize from settings ──
  useEffect(() => {
    if (settings) {
      setFlagsList(settings.flags?.length ? settings.flags : [...DEFAULT_FLAGS]);
      setChecklistList(
        settings.checklist_items?.length ? settings.checklist_items : [...DEFAULT_CHECKLIST]
      );
    }
  }, [settings]);

  // ── Flag handlers ──
  const updateFlag = useCallback((idx: number, patch: Partial<FlagConfigItem>) => {
    setFlagsList((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }, []);

  const moveFlag = useCallback((idx: number, dir: -1 | 1) => {
    setFlagsList((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const addFlag = useCallback(() => {
    setFlagsList((prev) => [
      ...prev,
      {
        key: `flag_${Date.now()}`,
        label: 'New Flag',
        icon: 'Flag',
        color: '#6b7280',
        enabled: true,
        sort_order: prev.length,
      },
    ]);
  }, []);

  const deleteFlag = useCallback((idx: number) => {
    setFlagsList((prev) => prev.filter((_, i) => i !== idx));
    setDeletingFlagIdx(null);
  }, []);

  const handleSaveFlags = async () => {
    setSavingFlags(true);
    await updateCenterSettings({
      flags: flagsList.map((f, i) => ({ ...f, sort_order: i, key: f.key || slugify(f.label) })),
    });
    setSavingFlags(false);
    setFlagsSaved(true);
    setTimeout(() => setFlagsSaved(false), 2000);
  };

  // ── Checklist handlers ──
  const updateCheckItem = useCallback((idx: number, patch: Partial<ChecklistConfigItem>) => {
    setChecklistList((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }, []);

  const moveCheckItem = useCallback((idx: number, dir: -1 | 1) => {
    setChecklistList((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const addCheckItem = useCallback(() => {
    setChecklistList((prev) => [
      ...prev,
      {
        key: `item_${Date.now()}`,
        label: 'New Item',
        enabled: true,
        sort_order: prev.length,
      },
    ]);
  }, []);

  const deleteCheckItem = useCallback((idx: number) => {
    setChecklistList((prev) => prev.filter((_, i) => i !== idx));
    setDeletingCheckIdx(null);
  }, []);

  const handleSaveChecklist = async () => {
    setSavingChecklist(true);
    await updateCenterSettings({
      checklist_items: checklistList.map((c, i) => ({
        ...c,
        sort_order: i,
        key: c.key || slugify(c.label),
      })),
    });
    setSavingChecklist(false);
    setChecklistSaved(true);
    setTimeout(() => setChecklistSaved(false), 2000);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading center settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Center Setup</h1>
        <p className={styles.pageSubtitle}>
          Configure flags, checklist items, and center preferences
        </p>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* ══════ Section 1: FLAGS ══════ */}
        <div className={styles.section}>
          <h3 className={styles.groupHeading}>Flags</h3>
          <p className={styles.sectionDescription}>
            Flags appear as colored dots on student seat slots in the Live Class view. Instructors
            can toggle them during class to communicate status at a glance.
          </p>

          <div className={styles.cardList}>
            {flagsList.map((flag, idx) => (
              <div key={flag.key + idx} className={styles.itemCard}>
                {/* Drag handle (visual) */}
                <span className={styles.dragHandle}>
                  <GripVertical size={14} />
                </span>

                {/* Preview circle */}
                <span className={styles.flagPreview} style={{ background: '#1E335E' }}>
                  {renderIcon(flag.icon, 8, '#fff')}
                </span>

                {/* Label */}
                <input
                  type="text"
                  className={styles.labelInput}
                  value={flag.label}
                  onChange={(e) => updateFlag(idx, { label: e.target.value })}
                />

                {/* Icon selector */}
                <select
                  className={styles.iconSelect}
                  value={flag.icon}
                  onChange={(e) => updateFlag(idx, { icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.startsWith('text:') ? `Letter ${opt.slice(5)}` : opt}
                    </option>
                  ))}
                </select>

                {/* Color */}
                <input
                  type="color"
                  className={styles.colorInput}
                  value={flag.color}
                  onChange={(e) => updateFlag(idx, { color: e.target.value })}
                />

                {/* Toggle */}
                <span className={styles.toggleWrap}>
                  <input
                    type="checkbox"
                    className={styles.toggle}
                    checked={flag.enabled}
                    onChange={(e) => updateFlag(idx, { enabled: e.target.checked })}
                  />
                </span>

                {/* Reorder */}
                <span className={styles.reorderBtns}>
                  <button
                    className={styles.reorderBtn}
                    disabled={idx === 0}
                    onClick={() => moveFlag(idx, -1)}
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    className={styles.reorderBtn}
                    disabled={idx === flagsList.length - 1}
                    onClick={() => moveFlag(idx, 1)}
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                </span>

                {/* Delete */}
                {deletingFlagIdx === idx ? (
                  <span className={styles.confirmRow}>
                    <span className={styles.confirmText}>Delete?</span>
                    <button className={styles.confirmYes} onClick={() => deleteFlag(idx)}>
                      Yes
                    </button>
                    <button className={styles.confirmNo} onClick={() => setDeletingFlagIdx(null)}>
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeletingFlagIdx(idx)}
                    title="Delete flag"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className={styles.addBtn} onClick={addFlag}>
            <Plus size={14} /> Add Flag
          </button>

          <div className={styles.saveRow}>
            <button
              className={styles.saveBtn}
              onClick={handleSaveFlags}
              disabled={savingFlags}
            >
              {savingFlags ? 'Saving...' : 'Save Flags'}
            </button>
            {flagsSaved && <span className={styles.savedMsg}>Saved</span>}
          </div>
        </div>

        <hr className={styles.groupDivider} />

        {/* ══════ Section 2: CHECKLIST ITEMS ══════ */}
        <div className={styles.section}>
          <h3 className={styles.groupHeading}>Checklist Items</h3>
          <p className={styles.sectionDescription}>
            Checklist items appear during student check-in. Staff can mark each item as the student
            completes it.
          </p>

          <div className={styles.cardList}>
            {checklistList.map((item, idx) => (
              <div key={item.key + idx} className={styles.itemCard}>
                {/* Drag handle (visual) */}
                <span className={styles.dragHandle}>
                  <GripVertical size={14} />
                </span>

                {/* Label */}
                <input
                  type="text"
                  className={styles.labelInput}
                  value={item.label}
                  onChange={(e) => updateCheckItem(idx, { label: e.target.value })}
                />

                {/* Toggle */}
                <span className={styles.toggleWrap}>
                  <input
                    type="checkbox"
                    className={styles.toggle}
                    checked={item.enabled}
                    onChange={(e) => updateCheckItem(idx, { enabled: e.target.checked })}
                  />
                </span>

                {/* Reorder */}
                <span className={styles.reorderBtns}>
                  <button
                    className={styles.reorderBtn}
                    disabled={idx === 0}
                    onClick={() => moveCheckItem(idx, -1)}
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    className={styles.reorderBtn}
                    disabled={idx === checklistList.length - 1}
                    onClick={() => moveCheckItem(idx, 1)}
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                </span>

                {/* Delete */}
                {deletingCheckIdx === idx ? (
                  <span className={styles.confirmRow}>
                    <span className={styles.confirmText}>Delete?</span>
                    <button className={styles.confirmYes} onClick={() => deleteCheckItem(idx)}>
                      Yes
                    </button>
                    <button
                      className={styles.confirmNo}
                      onClick={() => setDeletingCheckIdx(null)}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeletingCheckIdx(idx)}
                    title="Delete item"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className={styles.addBtn} onClick={addCheckItem}>
            <Plus size={14} /> Add Item
          </button>

          <p className={styles.noteText}>
            A custom free-text task field is always available during check-in.
          </p>

          <div className={styles.saveRow}>
            <button
              className={styles.saveBtn}
              onClick={handleSaveChecklist}
              disabled={savingChecklist}
            >
              {savingChecklist ? 'Saving...' : 'Save Checklist'}
            </button>
            {checklistSaved && <span className={styles.savedMsg}>Saved</span>}
          </div>
        </div>

        <hr className={styles.groupDivider} />

        {/* ══════ Section 3: CLASSROOM LAYOUT ══════ */}
        <div className={styles.section}>
          <h3 className={styles.groupHeading}>Classroom Layout</h3>
          <p className={styles.sectionDescription}>
            Define seat positions and desk arrangements for the Live Class view.
          </p>
          <button className={styles.placeholderBtn} disabled>
            <SettingsIcon size={14} /> Open Classroom Setup
          </button>
          <p className={styles.placeholderNote}>
            Classroom layout is configured from the Live Class view.
          </p>
        </div>

        <hr className={styles.groupDivider} />

        {/* ══════ Section 4: CENTER INFO ══════ */}
        <div className={styles.section}>
          <h3 className={styles.groupHeading}>Center Info</h3>

          {settings?.center_name || settings?.center_address || settings?.center_phone ? (
            <div className={styles.infoGrid}>
              {settings.center_name && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Center Name</span>
                  <span className={styles.infoValue}>{settings.center_name}</span>
                </div>
              )}
              {settings.center_address && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Address</span>
                  <span className={styles.infoValue}>{settings.center_address}</span>
                </div>
              )}
              {settings.center_phone && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <span className={styles.infoValue}>{settings.center_phone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.muted}>Center info not configured yet.</p>
          )}
        </div>

        <hr className={styles.groupDivider} />

        {/* ══════ Section 5: NOTIFICATION SETTINGS ══════ */}
        <div className={styles.section}>
          <h3 className={styles.groupHeading}>Notification Settings</h3>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>SMS Pickup Alert</span>
              <span className={styles.infoValue}>
                {settings?.sms_pickup_alert_minutes != null
                  ? `${settings.sms_pickup_alert_minutes} minutes before pickup`
                  : 'Not set'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>No-Show Threshold</span>
              <span className={styles.infoValue}>
                {settings?.no_show_threshold_minutes != null
                  ? `${settings.no_show_threshold_minutes} minutes`
                  : 'Not set'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Default Session Duration</span>
              <span className={styles.infoValue}>
                {settings?.default_session_minutes != null
                  ? `${settings.default_session_minutes} minutes`
                  : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
