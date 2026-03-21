'use client';

import { useState, useEffect, useMemo } from 'react';
import { Settings, Play, Check } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useStudents } from '@/hooks/useStudents';
import { useDemoMode } from '@/context/MockDataContext';
import { getTimeRemaining, getSessionDuration, parseSubjects, formatTime } from '@/lib/types';
import type { Student } from '@/lib/types';
import styles from './LobbyBoard.module.css';

/* ── Types ──────────────────────────────────── */

interface LobbyStudent {
  id: number;
  displayName: string;
  subjects: string[];
  checkInTime: string;
  sessionDuration: number;
  timeRemaining: number;
  sessionProgress: number;
  status: 'in_session' | 'wrapping_up' | 'almost_done' | 'ready' | 'over_time';
}

type ThemeId = 'departure' | 'gradient' | 'photo' | 'zen';

const THEME_META: Record<ThemeId, { label: string; desc: string }> = {
  departure: { label: 'Departure Board', desc: 'Airport-style flip board' },
  gradient: { label: 'Gradient Wave', desc: 'Frosted glass cards' },
  photo: { label: 'Photo Slideshow', desc: 'Crossfading scenes' },
  zen: { label: 'Minimal Zen', desc: 'Clean & restrained' },
};

/* ── Component ──────────────────────────────── */

