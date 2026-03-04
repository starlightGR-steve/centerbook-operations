'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Scan,
  Users,
  LayoutDashboard,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/kiosk', icon: Scan, label: 'Kiosk' },
  { href: '/rows', icon: Users, label: 'Rows' },
  { href: '/logistics', icon: LayoutDashboard, label: 'Logistics' },
  { href: '/staff', icon: Briefcase, label: 'Staff' },
  { href: '/library', icon: BookOpen, label: 'Library' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>CB</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            >
              <Icon size={20} />
              <span className={styles.tooltip}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
