'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useStudents } from '@/hooks/useStudents';
import type { Student } from '@/lib/types';
import styles from './ProgressPage.module.css';

/* ═══════════════════════════════════════════
   ASHR COLORS & LABELS
   ═══════════════════════════════════════════ */
const ASHR_COLORS: Record<number, string> = {
  3: '#d97706', // Gold
  2: '#64748b', // Silver
  1: '#b8860b', // Bronze
  0: '#ea580c', // At Grade
  9: '#dc2626', // Below
};

const ASHR_LABELS: Record<number, string> = {
  3: 'Gold (3)',
  2: 'Silver (2)',
  1: 'Bronze (1)',
  0: 'At Grade (0)',
  9: 'Below (9)',
};

const ASHR_SHORT: Record<number, string> = {
  3: 'Gold',
  2: 'Silver',
  1: 'Bronze',
  0: 'At Grade',
  9: 'Below',
};

/* ═══════════════════════════════════════════
   PROGRESS STUDENT TYPE & MAPPING
   ═══════════════════════════════════════════ */
interface ProgressStudent {
  name: string;
  band: string;
  math_ashr: number | null;
  math_grade: string | null;
  math_los: number | null;
  read_ashr: number | null;
  read_grade: string | null;
  read_los: number | null;
}

const ASHR_STATUS_TO_NUM: Record<string, number> = {
  'Platinum': 3,
  'Gold': 3,
  'Silver': 2,
  'Bronze': 1,
  'Not Yet ASHR': 0,
};

function gradeToBand(grade: string | null): string {
  if (!grade) return 'K-2';
  const g = grade.toLowerCase().trim();
  if (['k', 'pk', 'prek', 'pre-k', '1', '2', '1st', '2nd', 'kindergarten'].some((v) => g.includes(v))) return 'K-2';
  if (['3', '4', '5', '3rd', '4th', '5th'].some((v) => g.includes(v))) return '3-5';
  if (['6', '7', '8', '6th', '7th', '8th'].some((v) => g.includes(v))) return '6-8';
  if (['9', '10', '11', '12', '9th', '10th', '11th', '12th'].some((v) => g.includes(v))) return '9-12';
  return 'K-2';
}

function monthsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function mapStudent(s: Student): ProgressStudent {
  const hasMath = s.subjects?.toLowerCase().includes('math');
  const hasRead = s.subjects?.toLowerCase().includes('reading');
  const los = monthsSince(s.enroll_date);
  return {
    name: `${s.first_name} ${s.last_name}`,
    band: gradeToBand(s.grade_level),
    math_ashr: hasMath && s.ashr_math_status ? (ASHR_STATUS_TO_NUM[s.ashr_math_status] ?? 0) : hasMath ? 0 : null,
    math_grade: hasMath ? s.current_level_math : null,
    math_los: hasMath ? los : null,
    read_ashr: hasRead && s.ashr_reading_status ? (ASHR_STATUS_TO_NUM[s.ashr_reading_status] ?? 0) : hasRead ? 0 : null,
    read_grade: hasRead ? s.current_level_reading : null,
    read_los: hasRead ? los : null,
  };
}


/* ═══════════════════════════════════════════
   TOOLTIP / POPOVER
   ═══════════════════════════════════════════ */
interface PopoverState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

