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
  console.log('BottomNav mounted');

  // DIAGNOSTIC: raw inline styles, no CSS Modules
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px', background: 'red', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 700 }}>
      BOTTOM NAV TEST
    </div>
  );
}