export default function LobbyBoard() {
  const [showBoard, setShowBoard] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('departure');
  const [transitioning, setTransitioning] = useState(false);
  const [tick, setTick] = useState(0);
  const [time, setTime] = useState('');

  /* Data */
  const { data: attendance } = useAttendance(undefined, 5000);
  const { data: students } = useStudents();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const lobbyStudents = useMemo<LobbyStudent[]>(() => {
    if (!attendance || !students) return [];
    const checkedIn = attendance.filter(a => a.check_in && !a.check_out);
    return checkedIn
      .map(att => {
        const student = students.find(s => s.id === att.student_id);
        if (!student) return null;
        const duration = getSessionDuration(student.subjects, {
          scheduleDetail: student.schedule_detail,
          sessionDurationMinutes: att.session_duration_minutes,
        });
        const remaining = getTimeRemaining(student.subjects, att.check_in, {
          scheduleDetail: student.schedule_detail,
          sessionDurationMinutes: att.session_duration_minutes,
        });
        const elapsed = duration - remaining;
        const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        let status: LobbyStudent['status'] = 'in_session';
        if (remaining <= 0) status = 'ready';
        else if (remaining <= 5) status = 'almost_done';
        else if (remaining <= 10) status = 'wrapping_up';
        return {
          id: student.id,
          displayName: `${student.first_name} ${student.last_name[0]}.`,
          subjects: parseSubjects(student.subjects),
          checkInTime: formatTime(att.check_in),
          sessionDuration: duration,
          timeRemaining: remaining,
          sessionProgress: progress,
          status,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const order = { ready: 0, over_time: 1, almost_done: 2, wrapping_up: 3, in_session: 4 };
        return (order[a!.status] - order[b!.status]) || a!.timeRemaining - b!.timeRemaining;
      }) as LobbyStudent[];
  }, [attendance, students, tick]);

  /* Live clock */
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* Tick every 15s to refresh time remaining */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  /* JetBrains Mono for departure theme */
  useEffect(() => {
    if (selectedTheme === 'departure' && showBoard) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [selectedTheme, showBoard]);

  /* Handlers */
  const handlePlay = () => {
    setTransitioning(true);
    setTimeout(() => {
      setShowBoard(true);
      setTransitioning(false);
      try {
        document.documentElement.requestFullscreen?.() ||
          (document.documentElement as any).webkitRequestFullscreen?.();
      } catch { /* noop */ }
    }, 500);
  };

  const handleBack = () => {
    setTransitioning(true);
    try {
      document.exitFullscreen?.() || (document as any).webkitExitFullscreen?.();
    } catch { /* noop */ }
    setTimeout(() => {
      setShowBoard(false);
      setTransitioning(false);
    }, 500);
  };

  /* ── Render ─────────────────────────────── */

  if (!showBoard) return renderLauncher();
  return renderBoard();

  /* ── Launcher ───────────────────────────── */

  function renderLauncher() {
    return (
      <div className={`${styles.root} ${transitioning ? styles.fadeOut : styles.fadeIn}`}>
        <div className={styles.launcher}>
          <div className={styles.launcherInner}>
            {/* Header */}
            <div className={styles.launcherHeader}>
              <div className={styles.launcherLogo}>CB</div>
              <div>
                <h1 className={styles.launcherTitle}>Lobby Board</h1>
                <p className={styles.launcherSubtitle}>Choose a display theme for your lobby TV</p>
              </div>
            </div>

            {/* Theme Grid */}
            <div className={styles.themeGrid}>
              {(Object.keys(THEME_META) as ThemeId[]).map(id => (
                <button
                  key={id}
                  className={`${styles.themeCard} ${selectedTheme === id ? styles.themeCardSelected : ''}`}
                  onClick={() => setSelectedTheme(id)}
                >
                  <div className={`${styles.themePreview} ${styles[`preview_${id}`]}`}>
                    {selectedTheme === id && (
                      <div className={styles.themeCheck}><Check size={16} /></div>
                    )}
                  </div>
                  <div className={styles.themeLabel}>{THEME_META[id].label}</div>
                  <div className={styles.themeDesc}>{THEME_META[id].desc}</div>
                </button>
              ))}
            </div>

            {/* Play */}
            <button className={styles.playBtn} onClick={handlePlay}>
              <Play size={20} />
              <span>Launch Board</span>
            </button>
          </div>

          {/* Demo toggle */}
          <button
            className={`${styles.demoToggle} ${isDemoMode ? styles.demoToggleActive : ''}`}
            onClick={toggleDemoMode}
          >
            {isDemoMode ? 'Demo Mode ON' : 'Demo Mode OFF'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Board ──────────────────────────────── */

  function renderBoard() {
    return (
      <div className={`${styles.root} ${transitioning ? styles.fadeOut : styles.fadeIn}`}>
        {selectedTheme === 'departure' && renderDeparture()}
        {selectedTheme === 'gradient' && renderGradient()}
        {selectedTheme === 'photo' && renderPhoto()}
        {selectedTheme === 'zen' && renderZen()}
        <button className={styles.backBtn} onClick={handleBack} title="Back to launcher">
          <Settings size={18} />
        </button>
      </div>
    );
  }

  /* ═══ THEME 1: Departure Board ═══════════ */

  function renderDeparture() {
    return (
      <div className={styles.departure}>
        {/* Header */}
        <div className={styles.departureHeader}>
          <div className={styles.departureBrand}>
            <div className={styles.departureLogo}>CB</div>
            <span className={styles.departureTitle}>Student Session Board</span>
          </div>
          <div className={styles.departureRight}>
            <span className={styles.departureCount}>{lobbyStudents.length} in center</span>
            <span className={styles.departureClock}>{time}</span>
          </div>
        </div>

        {/* Table */}
        <div className={styles.departureTableWrap}>
          <div className={styles.departureTable}>
            {/* Column headers */}
            <div className={styles.departureRow + ' ' + styles.departureRowHeader}>
              <div className={styles.depColName}>Name</div>
              <div className={styles.depColSubjects}>Subjects</div>
              <div className={styles.depColIn}>In</div>
              <div className={styles.depColTime}>Time Left</div>
              <div className={styles.depColStatus}>Status</div>
            </div>

            {lobbyStudents.length === 0 && (
              <div className={styles.departureEmpty}>No students checked in</div>
            )}

            {lobbyStudents.map((s, i) => (
              <div
                key={s.id}
                className={`${styles.departureRow} ${styles[`depStatus_${s.status}`]}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={styles.depColName}>{s.displayName}</div>
                <div className={styles.depColSubjects}>
                  {s.subjects.map(sub => (
                    <span key={sub} className={`${styles.depBadge} ${styles[`depBadge_${sub.toLowerCase()}`]}`}>
                      {sub}
                    </span>
                  ))}
                </div>
                <div className={styles.depColIn}>{s.checkInTime}</div>
                <div className={styles.depColTime}>
                  {s.status === 'ready' ? 'DONE' : `${s.timeRemaining} min`}
                </div>
                <div className={styles.depColStatus}>
                  <span className={`${styles.depStatusPill} ${styles[`depPill_${s.status}`]}`}>
                    {statusLabel(s.status)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className={styles.depProgress}>
                  <div
                    className={`${styles.depProgressBar} ${styles[`depBar_${s.status}`]}`}
                    style={{ width: `${s.sessionProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ THEME 2: Gradient Wave ═════════════ */

  function renderGradient() {
    return (
      <div className={styles.gradient}>
        {/* Ambient dots */}
        <div className={styles.gradientDots}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.gradientDot} style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 2.5}s`,
              width: `${60 + i * 20}px`,
              height: `${60 + i * 20}px`,
            }} />
          ))}
        </div>

        {/* Header */}
        <div className={styles.gradientHeader}>
          <div className={styles.gradientBrand}>
            <div className={styles.gradientLogo}>CB</div>
            <span>Session Board</span>
          </div>
          <div className={styles.gradientRight}>
            <span className={styles.gradientCount}>{lobbyStudents.length} students</span>
            <span className={styles.gradientClock}>{time}</span>
          </div>
        </div>

        {/* Card Grid */}
        <div className={styles.gradientCards}>
          {lobbyStudents.length === 0 && (
            <div className={styles.gradientEmpty}>No students checked in</div>
          )}
          {lobbyStudents.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.gradientCard} ${styles[`gradCard_${s.status}`]}`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={styles.gradCardTop}>
                <div className={styles.gradCardName}>{s.displayName}</div>
                <div className={styles.gradCardSubjects}>
                  {s.subjects.map(sub => (
                    <span key={sub} className={`${styles.gradBadge} ${styles[`gradBadge_${sub.toLowerCase()}`]}`}>
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.gradCardBottom}>
                <span className={styles.gradCardIn}>In: {s.checkInTime}</span>
                <div className={styles.gradRing}>
                  <svg viewBox="0 0 36 36" className={styles.gradRingSvg}>
                    <circle cx="18" cy="18" r="15.9" className={styles.gradRingBg} />
                    <circle
                      cx="18" cy="18" r="15.9"
                      className={`${styles.gradRingFg} ${styles[`gradRing_${s.status}`]}`}
                      strokeDasharray={`${s.sessionProgress} ${100 - s.sessionProgress}`}
                      strokeDashoffset="25"
                    />
                  </svg>
                  <span className={styles.gradRingText}>
                    {s.status === 'ready' ? '✓' : `${s.timeRemaining}m`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ═══ THEME 3: Photo Slideshow ═══════════ */

  function renderPhoto() {
    return (
      <div className={styles.photo}>
        {/* Layered gradient scenes */}
        <div className={styles.photoScenes}>
          <div className={styles.photoScene + ' ' + styles.photoScene1} />
          <div className={styles.photoScene + ' ' + styles.photoScene2} />
          <div className={styles.photoScene + ' ' + styles.photoScene3} />
          <div className={styles.photoScene + ' ' + styles.photoScene4} />
        </div>
        <div className={styles.photoOverlay} />

        {/* Header */}
        <div className={styles.photoHeader}>
          <div className={styles.photoBrand}>
            <div className={styles.photoLogo}>CB</div>
            <span>The Center Book</span>
          </div>
          <div className={styles.photoRight}>
            <span className={styles.photoCount}>{lobbyStudents.length} in center</span>
            <span className={styles.photoClock}>{time}</span>
          </div>
        </div>

        {/* Cards */}
        <div className={styles.photoCards}>
          {lobbyStudents.length === 0 && (
            <div className={styles.photoEmpty}>No students checked in</div>
          )}
          {lobbyStudents.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.photoCard} ${styles[`photoCard_${s.status}`]}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={styles.photoCardLeft}>
                <div className={styles.photoCardName}>{s.displayName}</div>
                <div className={styles.photoCardSubjects}>
                  {s.subjects.map(sub => (
                    <span key={sub} className={`${styles.photoBadge} ${styles[`photoBadge_${sub.toLowerCase()}`]}`}>
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.photoCardRight}>
                <span className={styles.photoCardIn}>{s.checkInTime}</span>
                <span className={`${styles.photoStatusPill} ${styles[`photoPill_${s.status}`]}`}>
                  {s.status === 'ready' ? 'Ready' : `${s.timeRemaining} min`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ═══ THEME 4: Minimal Zen ══════════════ */

  function renderZen() {
    return (
      <div className={styles.zen}>
        {/* Ambient ripple circles */}
        <div className={styles.zenRipples}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.zenRipple} style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 30}%`,
              animationDelay: `${i * 3}s`,
            }} />
          ))}
        </div>

        {/* Header */}
        <div className={styles.zenHeader}>
          <div className={styles.zenBrand}>
            <div className={styles.zenLogo}>CB</div>
            <span className={styles.zenTitle}>Session Board</span>
          </div>
          <div className={styles.zenRight}>
            <span className={styles.zenCount}>{lobbyStudents.length}</span>
            <span className={styles.zenClock}>{time}</span>
          </div>
        </div>

        {/* Rows */}
        <div className={styles.zenRows}>
          {lobbyStudents.length === 0 && (
            <div className={styles.zenEmpty}>No students checked in</div>
          )}
          {lobbyStudents.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.zenRow} ${styles[`zenRow_${s.status}`]}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className={styles.zenRowName}>{s.displayName}</div>
              <div className={styles.zenRowSubjects}>
                {s.subjects.map(sub => (
                  <span key={sub} className={`${styles.zenBadge} ${styles[`zenBadge_${sub.toLowerCase()}`]}`}>
                    {sub}
                  </span>
                ))}
              </div>
              <div className={styles.zenRowTime}>
                {s.status === 'ready' ? 'Ready' : `${s.timeRemaining} min`}
              </div>
              <div className={styles.zenRowStatus}>
                {statusLabel(s.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

/* ── Helpers ─────────────────────────────── */

function statusLabel(status: LobbyStudent['status']): string {
  switch (status) {
    case 'in_session': return 'In Session';
    case 'wrapping_up': return 'Wrapping Up';
    case 'almost_done': return 'Almost Done';
    case 'ready': return 'Ready';
    case 'over_time': return 'Over Time';
    default: return '';
  }
}
