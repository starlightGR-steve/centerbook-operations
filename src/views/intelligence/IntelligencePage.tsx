'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import SectionHeader from '@/components/ui/SectionHeader';
import { api } from '@/lib/api';
import styles from './IntelligencePage.module.css';

/* ── Brand constants (non-token colors) ───────────────────── */
const C = {
  gold:    '#d97706',
  silver:  '#64748b',
  bronze:  '#b8860b',
  red:     '#dc2626',
  green:   '#16a34a',
  amber:   '#d97706',
  dark:    '#1a2744',
  muted:   '#6b7280',
};

/* ── All data (January 2026 report) ───────────────────────── */
const MONTHS = [
  "Jan'25","Feb'25","Mar'25","Apr'25","May'25","Jun'25",
  "Jul'25","Aug'25","Sep'25","Oct'25","Nov'25","Dec'25","Jan'26",
];

const trendData = MONTHS.map((m, i) => ({
  month: m,
  mathASHR:   [50,47.47,46.36,46.26,47.53,46.98,44.7,48.75,42.98,45.75,45.12,46.69,45.53][i],
  readASHR:   [27.39,25.73,23.5,22.7,22.28,20,18.23,20.51,17.26,19.52,21.05,22.22,22.49][i],
  mathKIS:    [60,60.27,61.33,61.84,65.33,66.2,65.22,63.93,66.67,63.64,67.86,68.97,63.77][i],
  readKIS:    [32.26,32.26,33.87,32.79,32.31,31.25,32.26,26.92,24.49,24.53,22,21.15,18.64][i],
  mathAttr:   [4.07,4.04,4.06,3.76,3.98,4.0,4.39,4.03,3.86,3.75,3.79,3.54,3.38][i],
  readAttr:   [4.76,4.78,4.58,4.47,4.42,4.75,5.0,4.57,4.17,4.03,3.88,3.65,3.57][i],
  mathRet1yr: [67.57,68.42,69.57,71.43,65.83,63.25,64.35,64.36,59.18,56.19,55.56,54.87,57.03][i],
  readRet1yr: [61.54,60.38,59.26,60.19,57.89,58.56,58.33,55.1,55.56,55.1,52.58,53.92,57.41][i],
  mathRet2yr: [25.32,26.19,28.41,30.49,28.09,28.87,32.65,33.64,38.26,39.13,39.5,40.87,45.05][i],
  readRet2yr: [15,17.44,20.45,21.95,21.84,21.98,23.4,29.17,31.07,30.69,32.38,33.66,36.54][i],
  mathALS:    [24.57,24.78,24.61,26.63,25.13,25.03,22.8,24.79,25.9,26.66,26.38,28.21,29.58][i],
  readALS:    [21.01,20.91,21.82,22.37,22.64,21.05,19.99,21.86,23.97,24.81,25.8,27.37,28.01][i],
}));

const enrollmentHistory = [
  { year: "Jan '24", math: 179, reading: 145 },
  { year: "Jan '25", math: 198, reading: 157 },
  { year: "Jan '26", math: 246, reading: 209 },
];

const gradeBandData = [
  { grade:"PK1/2", mN:10, mBelow:4, mAt:2, mAbove:4, rN:14, rBelow:11, rAt:1, rAbove:2 },
  { grade:"K",     mN:10, mBelow:5, mAt:2, mAbove:3, rN:16, rBelow:13, rAt:1, rAbove:2 },
  { grade:"Gr 1",  mN:23, mBelow:12,mAt:2, mAbove:9, rN:30, rBelow:19, rAt:6, rAbove:5 },
  { grade:"Gr 2",  mN:28, mBelow:13,mAt:2, mAbove:13,rN:27, rBelow:15, rAt:2, rAbove:10},
  { grade:"Gr 3",  mN:35, mBelow:17,mAt:3, mAbove:15,rN:27, rBelow:19, rAt:3, rAbove:5 },
  { grade:"Gr 4",  mN:40, mBelow:13,mAt:4, mAbove:23,rN:30, rBelow:15, rAt:2, rAbove:13},
  { grade:"Gr 5",  mN:41, mBelow:23,mAt:3, mAbove:15,rN:28, rBelow:19, rAt:1, rAbove:8 },
  { grade:"Gr 6",  mN:26, mBelow:9, mAt:3, mAbove:14,rN:13, rBelow:11, rAt:1, rAbove:1 },
].map(d => ({
  ...d,
  mAbovePct: Math.round(100 * d.mAbove / d.mN),
  rAbovePct: d.rN ? Math.round(100 * d.rAbove / d.rN) : 0,
  mBelowPct: Math.round(100 * d.mBelow / d.mN),
  rBelowPct: d.rN ? Math.round(100 * d.rBelow / d.rN) : 0,
}));

const atRiskMath = [
  { name:"Roy Simpson",       grade:"Gr 6", los:89, level:"E" },
  { name:"Luke D Simpson",    grade:"Gr 4", los:66, level:"C" },
  { name:"Giovanni Zelfa",    grade:"Gr 3", los:56, level:"C" },
  { name:"Jacob E Singer",    grade:"Gr 6", los:48, level:"D" },
  { name:"Piper R Keefe",     grade:"Gr 6", los:44, level:"F" },
  { name:"Nari L Giovannetti",grade:"Gr 2", los:43, level:"B" },
  { name:"Sofia Toboy",       grade:"Gr 5", los:38, level:"E" },
  { name:"Raymond W Weiler",  grade:"Gr 3", los:33, level:"B" },
  { name:"Cayla Simpson",     grade:"Gr 6", los:32, level:"E" },
  { name:"Owen Laskowski",    grade:"Gr 6", los:32, level:"E" },
];

