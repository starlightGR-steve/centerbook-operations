'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Scan,
  Users,
  ClipboardList,
  CalendarDays,
  ChevronUp,
  Briefcase,
  BookOpen,
  BarChart2,
  TrendingUp,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/auth';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  roles?: AppRole[];
}

const PRIMARY_TABS: NavItem[] = [
  { href: '/kiosk', icon: Scan, label: 'Kiosk' },
  { href: '/rows', icon: Users, label: 'Live Class' },
  { href: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { href: '/logistics', icon: CalendarDays, label: 'Scheduler' },
];

const MORE_ITEMS: NavItem[] = [
  { href: '/staff', icon: Briefcase, label: 'Staff', roles: ['superuser', 'admin'] },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/progress', icon: BarChart2, label: 'Progress', roles: ['superuser', 'admin'] },
  { href: '/intelligence', icon: TrendingUp, label: 'Insights', roles: ['superuser', 'admin'] },
  { href: '/me', icon: UserCircle, label: 'Me' },
];

const COLORS = {
  primary: '#355caa',
  secondary: '#009AAB',
  drawerBg: '#1e3a6e',
  tabInactive: 'rgba(255,255,255,0.6)',
  white: '#ffffff',
  overlayBg: 'rgba(0,0,0,0.4)',
  drawerItemActiveBg: 'rgba(0,154,171,0.12)',
};

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const visibleMore = MORE_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );
  const moreActive = visibleMore.some((item) => isActive(item.href));

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    minWidth: 0,
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    color: active ? COLORS.secondary : COLORS.tabInactive,
    padding: 0,
    overflow: 'hidden',
  });

  const tabLabelStyle: React.CSSProperties = {
    fontFamily: "'Montserrat', 'Century Gothic', sans-serif",
    fontSize: '9px',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  };

  const drawerItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    borderRadius: '10px',
    background: active ? COLORS.drawerItemActiveBg : 'transparent',
    color: active ? COLORS.secondary : 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: "'Montserrat', 'Century Gothic', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: COLORS.overlayBg,
          zIndex: 99,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          bottom: '64px',
          left: 0,
          right: 0,
          background: COLORS.drawerBg,
          borderRadius: '16px 16px 0 0',
          padding: '16px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          zIndex: 101,
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {visibleMore.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            style={drawerItemStyle(isActive(href))}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: COLORS.primary,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {PRIMARY_TABS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            style={tabStyle(isActive(href))}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={20} />
            <span style={tabLabelStyle}>{label}</span>
          </Link>
        ))}
        <button
          style={tabStyle(moreActive || drawerOpen)}
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="More navigation items"
        >
          <ChevronUp
            size={20}
            style={{
              transform: drawerOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.25s',
            }}
          />
          <span style={tabLabelStyle}>More</span>
        </button>
      </nav>
    </>
  );
}
