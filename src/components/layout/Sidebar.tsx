'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Scan,
  Users,
  CalendarDays,
  ClipboardList,
  Briefcase,
  BookOpen,
  BarChart2,
  TrendingUp,
  UserCircle,
  FlaskConical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/auth';
import { useDemoMode } from '@/context/MockDataContext';
import Logo from '@/components/Logo';
import styles from './Sidebar.module.css';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  roles?: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/kiosk', icon: Scan, label: 'Kiosk' },
  { href: '/rows', icon: Users, label: 'Live Class' },
  { href: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { href: '/logistics', icon: CalendarDays, label: 'Scheduler' },
  { href: '/staff', icon: Briefcase, label: 'Staff', roles: ['superuser', 'admin'] },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/progress', icon: BarChart2, label: 'Progress', roles: ['superuser', 'admin'] },
  { href: '/intelligence', icon: TrendingUp, label: 'Insights', roles: ['superuser', 'admin'] },
  { href: '/me', icon: UserCircle, label: 'Me' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const { isDemoMode, toggleDemoMode, demoRole, setDemoRole } = useDemoMode();

  const effectiveRole = isDemoMode ? demoRole : role;
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (effectiveRole && item.roles.includes(effectiveRole))
  );

  return (
    <aside className={styles.sidebar} aria-label="Module navigation">
      <div className={styles.logoWrap}>
        <Logo />
        {isDemoMode && (
          <span
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 4,
              fontSize: 10,
              fontWeight: 700,
              color: '#92400e',
              background: '#FEF3C7',
              padding: '2px 8px',
              borderRadius: 10,
              letterSpacing: '0.05em',
            }}
          >
            DEMO
          </span>
        )}
      </div>
      <nav className={styles.nav} aria-label="Module navigation">
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Demo Role Selector (only visible in demo mode) */}
      {isDemoMode && (
        <div
          style={{
            padding: '8px 12px',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Preview as
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['admin', 'staff'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDemoRole(r)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  border: 'none',
                  borderRadius: 5,
                  background: demoRole === r ? '#E0712C' : 'rgba(255,255,255,0.1)',
                  color: demoRole === r ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Demo Mode toggle */}
      <button
        onClick={toggleDemoMode}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          borderTop: isDemoMode ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: isDemoMode ? '#FEF3C7' : 'rgba(255,255,255,0.5)',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: isDemoMode ? 0 : 'auto',
        }}
      >
        <FlaskConical size={16} aria-hidden="true" />
        <span style={{ flex: 1, textAlign: 'left' }}>Demo</span>
        <span
          style={{
            width: 30,
            height: 16,
            borderRadius: 8,
            background: isDemoMode ? '#E0712C' : 'rgba(255,255,255,0.2)',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: isDemoMode ? 16 : 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }}
          />
        </span>
      </button>
    </aside>
  );
}