function Popover({ state }: { state: PopoverState }) {
  if (!state.visible) return null;
  return (
    <div
      className={styles.popover}
      style={{ left: state.x, top: state.y }}
    >
      {state.content}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOS BUCKETS
   ═══════════════════════════════════════════ */
const LOS_BUCKETS = [
  { label: '0–6 mo', min: 0, max: 6 },
  { label: '7–12 mo', min: 7, max: 12 },
  { label: '13–18 mo', min: 13, max: 18 },
  { label: '19–24 mo', min: 19, max: 24 },
  { label: '25–36 mo', min: 25, max: 36 },
  { label: '37+ mo', min: 37, max: Infinity },
];

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export default function ProgressPage() {
  const { data: rawStudents } = useStudents();
  const students = useMemo(() => rawStudents?.map(mapStudent) ?? [], [rawStudents]);

  const [popover, setPopover] = useState<PopoverState>({ visible: false, x: 0, y: 0, content: null });

  const showPopover = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content,
    });
  }, []);

  const hidePopover = useCallback(() => {
    setPopover((p) => ({ ...p, visible: false }));
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const total = students.length;
    const mathEnrolled = students.filter((s) => s.math_ashr !== null);
    const readEnrolled = students.filter((s) => s.read_ashr !== null);
    const dual = students.filter((s) => s.math_ashr !== null && s.read_ashr !== null);
    const atRisk = students.filter(
      (s) => (s.math_ashr === 9 && (s.math_los ?? 0) >= 24) || (s.read_ashr === 9 && (s.read_los ?? 0) >= 24)
    );
    const stars = students.filter((s) => s.math_ashr === 3 || s.read_ashr === 3);
    return { total, mathEnrolled, readEnrolled, dual, atRisk, stars };
  }, [students]);

  // ASHR distribution for donuts
  const mathDonut = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((t) => {
      const students = stats.mathEnrolled.filter((s) => s.math_ashr === t);
      return { tier: t, label: ASHR_LABELS[t], count: students.length, students };
    }).filter((d) => d.count > 0);
  }, [stats]);

  const readDonut = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((t) => {
      const students = stats.readEnrolled.filter((s) => s.read_ashr === t);
      return { tier: t, label: ASHR_LABELS[t], count: students.length, students };
    }).filter((d) => d.count > 0);
  }, [stats]);

  // Tenure vs Performance bar data
  const tenureData = useMemo(() => {
    return LOS_BUCKETS.map((bucket) => {
      const inBucket = students.filter((s) => {
        const los = Math.max(s.math_los ?? 0, s.read_los ?? 0);
        return los >= bucket.min && los <= bucket.max;
      });
      const total = inBucket.length;
      if (total === 0) return { label: bucket.label, above: 0, below: 0, total: 0, aboveStudents: [] as ProgressStudent[], belowStudents: [] as ProgressStudent[] };
      const above = inBucket.filter((s) => {
        const hasAboveMath = s.math_ashr !== null && s.math_ashr >= 1 && s.math_ashr <= 3;
        const hasAboveRead = s.read_ashr !== null && s.read_ashr >= 1 && s.read_ashr <= 3;
        return hasAboveMath || hasAboveRead;
      });
      const below = inBucket.filter((s) => s.math_ashr === 9 || s.read_ashr === 9);
      return {
        label: bucket.label,
        above: Math.round((above.length / total) * 100),
        below: Math.round((below.length / total) * 100),
        total,
        aboveStudents: above,
        belowStudents: below,
      };
    });
  }, [students]);

  // Cross-subject matrix (dual-enrolled only)
  const matrix = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((mathTier) => ({
      mathTier,
      cells: tiers.map((readTier) => {
        const students = stats.dual.filter(
          (s) => s.math_ashr === mathTier && s.read_ashr === readTier
        );
        return { readTier, count: students.length, students };
      }),
    }));
  }, [stats]);

  const maxMatrixCount = useMemo(() => {
    return Math.max(1, ...matrix.flatMap((r) => r.cells.map((c) => c.count)));
  }, [matrix]);

  // At-risk list
  const atRiskList = useMemo(() => {
    return stats.atRisk
      .map((s) => {
        const mathMonths = s.math_ashr === 9 ? (s.math_los ?? 0) : 0;
        const readMonths = s.read_ashr === 9 ? (s.read_los ?? 0) : 0;
        return { ...s, riskScore: mathMonths + readMonths, mathMonths, readMonths };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [stats]);

  // Stars list
  const starsList = useMemo(() => {
    return stats.stars.sort((a, b) => {
      const aLos = Math.max(a.math_los ?? 0, a.read_los ?? 0);
      const bLos = Math.max(b.math_los ?? 0, b.read_los ?? 0);
      return bLos - aLos;
    });
  }, [stats]);

  if (!rawStudents) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <SectionHeader script="Track the" title="Progress Dashboard" subtitle="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Popover state={popover} />

      <div className={styles.header}>
        <SectionHeader
          script="Track the"
          title="Progress Dashboard"
          subtitle={`Kumon Progress Map — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
        />
      </div>

      <div className={styles.content}>
        {/* Stat Bar */}
        <div className={styles.statBar}>
          {[
            { label: 'Total Students', value: stats.total },
            { label: 'Math Enrolled', value: stats.mathEnrolled.length },
            { label: 'Reading Enrolled', value: stats.readEnrolled.length },
            { label: 'At-Risk', value: stats.atRisk.length },
            { label: 'Stars / Gold', value: stats.stars.length },
            { label: 'Dual Enrolled', value: stats.dual.length },
          ].map((s) => (
            <Card key={s.label} className={styles.statCard}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Donut Charts */}
        <div className={styles.chartRow}>
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Math ASHR Distribution</h3>
            <p className={styles.cardSub}>{stats.mathEnrolled.length} students enrolled</p>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={mathDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="label"
                    onMouseEnter={(_, idx, e) => {
                      const d = mathDonut[idx];
                      showPopover(e as unknown as React.MouseEvent, (
                        <div>
                          <div className={styles.popTitle}>{d.label}</div>
                          <div className={styles.popStat}>{d.count} students ({Math.round((d.count / stats.mathEnrolled.length) * 100)}%)</div>
                          <div className={styles.popNames}>{d.students.slice(0, 3).map((s) => s.name).join(', ')}{d.students.length > 3 ? '...' : ''}</div>
                        </div>
                      ));
                    }}
                    onMouseLeave={hidePopover}
                  >
                    {mathDonut.map((d) => (
                      <Cell key={d.tier} fill={ASHR_COLORS[d.tier]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className={styles.legendText}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Reading ASHR Distribution</h3>
            <p className={styles.cardSub}>{stats.readEnrolled.length} students enrolled</p>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={readDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="label"
                    onMouseEnter={(_, idx, e) => {
                      const d = readDonut[idx];
                      showPopover(e as unknown as React.MouseEvent, (
                        <div>
                          <div className={styles.popTitle}>{d.label}</div>
                          <div className={styles.popStat}>{d.count} students ({Math.round((d.count / stats.readEnrolled.length) * 100)}%)</div>
                          <div className={styles.popNames}>{d.students.slice(0, 3).map((s) => s.name).join(', ')}{d.students.length > 3 ? '...' : ''}</div>
                        </div>
                      ));
                    }}
                    onMouseLeave={hidePopover}
                  >
                    {readDonut.map((d) => (
                      <Cell key={d.tier} fill={ASHR_COLORS[d.tier]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className={styles.legendText}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tenure vs Performance */}
        <Card className={styles.fullCard}>
          <h3 className={styles.cardTitle}>Tenure vs Performance</h3>
          <p className={styles.cardSub}>Percentage above/below grade level by length of study</p>
          <div className={styles.barWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenureData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'Montserrat' }} />
                <YAxis tick={{ fontSize: 12, fontFamily: 'Montserrat' }} unit="%" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className={styles.chartTooltip}>
                        <div className={styles.popTitle}>{d.label}</div>
                        <div className={styles.popStat}>{d.total} students</div>
                        <div style={{ color: '#009AAB' }}>{d.above}% above grade ({d.aboveStudents?.length ?? 0})</div>
                        <div style={{ color: '#dc2626' }}>{d.below}% below grade ({d.belowStudents?.length ?? 0})</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="above" name="Above Grade" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="below" name="Below Grade" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Legend formatter={(value: string) => <span className={styles.legendText}>{value}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Cross-Subject Matrix */}
        <Card className={styles.fullCard}>
          <h3 className={styles.cardTitle}>Cross-Subject Matrix</h3>
          <p className={styles.cardSub}>{stats.dual.length} dual-enrolled students — Math ASHR (rows) × Reading ASHR (columns)</p>
          <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th className={styles.matrixCorner}>Math ↓ / Read →</th>
                  {[3, 2, 1, 0, 9].map((t) => (
                    <th key={t} className={styles.matrixHeader}>{ASHR_SHORT[t]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.mathTier}>
                    <td className={styles.matrixRowLabel}>{ASHR_SHORT[row.mathTier]}</td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.readTier}
                        className={styles.matrixCell}
                        style={{
                          backgroundColor: cell.count > 0
                            ? `rgba(53, 92, 170, ${0.1 + (cell.count / maxMatrixCount) * 0.7})`
                            : 'var(--base)',
                          color: cell.count / maxMatrixCount > 0.5 ? 'var(--white)' : 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          if (cell.count === 0) return;
                          showPopover(e, (
                            <div>
                              <div className={styles.popTitle}>
                                {cell.count} student{cell.count !== 1 ? 's' : ''}
                              </div>
                              <div className={styles.popStat}>
                                {ASHR_SHORT[row.mathTier]} in Math, {ASHR_SHORT[cell.readTier]} in Reading
                              </div>
                              <div className={styles.popNames}>
                                {cell.students.slice(0, 5).map((s) => s.name).join(', ')}
                                {cell.students.length > 5 ? '...' : ''}
                              </div>
                            </div>
                          ));
                        }}
                        onMouseLeave={hidePopover}
                      >
                        {cell.count || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* At-Risk & Stars side by side */}
        <div className={styles.chartRow}>
          {/* At-Risk List */}
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>At-Risk Students</h3>
            <p className={styles.cardSub}>Below grade level 24+ months, sorted by risk score</p>
            <div className={styles.listScroll}>
              {atRiskList.map((s, i) => (
                <div
                  key={i}
                  className={styles.listRow}
                  onMouseEnter={(e) => {
                    const parts: string[] = [];
                    if (s.math_ashr === 9) parts.push(`Below grade in Math for ${s.mathMonths}mo (level ${s.math_grade})`);
                    if (s.read_ashr === 9) parts.push(`Below grade in Reading for ${s.readMonths}mo (level ${s.read_grade})`);
                    const longest = Math.max(s.mathMonths, s.readMonths);
                    showPopover(e, (
                      <div>
                        <div className={styles.popTitle}>{s.name}</div>
                        {parts.map((p, j) => <div key={j} className={styles.popStat}>{p}</div>)}
                        <div className={styles.popNote}>Longest-tenured at-risk: {longest} months</div>
                      </div>
                    ));
                  }}
                  onMouseLeave={hidePopover}
                >
                  <div className={styles.listInfo}>
                    <span className={styles.listName}>{s.name}</span>
                    <span className={styles.listBand}>{s.band}</span>
                    <div className={styles.listBadges}>
                      {s.math_ashr === 9 && <Badge variant="math">Math</Badge>}
                      {s.read_ashr === 9 && <Badge variant="reading">Read</Badge>}
                    </div>
                  </div>
                  <div className={styles.riskBarWrap}>
                    <div
                      className={styles.riskBar}
                      style={{ width: `${Math.min(100, (s.riskScore / (atRiskList[0]?.riskScore || 1)) * 100)}%` }}
                    />
                    <span className={styles.riskScore}>{s.riskScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stars List */}
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Stars / Gold Students</h3>
            <p className={styles.cardSub}>ASHR = 3 in at least one subject</p>
            <div className={styles.listScroll}>
              {starsList.map((s, i) => (
                <div
                  key={i}
                  className={styles.listRow}
                  onMouseEnter={(e) => {
                    showPopover(e, (
                      <div>
                        <div className={styles.popTitle}>{s.name}</div>
                        {s.math_grade && <div className={styles.popStat}>Math: Level {s.math_grade} ({ASHR_SHORT[s.math_ashr!]})</div>}
                        {s.read_grade && <div className={styles.popStat}>Reading: Level {s.read_grade} ({ASHR_SHORT[s.read_ashr!]})</div>}
                        <div className={styles.popNote}>Enrolled {Math.max(s.math_los ?? 0, s.read_los ?? 0)} months</div>
                      </div>
                    ));
                  }}
                  onMouseLeave={hidePopover}
                >
                  <div className={styles.listInfo}>
                    <span className={styles.listName}>{s.name}</span>
                    <div className={styles.listBadges}>
                      {s.math_ashr !== null && (
                        <span
                          className={styles.ashrBadge}
                          style={{ background: ASHR_COLORS[s.math_ashr], color: '#fff' }}
                        >
                          M: {ASHR_SHORT[s.math_ashr]}
                        </span>
                      )}
                      {s.read_ashr !== null && (
                        <span
                          className={styles.ashrBadge}
                          style={{ background: ASHR_COLORS[s.read_ashr], color: '#fff' }}
                        >
                          R: {ASHR_SHORT[s.read_ashr]}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.listTenure}>{Math.max(s.math_los ?? 0, s.read_los ?? 0)}mo</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
