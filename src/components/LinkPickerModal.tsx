'use client';

import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import styles from './LinkPickerModal.module.css';

const ROLES = ['Primary Communication', 'Billing', 'Secondary', 'Emergency'];

interface PickerItem {
  id: number;
  label: string;
  sub: string;
  linked: boolean;
}

interface LinkPickerModalProps {
  title: string;
  items: PickerItem[];
  loading: boolean;
  onLink: (id: number, role: string) => Promise<void>;
  onClose: () => void;
}

export default function LinkPickerModal({
  title,
  items,
  loading,
  onLink,
  onClose,
}: LinkPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await onLink(selectedId, role);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>No results found.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                className={`${styles.item} ${selectedId === item.id ? styles.itemSelected : ''} ${item.linked ? styles.itemLinked : ''}`}
                onClick={() => !item.linked && setSelectedId(item.id)}
                disabled={item.linked}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  <span className={styles.itemSub}>{item.sub}</span>
                </div>
                {item.linked && <span className={styles.linkedBadge}>Linked</span>}
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <select
            className={styles.roleSelect}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">No specific role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            className={styles.linkBtn}
            onClick={handleSubmit}
            disabled={!selectedId || saving}
          >
            {saving ? 'Linking...' : 'Link'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  );
}
