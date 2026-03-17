'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronUp, ChevronDown, Check, Minus, Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import { api } from '@/lib/api';
import { useDemoMode } from '@/context/MockDataContext';
import type { Contact } from '@/lib/types';
import styles from './ContactsPage.module.css';

type SortKey = 'name' | 'email' | 'phone' | 'relationship' | 'students' | 'portal';
type SortDir = 'asc' | 'desc';

export default function ContactsPage() {
  const router = useRouter();
  const { isDemoMode } = useDemoMode();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: contacts, isLoading, error } = useSWR<Contact[]>(
    isDemoMode ? 'demo-contacts' : 'contacts',
    async () => {
      if (isDemoMode) return [];
      return api.contacts.list();
    },
    { dedupingInterval: isDemoMode ? 60000 : 10000, revalidateOnFocus: !isDemoMode }
  );

  const filtered = useMemo(() => {
    if (!contacts) return [];
    let list = contacts;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          `${c.last_name} ${c.first_name}`.toLowerCase().includes(q) ||
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }

    list = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name':
          return dir * `${a.last_name}, ${a.first_name}`.localeCompare(`${b.last_name}, ${b.first_name}`);
        case 'email':
          return dir * (a.email ?? '').localeCompare(b.email ?? '');
        case 'phone':
          return dir * (a.phone ?? '').localeCompare(b.phone ?? '');
        case 'relationship':
          return dir * (a.relationship_to_students ?? '').localeCompare(b.relationship_to_students ?? '');
        case 'students':
          return dir * ((a.linked_students_count ?? 0) - (b.linked_students_count ?? 0));
        case 'portal':
          return dir * (Number(a.portal_access_enabled) - Number(b.portal_access_enabled));
        default:
          return 0;
      }
    });

    return list;
  }, [contacts, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  function ThSort({ col, label }: { col: SortKey; label: string }) {
    return (
      <th className={styles.th} onClick={() => toggleSort(col)}>
        <span className={styles.thContent}>
          {label}
          {sortKey === col && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );
  }

  const total = contacts?.length ?? 0;
  const showing = filtered.length;
  const countLabel = isLoading
    ? 'Loading...'
    : showing === total
      ? `${total} contacts`
      : `${showing} of ${total}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Manage Your"
            title="Contacts"
            subtitle={countLabel}
          />
          <button
            className={styles.newBtn}
            onClick={() => router.push('/contacts/new')}
          >
            <Plus size={14} /> New Contact
          </button>
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading contacts...</div>
        ) : error ? (
          <div className={styles.loading}>Failed to load contacts.</div>
        ) : filtered.length === 0 ? (
          <div className={styles.loading}>
            {search ? 'No contacts match your search.' : 'No contacts found.'}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <ThSort col="name" label="Name" />
                  <ThSort col="email" label="Email" />
                  <ThSort col="phone" label="Phone" />
                  <ThSort col="relationship" label="Relationship" />
                  <ThSort col="students" label="Students" />
                  <ThSort col="portal" label="Portal" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`${styles.row} ${i % 2 === 0 ? styles.rowEven : styles.rowOdd}`}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  >
                    <td className={`${styles.cell} ${styles.name}`}>
                      {c.last_name}, {c.first_name}
                    </td>
                    <td className={styles.cell}>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className={styles.link}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.cell}>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className={styles.link}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.cell}>
                      {c.relationship_to_students ?? <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.cell}>
                      {(c.linked_students_count ?? 0) > 0 ? (
                        <span className={styles.studentsBadge}>
                          {c.linked_students_count}
                        </span>
                      ) : (
                        <span className={styles.muted}>0</span>
                      )}
                    </td>
                    <td className={styles.cell}>
                      {Number(c.portal_access_enabled) === 1 ? (
                        <Check size={14} className={styles.portalYes} />
                      ) : (
                        <Minus size={14} className={styles.portalNo} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
