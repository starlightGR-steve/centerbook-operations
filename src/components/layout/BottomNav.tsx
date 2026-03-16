'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Menu,
  X,
  Scan,
  GraduationCap,
  Users,
  UserPlus,
  ClipboardList,
  CalendarDays,
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

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  roles?: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/kiosk', icon: Scan, label: 'Kiosk' },
  { href: '/students', icon: GraduationCap, label: 'Students' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/onboarding', icon: UserPlus, label: 'Onboarding', roles: ['superuser', 'admin'] },
  { href: '/rows', icon: Users, label: 'Live Class' },
  { href: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { href: '/logistics', icon: CalendarDays, label: 'Scheduler' },
  { href: '/staff', icon: Briefcase, label: 'Staff', roles: ['superuser', 'admin'] },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/progress', icon: BarChart2, label: 'Progress', roles: ['superuser', 'admin'] },
  { href: '/intelligence', icon: TrendingUp, label: 'Insights', roles: ['superuser', 'admin'] },
  { href: '/me', icon: UserCircle, label: 'Me' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const { isDemoMode, toggleDemoMode, demoRole, setDemoRole } = useDemoMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!isMobile) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const effectiveRole = isDemoMode ? demoRole : role;
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (effectiveRole && item.roles.includes(effectiveRole))
  );

  // Find current page label
  const currentPage = visibleItems.find((item) => isActive(item.href));

  return (
    <>
      {/* Spacer to offset fixed nav bar */}
      <div style={{ height: 48, flexShrink: 0 }} />
      {/* Top bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: '#355caa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 900,
        }}
      >
        <span
          style={{
            color: '#fff',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {currentPage?.label || 'The Center Book'}
          {isDemoMode && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#92400e',
                background: '#FEF3C7',
                padding: '2px 8px',
                borderRadius: 10,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              DEMO
            </span>
          )}
        </span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 950,
          }}
        />
      )}

      {/* Slide-down menu */}
      {menuOpen && (
        <nav
          style={{
            position: 'fixed',
            top: 48,
            left: 0,
            right: 0,
            background: '#1e3a6e',
            zIndex: 960,
            padding: '8px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {visibleItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  color: active ? '#009AAB' : 'rgba(255,255,255,0.8)',
                  background: active ? 'rgba(0,154,171,0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {/* Demo Mode toggle */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              marginTop: 4,
              padding: '12px 20px',
            }}
          >
            <button
              onClick={toggleDemoMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                color: isDemoMode ? '#FEF3C7' : 'rgba(255,255,255,0.6)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FlaskConical size={18} />
                Demo Mode
              </span>
              {/* Toggle switch */}
              <span
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
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
                    left: isDemoMode ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }}
                />
              </span>
            </button>
            {isDemoMode && (
              <div style={{ marginTop: 10 }}>
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  Preview as
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['admin', 'staff'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={(e) => { e.stopPropagation(); setDemoRole(r); }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        border: 'none',
                        borderRadius: 6,
                        background: demoRole === r ? '#E0712C' : 'rgba(255,255,255,0.1)',
                        color: demoRole === r ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 12,
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
          </div>
        </nav>
      )}
    </>
  );
}