const mathASHRPie = [
  { name:"3 yrs Above", value:21, color:C.gold },
  { name:"2 yrs Above", value:32, color:C.silver },
  { name:"1 yr Above",  value:53, color:C.bronze },
  { name:"At Grade",    value:21, color:'var(--secondary)' },
  { name:"Below Grade", value:96, color:C.red },
];
const readASHRPie = [
  { name:"3 yrs Above", value:3,   color:C.gold },
  { name:"2 yrs Above", value:8,   color:C.silver },
  { name:"1 yr Above",  value:36,  color:C.bronze },
  { name:"At Grade",    value:17,  color:'var(--secondary)' },
  { name:"Below Grade", value:125, color:C.red },
];

const insights = [
  {
    id: "kis_read", type: "alert", icon: "📉",
    title: "Reading KIS Rate Declining",
    desc: "KIS attainment within 1 year dropped from 32.3% → 18.6% over 13 months — a 13-point slide.",
    action: "Review reading curriculum placement for incoming K–2 students. Consider diagnostic re-assessment for long-tenure students still below grade.",
    trend: "-13.6 pts", trendBad: true,
  },
  {
    id: "gr5_math", type: "alert", icon: "⚠️",
    title: "Grade 5 Math: 56% Below Grade",
    desc: "Gr 5 is the largest Math cohort (41 students) yet has the highest below-grade rate — worse than Gr 1.",
    action: "Identify Grade 5 students approaching 2-year mark still below. Schedule parent progress meetings proactively.",
    trend: "41 students", trendBad: true,
  },
  {
    id: "enroll_growth", type: "positive", icon: "📈",
    title: "Strong Enrollment Growth",
    desc: "Math grew +37% and Reading +44% over 2 years. January 2026 added 8 new Math students.",
    action: "Consider capacity planning for Spring — current growth rate suggests 260+ Math students by Jun '26.",
    trend: "+44% (2yr)", trendBad: false,
  },
  {
    id: "2yr_retention", type: "positive", icon: "🔒",
    title: "Long-Term Retention Improving",
    desc: "2-year retention jumped from 25% → 45% (Math) and 15% → 37% (Reading) — students who stay are committing.",
    action: "Analyze what distinguishes students who reach the 2-year mark. Use this for new family onboarding messaging.",
    trend: "+20 pts (Math)", trendBad: false,
  },
  {
    id: "1yr_retention", type: "warning", icon: "🔁",
    title: "1-Year Retention Softening",
    desc: "Math 1-yr retention slipped from 67.6% → 57.0%. More students are leaving before their first anniversary.",
    action: "Implement a 6-month check-in call for all active students. Identify students approaching 12 months who are still below grade.",
    trend: "-10.5 pts", trendBad: true,
  },
  {
    id: "als_rising", type: "positive", icon: "⏱",
    title: "Projected Stay Rising Fast",
    desc: "Projected Average Length of Stay rose from 24.6 → 29.6 months (Math) and 21.0 → 28.0 months (Reading).",
    action: "Higher ALS = higher lifetime value per student. Highlight this in Bincy's business review.",
    trend: "+5 months", trendBad: false,
  },
];

/* ── Attendance / Enrollment helpers ─────────────────────── */

interface AttSummaryDay {
  date: string; day_name: string; expected: number;
  attended: number; excused: number; no_show: number; rate: number;
}

type AttPreset = 'month' | 'q3' | 'year';

const STATUS_COLORS: Record<string, string> = {
  Active: '#22c55e', Trial: '#355caa', 'Month Off': '#eab308',
  Paused: '#9ca3af', 'On Hold': '#6b7280', Withdrawn: '#ef4444',
  Cancel: '#ef4444', Inactive: '#9ca3af',
};

function toYMD(d: Date): string { return d.toISOString().split('T')[0]; }

function getAttRange(preset: AttPreset, offset: number): { from: string; to: string; label: string } {
  const today = new Date();
  const todayStr = toYMD(today);
  if (preset === 'year') {
    return { from: `${today.getFullYear()}-01-01`, to: todayStr, label: String(today.getFullYear()) };
  }
  if (preset === 'q3') {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { from: toYMD(start), to: todayStr, label: 'Last 3 Months' };
  }
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const to = offset >= 0 ? todayStr : toYMD(lastDay);
  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { from: toYMD(d), to, label };
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function AttTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { attended: number; expected: number; rate: number; isToday: boolean } | undefined;
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipLabel}>{label}{row?.isToday ? ' (Today)' : ''}</div>
      <div>Attended: <strong>{row?.attended ?? '—'}</strong></div>
      <div>Expected: <strong>{row?.expected ?? '—'}</strong></div>
      <div>Rate: <strong>{row?.rate != null ? `${row.rate}%` : '—'}</strong></div>
    </div>
  );
}

function EnrollTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function SectionTitle({ children, sub }: { children: React.ReactNode; sub: string }) {
  return (
    <div className={styles.sectionTitleWrap}>
      <div className={styles.sectionSub}>{sub}</div>
      <div className={styles.sectionMain}>{children}</div>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendGood?: boolean;
  trendLabel?: string;
  accent?: string;
}

function KPICard({ label, value, sub, trend, trendGood, trendLabel, accent }: KPICardProps) {
  return (
    <div className={styles.kpiCard} style={{ borderTopColor: accent || 'var(--primary)' }}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
      {trend !== undefined && (
        <div className={styles.kpiTrend}>
          <span className={trendGood ? styles.trendGood : styles.trendBad}>{trend}</span>
          {trendLabel && <span className={styles.trendLabel}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

interface InsightItem {
  id: string;
  type: string;
  icon: string;
  title: string;
  desc: string;
  action: string;
  trend: string;
  trendBad: boolean;
}

function InsightCard({ item }: { item: InsightItem }) {
  const typeClass = item.type === 'alert' ? styles.insightAlert
    : item.type === 'warning' ? styles.insightWarning
    : styles.insightPositive;

  return (
    <div className={`${styles.insightCard} ${typeClass}`}>
      <div className={styles.insightHeader}>
        <div className={styles.insightTitle}>
          <span>{item.icon}</span> {item.title}
        </div>
        <span className={item.trendBad ? styles.trendBad : styles.trendGood}>{item.trend}</span>
      </div>
      <div className={styles.insightDesc}>{item.desc}</div>
      <div className={`${styles.insightAction} ${typeClass}`}>
        <strong>Action: </strong>{item.action}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color: string; unit?: string }>;
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
          {p.name.toLowerCase().includes('rate') || p.name.toLowerCase().includes('pct') || p.name.toLowerCase().includes('%') || p.unit === '%' ? '%' : ''}
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────── */
export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [insightFilter, setInsightFilter] = useState('all');

  const tabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'retention',   label: 'Retention' },
    { id: 'grades',      label: 'Grade Bands' },
    { id: 'atrisk',      label: 'At-Risk' },
    { id: 'insights',    label: 'Action Items' },
    { id: 'attendance',  label: 'Attendance' },
    { id: 'enrollment',  label: 'Enrollment' },
  ];

  const filteredInsights = insightFilter === 'all'
    ? insights
    : insights.filter(i => i.type === insightFilter);

  // ── Attendance state ──
  const [attPreset, setAttPreset] = useState<AttPreset>('month');
  const [attMonthOffset, setAttMonthOffset] = useState(0);
  const [attShowAll, setAttShowAll] = useState(false);

  const { from: attFrom, to: attTo, label: attLabel } = getAttRange(attPreset, attMonthOffset);

  const { data: attData, isLoading: attLoading } = useSWR<AttSummaryDay[]>(
    activeTab === 'attendance' ? `attendance-summary-${attFrom}-${attTo}` : null,
    () => api.attendanceSummary(attFrom, attTo),
    { dedupingInterval: 60000 }
  );

  const { data: pipelineData, isLoading: pipelineLoading } = useSWR(
    activeTab === 'enrollment' ? 'pipeline-summary' : null,
    () => api.pipeline.summary(),
    { dedupingInterval: 60000 }
  );

  // Attendance computed
  const attTotalAttended = attData?.reduce((s, d) => s + d.attended, 0) ?? 0;
  const attTotalNoShow   = attData?.reduce((s, d) => s + d.no_show, 0) ?? 0;
  const attTotalExcused  = attData?.reduce((s, d) => s + d.excused, 0) ?? 0;
  const attOverallRate   = attTotalAttended + attTotalNoShow > 0
    ? Math.round(attTotalAttended / (attTotalAttended + attTotalNoShow) * 100) : 0;
  const attTodayStr = toYMD(new Date());
  const attTableRows = attShowAll ? (attData ?? []) : (attData ?? []).slice(-6);
  const attChartData = (attData ?? []).map(d => ({
    label: fmtDate(d.date), attended: d.attended,
    expected: d.expected, rate: d.rate, isToday: d.date === attTodayStr,
  }));

  // Enrollment computed
  const currentMonthKey = toYMD(new Date()).slice(0, 7);
  const enrollMonths = Object.entries(pipelineData?.monthly_summary ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([ym, v]) => ({ ym, ...v }));
  const enrollChartData = enrollMonths.map(m => ({
    label: new Date(m.ym + '-15').toLocaleDateString('en-US', { month: 'short' }),
    gained: m.gained, lost: m.lost, net: m.net,
  }));
  const currentMD = pipelineData?.monthly_summary?.[currentMonthKey];
  const enGained = currentMD?.gained ?? 0;
  const enLost   = currentMD?.lost ?? 0;
  const enNet    = currentMD?.net ?? 0;
  const enTotal  = pipelineData?.student_statuses?.['Active'] ?? 0;
  const statusEntries = Object.entries(pipelineData?.student_statuses ?? {})
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count, color: STATUS_COLORS[label] ?? '#6b7280' }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Center"
          title="Intelligence"
          subtitle="Kumon Grand Rapids North · January 2026"
        />
        <div className={styles.tabBar}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        {activeTab === 'overview' && <>
          <div className={styles.kpiRow}>
            <KPICard label="Math Enrolled" value="246" sub="Students active Jan '26"
              trend="+24%" trendGood trendLabel="vs Jan '25" accent="var(--primary)" />
            <KPICard label="Reading Enrolled" value="209" sub="Students active Jan '26"
              trend="+33%" trendGood trendLabel="vs Jan '25" accent="var(--secondary)" />
            <KPICard label="Math ASHR Rate" value="45.5%" sub="1+ year above grade"
              trend="-4.5 pts" trendGood={false} trendLabel="vs Jan '25" accent="var(--primary)" />
            <KPICard label="Reading ASHR" value="22.5%" sub="1+ year above grade"
              trend="-4.9 pts" trendGood={false} trendLabel="vs Jan '25" accent="var(--secondary)" />
            <KPICard label="Math Attrition" value="3.38%" sub="Monthly dropout rate"
              trend="-0.69 pts" trendGood trendLabel="vs Jan '25" accent={C.green} />
            <KPICard label="Proj. ALS (Math)" value="29.6 mo" sub="Avg length of stay"
              trend="+5 mo" trendGood trendLabel="vs Jan '25" accent="var(--accent)" />
          </div>

          {/* Enrollment growth */}
          <div className={styles.card}>
            <SectionTitle sub="Enrollment">3-Year Enrollment Growth</SectionTitle>
            <div className={styles.enrollRow}>
              <div className={styles.enrollChart}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={enrollmentHistory} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'Montserrat' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'Montserrat' }} domain={[0, 300]} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="math" name="Math" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reading" name="Reading" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.enrollSidebar}>
                {[
                  { label: 'Math Growth (2yr)', from: 179, to: 246, color: 'var(--primary)' },
                  { label: 'Reading Growth (2yr)', from: 145, to: 209, color: 'var(--secondary)' },
                ].map(row => (
                  <div key={row.label} className={styles.growthRow}>
                    <div className={styles.growthHead}>
                      <span className={styles.growthLabel}>{row.label}</span>
                      <span className={styles.growthPct} style={{ color: row.color }}>
                        +{Math.round((row.to - row.from) / row.from * 100)}%
                      </span>
                    </div>
                    <div className={styles.growthTrack}>
                      <div className={styles.growthFill} style={{ width: `${row.to / 3}%`, background: row.color }} />
                    </div>
                    <div className={styles.growthRange}>
                      <span>{row.from} (Jan &apos;24)</span>
                      <span>{row.to} (Jan &apos;26)</span>
                    </div>
                  </div>
                ))}

                <div className={styles.activityBox}>
                  <div className={styles.activityTitle}>Jan &apos;26 Activity</div>
                  {[
                    { label: 'New Math', value: 8, color: 'var(--primary)' },
                    { label: 'New Reading (EO)', value: 8, color: 'var(--secondary)' },
                    { label: 'Math Absent', value: 6, color: 'var(--accent)' },
                    { label: 'Read Absent', value: 8, color: 'var(--accent)' },
                  ].map(r => (
                    <div key={r.label} className={styles.activityRow}>
                      <span>{r.label}</span>
                      <span style={{ fontWeight: 700, color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ASHR trend + Attrition */}
          <div className={styles.splitRow}>
            <div className={`${styles.card} ${styles.splitWide}`}>
              <SectionTitle sub="13-Month Trend">Achievement (ASHR) Rate</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} domain={[10, 60]} unit="%" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line type="monotone" dataKey="mathASHR" name="Math ASHR%" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="readASHR" name="Read ASHR%" stroke="var(--secondary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className={styles.chartLegend}>
                <span style={{ color: 'var(--primary)' }}>● Math: stable ~45-50%</span>
                <span style={{ color: 'var(--secondary)' }}>● Reading: declining 27% → 22%</span>
              </div>
            </div>

            <div className={`${styles.card} ${styles.splitNarrow}`}>
              <SectionTitle sub="13-Month Trend">Monthly Attrition Rate</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} domain={[2.5, 6]} unit="%" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line type="monotone" dataKey="mathAttr" name="Math Attrition%" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="readAttr" name="Read Attrition%" stroke="var(--secondary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className={styles.healthyNote}>Both subjects trending down — healthy</div>
            </div>
          </div>
        </>}

        {/* ══════════════ ACHIEVEMENT TAB ══════════════ */}
        {activeTab === 'achievement' && <>
          <div className={styles.splitRow}>
            {[
              { label: 'Math', pie: mathASHRPie, total: 246, ashr: 45.5, kis: 63.8, kis3mo: 100, color: 'var(--primary)' },
              { label: 'Reading', pie: readASHRPie, total: 209, ashr: 22.5, kis: 18.6, kis3mo: 98.5, color: 'var(--secondary)' },
            ].map(s => (
              <div key={s.label} className={styles.card}>
                <SectionTitle sub="Current Distribution">{s.label} — ASHR Breakdown</SectionTitle>
                <div className={styles.ashrLayout}>
                  <PieChart width={180} height={180}>
                    <Pie data={s.pie} cx={85} cy={85} innerRadius={52} outerRadius={82}
                      dataKey="value" stroke="none">
                      {s.pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <text x={85} y={80} textAnchor="middle" fill={C.dark}
                      style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20 }}>
                      {s.ashr}%
                    </text>
                    <text x={85} y={97} textAnchor="middle" fill={C.muted}
                      style={{ fontFamily: 'Montserrat', fontSize: 9 }}>
                      ASHR
                    </text>
                  </PieChart>
                  <div className={styles.ashrLegend}>
                    {s.pie.map(seg => (
                      <div key={seg.name} className={styles.ashrLegendRow}>
                        <div className={styles.ashrDot} style={{ background: seg.color }} />
                        <div className={styles.ashrLegendName}>{seg.name}</div>
                        <div className={styles.ashrLegendVal}>{seg.value}</div>
                        <div className={styles.ashrLegendPct}>{Math.round(seg.value / s.total * 100)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.miniStatRow}>
                  {[
                    { label: 'KIS within 1yr', val: `${s.kis}%`, good: s.kis > 40 },
                    { label: '3-mo Retention', val: `${s.kis3mo}%`, good: s.kis3mo > 95 },
                    { label: 'At/Above Grade', val: `${Math.round((s.pie.filter(p => p.name !== 'Below Grade').reduce((a, b) => a + b.value, 0)) / s.total * 100)}%`, good: true },
                  ].map(stat => (
                    <div key={stat.label} className={stat.good ? styles.miniStatGood : styles.miniStatBad}>
                      <div className={styles.miniStatVal}>{stat.val}</div>
                      <div className={styles.miniStatLabel}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* KIS trend */}
          <div className={styles.card}>
            <SectionTitle sub="KIS Attainment — 13 months">Grade Level Attainment Within 1 Year</SectionTitle>
            <p className={styles.chartDesc}>% of students who achieve Kumon Is Standard within 1 year of enrollment</p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} domain={[10, 80]} unit="%" />
                <Tooltip content={<CustomChartTooltip />} />
                <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4"
                  label={{ value: '50%', fontSize: 9, fill: C.muted }} />
                <Area type="monotone" dataKey="mathKIS" name="Math KIS%" fill="rgba(53,92,170,0.08)"
                  stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="readKIS" name="Reading KIS%" fill="rgba(0,154,171,0.08)"
                  stroke="var(--secondary)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={styles.alertBox}>
              <strong>⚠️ Critical:</strong> Reading KIS rate has dropped 13.6 points over 13 months (32.3% → 18.6%).
              Math KIS is actually <strong>improving</strong> slightly (60% → 63.8%). This divergence warrants immediate attention.
            </div>
          </div>

          {/* ALS trend */}
          <div className={styles.card}>
            <SectionTitle sub="Projected Stay">Average Length of Stay Trend</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#355caa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#355caa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009AAB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#009AAB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} domain={[18, 32]} unit=" mo" />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="mathALS" name="Math ALS (mo)" stroke="var(--primary)"
                  fill="url(#gm)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="readALS" name="Reading ALS (mo)" stroke="var(--secondary)"
                  fill="url(#gr)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* ══════════════ RETENTION TAB ══════════════ */}
        {activeTab === 'retention' && <>
          <div className={styles.kpiRow}>
            {[
              { label: 'Math 3-mo Retention', val: '100%', prev: '98.1%', good: true, color: 'var(--primary)' },
              { label: 'Math 1-yr Retention', val: '57.0%', prev: '67.6%', good: false, color: 'var(--primary)' },
              { label: 'Math 2-yr Retention', val: '45.1%', prev: '25.3%', good: true, color: 'var(--primary)' },
              { label: 'Read 3-mo Retention', val: '98.5%', prev: '100%', good: true, color: 'var(--secondary)' },
              { label: 'Read 1-yr Retention', val: '57.4%', prev: '61.5%', good: false, color: 'var(--secondary)' },
              { label: 'Read 2-yr Retention', val: '36.5%', prev: '15.0%', good: true, color: 'var(--secondary)' },
            ].map(k => (
              <div key={k.label} className={styles.kpiCard} style={{ borderTopColor: k.color }}>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiValue}>{k.val}</div>
                <div className={styles.kpiTrend}>
                  <span className={styles.trendLabel}>Was {k.prev}</span>
                  <span className={k.good ? styles.trendGood : styles.trendBad}>
                    {k.good ? '▲ Improved' : '▼ Declined'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <SectionTitle sub="13-Month Trend">1-Year vs 2-Year Retention — The Diverging Story</SectionTitle>
            <p className={styles.chartDesc}>
              A notable split: 1-year retention is <strong style={{ color: C.red }}>declining</strong> while
              2-year retention is <strong style={{ color: C.green }}>dramatically improving</strong>.
              Students who make it past year 1 are more committed than ever.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} domain={[10, 80]} unit="%" />
                <Tooltip content={<CustomChartTooltip />} />
                <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="mathRet1yr" name="Math 1-yr%" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="readRet1yr" name="Read 1-yr%" stroke="var(--secondary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="mathRet2yr" name="Math 2-yr%" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="readRet2yr" name="Read 2-yr%" stroke={C.gold} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.warningBox}>
            <div className={styles.warningTitle}>🔍 Retention Interpretation Guide</div>
            <div className={styles.warningList}>
              <div><strong style={{ color: 'var(--primary)' }}>3-mo retention at 100%:</strong> Near-zero early dropouts — new families are highly committed from the start.</div>
              <div><strong style={{ color: C.red }}>1-yr retention declining (67% → 57%):</strong> Students are dropping out before the 1-year mark, likely before seeing significant grade-level results. This is the critical intervention window.</div>
              <div><strong style={{ color: C.green }}>2-yr retention soaring (25% → 45%):</strong> Students reaching the 2-year mark are staying longer than ever. Invest in helping students bridge the 1–2 year gap.</div>
              <div><strong>Recommended:</strong> Create a &quot;Month 10–12 Engagement Protocol&quot; — proactive parent check-in, share progress data, celebrate milestones to prevent the 12-month dropout cliff.</div>
            </div>
          </div>
        </>}

        {/* ══════════════ GRADE BANDS TAB ══════════════ */}
        {activeTab === 'grades' && <>
          <div className={styles.card}>
            <SectionTitle sub="Math by Grade Band">% Above Grade Level per Grade</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gradeBandData} layout="vertical" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="grade" type="category" tick={{ fontSize: 11, fontFamily: 'Montserrat' }} width={48} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="mAbovePct" name="Math Above%" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.card}>
            <SectionTitle sub="Reading by Grade Band">% Above Grade Level per Grade</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gradeBandData} layout="vertical" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="grade" type="category" tick={{ fontSize: 11, fontFamily: 'Montserrat' }} width={48} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="rAbovePct" name="Reading Above%" fill="var(--secondary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className={styles.card}>
            <SectionTitle sub="Full Breakdown">Grade Band Performance Table</SectionTitle>
            <div className={styles.tableWrap}>
              <table className={styles.gradeTable}>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Grade</th>
                    {['Math N', 'Math Below', 'Math Above%', 'Read N', 'Read Below', 'Read Above%'].map(h => (
                      <th key={h} className={styles.thCenter}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gradeBandData.map((row, idx) => (
                    <tr key={row.grade} className={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td className={styles.tdGrade}>{row.grade}</td>
                      <td className={styles.tdCenter}>{row.mN}</td>
                      <td className={styles.tdCenter}>
                        <span className={row.mBelowPct > 55 ? styles.pillBad : row.mBelowPct > 40 ? styles.pillWarn : styles.pillGood}>
                          {row.mBelowPct}%
                        </span>
                      </td>
                      <td className={styles.tdCenter}>
                        <span className={row.mAbovePct >= 50 ? styles.pillGood : row.mAbovePct >= 35 ? styles.pillOk : styles.pillWarn}>
                          {row.mAbovePct}%
                        </span>
                      </td>
                      <td className={styles.tdCenter}>{row.rN}</td>
                      <td className={styles.tdCenter}>
                        <span className={row.rBelowPct > 70 ? styles.pillBad : row.rBelowPct > 55 ? styles.pillWarn : styles.pillGood}>
                          {row.rBelowPct}%
                        </span>
                      </td>
                      <td className={styles.tdCenter}>
                        <span className={row.rAbovePct >= 35 ? styles.pillGood : row.rAbovePct >= 20 ? styles.pillWarn : styles.pillBad}>
                          {row.rAbovePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.legendRow}>
              {[
                { cls: styles.pillBad, label: 'High below-grade / Low above-grade (Alert)' },
                { cls: styles.pillWarn, label: 'Moderate concern (Watch)' },
                { cls: styles.pillGood, label: 'Strong performance (Good)' },
              ].map(l => (
                <div key={l.label} className={styles.legendItem}>
                  <span className={`${l.cls} ${styles.legendDot}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ══════════════ AT-RISK TAB ══════════════ */}
        {activeTab === 'atrisk' && <>
          <div className={styles.kpiRow}>
            <KPICard label="Math At-Risk" value="13" sub="Below grade + 18+ months"
              trend="Priority" trendGood={false} accent={C.red} />
            <KPICard label="Reading At-Risk" value="25" sub="Below grade + 18+ months"
              trend="High Priority" trendGood={false} accent={C.red} />
            <KPICard label="Longest Tenured" value="89 mo" sub="Roy Simpson — Gr 6 Math Level E"
              accent="var(--accent)" />
            <KPICard label="Math Stars" value="19" sub="3 years above grade"
              trend="Celebrate!" trendGood accent={C.gold} />
            <KPICard label="Reading Stars" value="2" sub="3 years above grade"
              trend="Very low" trendGood={false} accent="var(--secondary)" />
          </div>

          <div className={styles.card}>
            <SectionTitle sub="Longest-Tenured Below Grade — Math">Priority Intervention List</SectionTitle>
            <p className={styles.chartDesc}>
              Students with the highest &quot;at-risk tenure&quot; — below grade and enrolled 18+ months. Sorted by months at risk.
            </p>
            <div className={styles.riskList}>
              {atRiskMath.map((s, idx) => (
                <div key={s.name} className={`${styles.riskRow} ${idx === 0 ? styles.riskCritical : idx < 3 ? styles.riskHigh : styles.riskNormal}`}>
                  <div className={styles.riskRank} style={{
                    background: idx === 0 ? C.red : idx < 3 ? C.amber : C.silver
                  }}>
                    {idx + 1}
                  </div>
                  <div className={styles.riskInfo}>
                    <div className={styles.riskName}>{s.name}</div>
                    <div className={styles.riskMeta}>{s.grade} · Kumon Level {s.level}</div>
                  </div>
                  <div className={styles.riskMonths}>
                    <div className={styles.riskMonthsVal} style={{ color: idx < 3 ? C.red : C.amber }}>
                      {s.los} mo
                    </div>
                    <div className={styles.riskMonthsSub}>enrolled</div>
                  </div>
                  <div className={styles.riskBarWrap}>
                    <div className={styles.riskBarTrack}>
                      <div className={styles.riskBarFill} style={{
                        width: `${Math.min(100, s.los / 89 * 100)}%`,
                        background: idx < 3 ? C.red : C.amber,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.alertBox}>
              <strong>Recommendation:</strong> These students represent a retention risk. For students 30+ months below grade,
              schedule an immediate parent consultation to reset expectations, celebrate current-level achievements,
              and set a clear milestone roadmap. Roy Simpson (89 months) and Luke Simpson (66 months) should be top priority.
            </div>
          </div>
        </>}

        {/* ══════════════ ATTENDANCE TAB ══════════════ */}
        {activeTab === 'attendance' && <>
          {/* Month nav + preset chips */}
          <div className={styles.attControls}>
            <div className={styles.attMonthNav}>
              <button
                className={styles.attNavBtn}
                disabled={attPreset !== 'month'}
                onClick={() => setAttMonthOffset(o => o - 1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.attMonthLabel}>{attLabel}</span>
              <button
                className={styles.attNavBtn}
                disabled={attPreset !== 'month' || attMonthOffset >= 0}
                onClick={() => setAttMonthOffset(o => Math.min(0, o + 1))}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className={styles.attPresets}>
              {([
                { id: 'month' as const, label: 'This Month' },
                { id: 'q3'    as const, label: 'Last 3 Months' },
                { id: 'year'  as const, label: 'This Year' },
              ]).map(p => (
                <button
                  key={p.id}
                  className={`${styles.attChip} ${attPreset === p.id ? styles.attChipActive : ''}`}
                  onClick={() => { setAttPreset(p.id); setAttMonthOffset(0); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {attLoading ? (
            <div className={styles.loadingRow}>Loading attendance data…</div>
          ) : <>
            {/* Summary stats */}
            <div className={styles.statStrip}>
              {[
                { label: 'Total Attended', value: String(attTotalAttended), color: 'var(--primary)' },
                { label: 'Total No-Shows', value: String(attTotalNoShow),   color: '#ef4444' },
                { label: 'Total Excused',  value: String(attTotalExcused),  color: 'var(--secondary)' },
                { label: 'Attendance Rate', value: `${attOverallRate}%`,    color: 'var(--accent)' },
              ].map(c => (
                <div key={c.label} className={styles.statCard}>
                  <div className={styles.statNum} style={{ color: c.color }}>{c.value}</div>
                  <div className={styles.statLabel}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Daily bar chart */}
            {attChartData.length > 0 && (
              <div className={styles.card}>
                <SectionTitle sub="Daily Attendance">Attendance by Day</SectionTitle>
                <div className={styles.attLegend}>
                  <span><span className={styles.legendDotGreen} /> 90%+ rate</span>
                  <span><span className={styles.legendDotAmber} /> Below 90%</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'Montserrat' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} allowDecimals={false} />
                    <Tooltip content={<AttTooltip />} />
                    <Bar dataKey="attended" name="Attended" radius={[3, 3, 0, 0]}>
                      {attChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.rate >= 90 ? '#22c55e' : '#eab308'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily breakdown table */}
            <div className={styles.card}>
              <SectionTitle sub="Daily Detail">Attendance Breakdown</SectionTitle>
              <div className={styles.tableWrap}>
                <table className={styles.attTable}>
                  <thead>
                    <tr>
                      {['Date', 'Expected', 'Attended', 'Excused', 'No-Show', 'Rate'].map(h => (
                        <th key={h} className={styles.attTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attTableRows.map(row => (
                      <tr key={row.date} className={row.rate < 90 ? styles.attRowLow : styles.attRow}>
                        <td className={styles.attTdDate}>
                          {fmtDate(row.date)}
                          {row.date === attTodayStr && <span className={styles.todayBadge}>Today</span>}
                        </td>
                        <td className={styles.attTd}>{row.expected}</td>
                        <td className={`${styles.attTd} ${styles.attTdGreen}`}>{row.attended}</td>
                        <td className={`${styles.attTd} ${styles.attTdTeal}`}>{row.excused}</td>
                        <td className={`${styles.attTd} ${row.no_show > 3 ? styles.attTdRedBold : styles.attTdRed}`}>{row.no_show}</td>
                        <td className={`${styles.attTd} ${row.rate < 90 ? styles.attTdAmber : ''}`}>{row.rate}%</td>
                      </tr>
                    ))}
                    {attData?.length === 0 && (
                      <tr><td colSpan={6} className={styles.attEmpty}>No attendance data for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {attData && attData.length > 6 && (
                <button className={styles.attShowAll} onClick={() => setAttShowAll(s => !s)}>
                  {attShowAll ? 'Show fewer days' : `View all ${attData.length} center days`}
                </button>
              )}
            </div>
          </>}
        </>}

        {/* ══════════════ ENROLLMENT TAB ══════════════ */}
        {activeTab === 'enrollment' && (
          pipelineLoading ? (
            <div className={styles.loadingRow}>Loading enrollment data…</div>
          ) : <>
            {/* Summary stats */}
            <div className={styles.statStrip}>
              {[
                { label: 'New Enrollments (this month)', value: String(enGained), color: '#22c55e' },
                { label: 'Cancellations (this month)',   value: String(enLost),   color: '#ef4444' },
                { label: 'Net Change', value: `${enNet >= 0 ? '+' : ''}${enNet}`, color: enNet >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Total Active', value: String(enTotal), color: 'var(--primary)' },
              ].map(c => (
                <div key={c.label} className={styles.statCard}>
                  <div className={styles.statNum} style={{ color: c.color }}>{c.value}</div>
                  <div className={styles.statLabel}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            {enrollChartData.length > 0 && (
              <div className={styles.card}>
                <SectionTitle sub="12-Month Trend">Enrollment Activity</SectionTitle>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={enrollChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'Montserrat' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'Montserrat' }} />
                    <Tooltip content={<EnrollTooltip />} />
                    <Bar dataKey="gained" name="Gained" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="lost"   name="Lost"   fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className={styles.attLegend}>
                  <span><span className={styles.legendDotGreen} /> Gained</span>
                  <span><span className={styles.legendDotRed} /> Lost</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>— Net</span>
                </div>
              </div>
            )}

            {/* Monthly table */}
            <div className={styles.card}>
              <SectionTitle sub="Monthly Breakdown">Enrollment by Month</SectionTitle>
              <div className={styles.tableWrap}>
                <table className={styles.attTable}>
                  <thead>
                    <tr>
                      {['Month', 'Gained', 'Lost', 'Net'].map(h => (
                        <th key={h} className={styles.attTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...enrollMonths].reverse().map(m => (
                      <tr key={m.ym} className={m.ym === currentMonthKey ? styles.enrollRowCurrent : styles.attRow}>
                        <td className={styles.attTdDate}>{fmtMonth(m.ym)}</td>
                        <td className={`${styles.attTd} ${styles.attTdGreen}`}>{m.gained}</td>
                        <td className={`${styles.attTd} ${styles.attTdRed}`}>{m.lost}</td>
                        <td className={`${styles.attTd} ${m.net >= 0 ? styles.attTdGreenBold : styles.attTdRedBold}`}>
                          {m.net >= 0 ? '+' : ''}{m.net}
                        </td>
                      </tr>
                    ))}
                    {enrollMonths.length === 0 && (
                      <tr><td colSpan={4} className={styles.attEmpty}>No enrollment data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status breakdown pills */}
            {statusEntries.length > 0 && (
              <div className={styles.card}>
                <SectionTitle sub="Current Status">Student Status Breakdown</SectionTitle>
                <div className={styles.statusPillRow}>
                  {statusEntries.map(s => (
                    <div key={s.label} className={styles.statusPill} style={{ borderLeftColor: s.color }}>
                      <span className={styles.statusPillCount} style={{ color: s.color }}>{s.count}</span>
                      <span className={styles.statusPillLabel}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════ ACTION ITEMS TAB ══════════════ */}
        {activeTab === 'insights' && <>
          <div>
            <h2 className={styles.insightsHeading}>Action Items for Bincy</h2>
            <p className={styles.chartDesc}>
              Data-driven recommendations derived from Jan 2025–Jan 2026 Kumon CMF and Progress data.
            </p>
            <div className={styles.filterRow}>
              {[
                { id: 'all', label: 'All (6)' },
                { id: 'alert', label: '🔴 Alerts (2)' },
                { id: 'warning', label: '🟡 Warnings (1)' },
                { id: 'positive', label: '🟢 Positive (3)' },
              ].map(f => (
                <button key={f.id} onClick={() => setInsightFilter(f.id)}
                  className={`${styles.filterBtn} ${insightFilter === f.id ? styles.filterBtnActive : ''}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.insightsList}>
              {filteredInsights.map(item => <InsightCard key={item.id} item={item} />)}
            </div>
          </div>

          {/* Priority matrix */}
          <div className={styles.card}>
            <SectionTitle sub="Priority Framework">What to Address First</SectionTitle>
            <div className={styles.priorityGrid}>
              {[
                { title: 'Do Now', cls: styles.priorityRed, items: [
                  'Reading KIS rate intervention — K through Gr 3',
                  'At-risk student parent meetings (Roy & Luke Simpson)',
                  'Month 10–12 retention outreach protocol',
                ]},
                { title: 'Do Soon', cls: styles.priorityYellow, items: [
                  'Grade 5 Math cohort review — 56% below grade',
                  'Grade 6 Reading audit — 85% below grade',
                  'Standardize absent-student follow-up (6–8 absences in Jan)',
                ]},
                { title: 'Plan', cls: styles.priorityGreen, items: [
                  'Leverage 2-yr retention story for new family enrollment pitches',
                  'Capacity planning for Spring \'26 (projected 260+ Math students)',
                  'Build milestone celebration touchpoints at 12, 24-month marks',
                ]},
                { title: 'Celebrate', cls: styles.priorityGold, items: [
                  '19 Math Stars (ASHR3) — recognize publicly',
                  'Enrollment growth: +37% Math, +44% Reading in 2 years',
                  'Attrition declining — monthly dropout rate at all-time low',
                ]},
              ].map(q => (
                <div key={q.title} className={`${styles.priorityBox} ${q.cls}`}>
                  <div className={styles.priorityTitle}>{q.title}</div>
                  {q.items.map(item => (
                    <div key={item} className={styles.priorityItem}>
                      <span className={styles.priorityArrow}>→</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
