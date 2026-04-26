'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronUp, ChevronDown, Check, Minus, Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import SMSConsentBadge from '@/components/ui/SMSConsentBadge';
import { api } from '@/lib/api';
import type { Contact, SmsConsentStatus } from '@/lib/types';
import styles from './ContactsPage.module.css';

type SortKey = 'name' | 'email' | 'phone' | 'relationship' | 'students' | 'portal' | 'sms_status';
type SortDir = 'asc' | 'desc';
type SmsFilter = 'All' | SmsConsentStatus;

const SMS_SORT_WEIGHT: Record<SmsConsentStatus, number> = {
  opted_out: 0,
  no_reply: 1,
  sms_on: 2,
};

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [smsFilter, setSmsFilter] = useState<SmsFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: contacts, isLoading, error } = useSWR<Contact[]>(
    'contacts',
    async () => {
      return api.contacts.list();
    },
    { dedupingInterval: 10000 }
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

    if (smsFilter !== 'All') {
      list = list.filter((c) => (c.sms_consent_status ?? 'no_reply') === smsFilter);
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
        case 'sms_status': {
          const wa = SMS_SORT_WEIGHT[(a.sms_consent_status ?? 'no_reply') as SmsConsentStatus];
          const wb = SMS_SORT_WEIGHT[(b.sms_consent_status ?? 'no_reply') as SmsConsentStatus];
          return dir * (wa - wb);
        }
        default:
          return 0;
      }
    });

    return list;
  }, [contacts, search, smsFilter, sortKey, sortDir]);

  const smsFilterCount = useMemo(() => {
    if (smsFilter === 'All') return null;
    return (contacts ?? []).filter((c) => (c.sms_consent_status ?? 'no_reply') === smsFilter).length;
  }, [contacts, smsFilter]);

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
          {/* SMS status filter (PDF section 10). Same shape as the
              students roster filter — count pill shows current matches. */}
          <span className={styles.smsFilterWrap}>
            <span className={styles.smsFilterLabel}>SMS status:</span>
            <select
              className={`${styles.filter} ${smsFilter !== 'All' ? styles.filterActive : ''}`}
              value={smsFilter}
              onChange={(e) => setSmsFilter(e.target.value as SmsFilter)}
            >
              <option value="All">All</option>
              <option value="sms_on">SMS on</option>
              <option value="opted_out">Opted out</option>
              <option value="no_reply">No reply</option>
            </select>
            {smsFilterCount !== null && (
              <span className={styles.smsFilterCount}>{smsFilterCount}</span>
            )}
          </span>
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
                  <ThSort col="sms_status" label="SMS status" />
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
                    <td className={styles.cell}>
                      <SMSConsentBadge
                        status={(c.sms_consent_status as SmsConsentStatus | undefined) ?? 'no_reply'}
                        size="medium"
                      />
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
