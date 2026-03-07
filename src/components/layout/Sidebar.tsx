'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Scan,
  Users,
  CalendarDays,
  Briefcase,
  BookOpen,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import Logo from '@/components/Logo';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/kiosk', icon: Scan, label: 'Kiosk' },
  { href: '/rows', icon: Users, label: 'Live Class' },
  { href: '/logistics', icon: CalendarDays, label: 'Scheduler' },
  { href: '/staff', icon: Briefcase, label: 'Staff' },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
  { href: '/intelligence', icon: TrendingUp, label: 'Insights' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="Module navigation">
      <div className={styles.logoWrap}>
        <Logo />
      </div>
      <nav className={styles.nav} aria-label="Module navigation">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
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
    </aside>
  );
}
