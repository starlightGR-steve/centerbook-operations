'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, CalendarCheck, Star,
  CheckCircle2, Clock, AlertTriangle, Pause, XCircle, Plus,
} from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import NewFamilyLeadModal from '@/components/pipeline/NewFamilyLeadModal';
import FamilyDetailModal from '@/components/pipeline/FamilyDetailModal';
import { usePipelineSummary, useFamilies, updateFamilyStatus } from '@/hooks/usePipeline';
import { useAllStudents } from '@/hooks/useStudents';
import type { Family, FamilyPipelineStatus, Student } from '@/lib/types';
import styles from './PipelinePage.module.css';

/* ── Pipeline column config ──────────────────────────────── */

const PIPELINE_COLUMNS: { status: FamilyPipelineStatus; label: string; color: string }[] = [
  { status: 'prospect',             label: 'Prospect',   color: '#6b7280' },
  { status: 'assessment_scheduled', label: 'Assessment',  color: '#d97706' },
  { status: 'lead',                 label: 'Lead',        color: '#3b82f6' },
  { status: 'trial',                label: 'Trial',       color: '#009AAB' },
  { status: 'enrolled',             label: 'Enrolled',    color: '#22c55e' },
];

/* ── Student status card config ──────────────────────────── */

const STATUS_CARDS = [
  { key: 'Active',    label: 'Active',    color: '#22c55e', icon: CheckCircle2 },
  { key: 'Trial',     label: 'Trial',     color: '#3b82f6', icon: Clock },
  { key: 'On Hold',   label: 'On Hold',   color: '#d97706', icon: Pause },
  { key: 'Withdrawn', label: 'Withdrawn', color: '#ef4444', icon: XCircle },
] as const;

/* ── Helpers ─────────────────────────────────────────────── */

