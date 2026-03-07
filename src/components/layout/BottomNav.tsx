'use client';

import { useState } from 'react';
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
import styles from './BottomNav.module.css';

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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  // Check if any "More" item is active (to highlight the More tab)
  const visibleMore = MORE_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );
  const moreActive = visibleMore.some((item) => isActive(item.href));

  return (
    <div className={styles.wrapper}>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${drawerOpen ? styles.overlayOpen : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>
        {visibleMore.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.drawerItem} ${isActive(href) ? styles.drawerItemActive : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab Bar */}
      <nav className={styles.bar} aria-label="Mobile navigation">
        {PRIMARY_TABS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.tab} ${isActive(href) ? styles.tabActive : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={20} />
            <span className={styles.tabLabel}>{label}</span>
          </Link>
        ))}
        <button
          className={`${styles.tab} ${moreActive || drawerOpen ? styles.tabActive : ''}`}
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
          <span className={styles.tabLabel}>More</span>
        </button>
      </nav>
    </div>
  );
}
