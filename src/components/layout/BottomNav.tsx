'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const content = (
    <div
      id="bottom-nav-root"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        zIndex: 99,
        pointerEvents: 'none',
      }}
    >
      {/* Overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          width: '100vw',
          background: '#1e3a6e',
          borderRadius: '16px 16px 0 0',
          padding: 16,
          zIndex: 101,
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.25s ease',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
        }}
      >
        {visibleMore.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '14px 16px',
                border: 'none',
                borderRadius: 10,
                background: active ? 'rgba(0,154,171,0.12)' : 'transparent',
                color: active ? '#009AAB' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: "'Montserrat', 'Century Gothic', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Tab Bar — CSS Grid for guaranteed equal columns */}
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100vw',
          height: 64,
          background: '#355caa',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          zIndex: 100,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          pointerEvents: 'auto',
        }}
      >
        {PRIMARY_TABS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                height: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                color: active ? '#009AAB' : 'rgba(255,255,255,0.6)',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              <Icon size={20} />
              <span
                style={{
                  fontFamily: "'Montserrat', 'Century Gothic', sans-serif",
                  fontSize: 9,
                  fontWeight: 600,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="More navigation items"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            height: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: moreActive || drawerOpen ? '#009AAB' : 'rgba(255,255,255,0.6)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <ChevronUp
            size={20}
            style={{
              transform: drawerOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.25s',
            }}
          />
          <span
            style={{
              fontFamily: "'Montserrat', 'Century Gothic', sans-serif",
              fontSize: 9,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            More
          </span>
        </button>
      </nav>
    </div>
  );

  return createPortal(content, document.body);
}