function formatMonth(key: string): string {
  // key format: "2025-10" → "Oct 2025"
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Component ───────────────────────────────────────────── */

export default function PipelinePage() {
  const { data: summary }  = usePipelineSummary();
  const { data: families, mutate: mutateFamilies }  = useFamilies();
  const { data: students }  = useAllStudents();

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [detailFamily, setDetailFamily] = useState<Family | null>(null);
  const [draggedFamily, setDraggedFamily] = useState<Family | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDrop = useCallback(async (targetStatus: FamilyPipelineStatus) => {
    if (!draggedFamily || draggedFamily.pipeline_status === targetStatus) {
      setDraggedFamily(null);
      setDragOverCol(null);
      return;
    }
    const prev = draggedFamily.pipeline_status;
    // Optimistic: update in local groups immediately
    draggedFamily.pipeline_status = targetStatus;
    mutateFamilies();
    setDraggedFamily(null);
    setDragOverCol(null);
    try {
      await updateFamilyStatus(draggedFamily.id, { pipeline_status: targetStatus });
    } catch {
      // Revert on error
      draggedFamily.pipeline_status = prev;
      mutateFamilies();
    }
  }, [draggedFamily, mutateFamilies]);

  /* Group families by pipeline_status */
  const familyGroups = useMemo(() => {
    const groups: Record<FamilyPipelineStatus, Family[]> = {
      prospect: [],
      assessment_scheduled: [],
      lead: [],
      trial: [],
      enrolled: [],
    };
    families?.forEach((f) => {
      if (groups[f.pipeline_status]) {
        groups[f.pipeline_status].push(f);
      }
    });
    return groups;
  }, [families]);

  /* Monthly summary sorted descending, last 6 months */
  const monthlyRows = useMemo(() => {
    if (!summary?.monthly_summary) return [];
    return Object.entries(summary.monthly_summary)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6);
  }, [summary]);

  /* Filtered students for the selected status card */
  const filteredStudents = useMemo(() => {
    if (!selectedStatus || !students) return [];
    return students.filter((s) => s.enrollment_status === selectedStatus);
  }, [selectedStatus, students]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionHeader
            script="Onboarding"
            title="Pipeline"
            subtitle="Family leads and student enrollment overview"
          />
          <button className={styles.newLeadBtn} onClick={() => setShowNewLead(true)}>
            <Plus size={14} /> New Lead
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Section A: Family Lead Pipeline (Kanban) ──────── */}
        <h3 className={styles.sectionTitle}>Family Lead Pipeline</h3>

        <div className={styles.kanban}>
          {PIPELINE_COLUMNS.map((col) => {
            const items = familyGroups[col.status] || [];
            return (
              <div
                className={`${styles.kanbanCol} ${dragOverCol === col.status ? styles.kanbanColDragOver : ''}`}
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.status); }}
              >
                <div className={styles.kanbanHeader}>
                  <span className={styles.kanbanLabel}>{col.label}</span>
                  <span
                    className={styles.kanbanCount}
                    style={{ backgroundColor: col.color }}
                  >
                    {items.length}
                  </span>
                </div>

                <div className={styles.kanbanCards}>
                  {items.length === 0 && (
                    <p className={styles.emptyCol}>No families</p>
                  )}
                  {items.map((fam) => (
                    <div
                      className={`${styles.familyCard} ${draggedFamily?.id === fam.id ? styles.familyCardDragging : ''}`}
                      key={fam.id}
                      style={{ borderLeftColor: col.color }}
                      draggable
                      onDragStart={() => setDraggedFamily(fam)}
                      onDragEnd={() => { setDraggedFamily(null); setDragOverCol(null); }}
                      onClick={() => setDetailFamily(fam)}
                    >
                      <span className={styles.familyName}>{fam.family_name}</span>
                      <span className={styles.contactName}>{fam.primary_contact_name}</span>
                      <div className={styles.familyMeta}>
                        {fam.lead_source && (
                          <span className={styles.leadBadge}>{fam.lead_source}</span>
                        )}
                        {fam.assessment_outcome && (
                          <span className={`${styles.assessmentBadge} ${styles[`assessment${fam.assessment_outcome.replace('-', '')}`]}`}>
                            {fam.assessment_outcome}
                          </span>
                        )}
                        {fam.inquiry_date && (
                          <span className={styles.inquiryDate}>
                            {formatDate(fam.inquiry_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Section B: Student Status Overview ───────────── */}
        <h3 className={styles.sectionTitle}>Student Status Overview</h3>

        {/* Status stat cards */}
        <div className={styles.statsRow}>
          {STATUS_CARDS.map((card) => {
            const Icon = card.icon;
            const count = summary?.student_statuses?.[card.key] ?? 0;
            const isActive = selectedStatus === card.key;
            return (
              <button
                key={card.key}
                className={`${styles.statCard} ${isActive ? styles.statCardActive : ''}`}
                style={{ '--stat-color': card.color } as React.CSSProperties}
                onClick={() => setSelectedStatus(isActive ? null : card.key)}
                type="button"
              >
                <Icon size={22} color={card.color} />
                <span className={styles.statCount}>{count}</span>
                <span className={styles.statLabel}>{card.label}</span>
              </button>
            );
          })}
        </div>

        {/* Monthly gain/loss table */}
        {monthlyRows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gained</th>
                  <th>Lost</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map(([month, data]) => (
                  <tr key={month}>
                    <td>{formatMonth(month)}</td>
                    <td className={styles.gained}>+{data.gained}</td>
                    <td className={styles.lost}>-{data.lost}</td>
                    <td className={data.net >= 0 ? styles.gained : styles.lost}>
                      {data.net >= 0 ? '+' : ''}{data.net}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Student list (filtered by selected status) */}
        {selectedStatus && (
          <div className={styles.studentList}>
            <div className={styles.studentListHeader}>
              <h4>{selectedStatus} Students ({filteredStudents.length})</h4>
              <button
                className={styles.clearBtn}
                onClick={() => setSelectedStatus(null)}
                type="button"
              >
                Clear filter
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <p className={styles.emptyCol}>No students with this status.</p>
            ) : (
              <div className={styles.studentRows}>
                {filteredStudents.map((s) => (
                  <div className={styles.studentRow} key={s.id}>
                    <span className={styles.studentName}>
                      {s.first_name} {s.last_name}
                    </span>
                    <span className={styles.studentSubjects}>
                      {s.subjects || '--'}
                    </span>
                    <span className={styles.studentDate}>
                      {formatDate(s.enroll_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showNewLead && (
        <NewFamilyLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={() => mutateFamilies()}
        />
      )}

      {detailFamily && (
        <FamilyDetailModal
          family={detailFamily}
          onClose={() => setDetailFamily(null)}
          onSaved={() => mutateFamilies()}
        />
      )}
    </div>
  );
}
