'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import styles from './ProgressPage.module.css';

/* ═══════════════════════════════════════════
   ASHR COLORS & LABELS
   ═══════════════════════════════════════════ */
const ASHR_COLORS: Record<number, string> = {
  3: '#d97706', // Gold
  2: '#64748b', // Silver
  1: '#b8860b', // Bronze
  0: '#ea580c', // At Grade
  9: '#dc2626', // Below
};

const ASHR_LABELS: Record<number, string> = {
  3: 'Gold (3)',
  2: 'Silver (2)',
  1: 'Bronze (1)',
  0: 'At Grade (0)',
  9: 'Below (9)',
};

const ASHR_SHORT: Record<number, string> = {
  3: 'Gold',
  2: 'Silver',
  1: 'Bronze',
  0: 'At Grade',
  9: 'Below',
};

/* ═══════════════════════════════════════════
   MOCK STUDENT DATA — Kumon Progress Map, January 2026
   TODO: Replace with GET /cb/v1/progress/map
   ═══════════════════════════════════════════ */
interface ProgressStudent {
  name: string;
  band: string;
  math_ashr: number | null;
  math_grade: string | null;
  math_los: number | null;
  read_ashr: number | null;
  read_grade: string | null;
  read_los: number | null;
}

const MOCK_STUDENTS: ProgressStudent[] = [
  { name: 'Alice Wang', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 42, read_ashr: 3, read_grade: '3A', read_los: 38 },
  { name: 'Ben Torres', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 30, read_ashr: 2, read_grade: '2A', read_los: 28 },
  { name: 'Chloe Kim', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: 0, read_grade: 'A1', read_los: 12 },
  { name: 'Daniel Obi', band: '3-5', math_ashr: 9, math_grade: '3A', math_los: 36, read_ashr: 9, read_grade: '2A', read_los: 30 },
  { name: 'Emma Liu', band: 'K-2', math_ashr: 3, math_grade: '5A', math_los: 48, read_ashr: 2, read_grade: '3A', read_los: 36 },
  { name: 'Felix Brown', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 14, read_ashr: 1, read_grade: 'A2', read_los: 16 },
  { name: 'Grace Park', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 24, read_ashr: 3, read_grade: '4A', read_los: 30 },
  { name: 'Henry Cho', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 20, read_ashr: 9, read_grade: 'A1', read_los: 24 },
  { name: 'Isla Nguyen', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 28, read_ashr: 0, read_grade: 'A1', read_los: 10 },
  { name: 'Jack Miller', band: '6-8', math_ashr: 3, math_grade: 'H', math_los: 54, read_ashr: 2, read_grade: 'F', read_los: 48 },
  { name: 'Kira Patel', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 30, read_ashr: 1, read_grade: 'C', read_los: 22 },
  { name: 'Liam Chen', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 8, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Mia Johnson', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 40, read_ashr: 3, read_grade: 'E', read_los: 36 },
  { name: 'Noah Davis', band: '6-8', math_ashr: 9, math_grade: 'C', math_los: 44, read_ashr: 9, read_grade: 'B', read_los: 40 },
  { name: 'Olivia Lee', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 16, read_ashr: 2, read_grade: '3A', read_los: 20 },
  { name: 'Paul Santos', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 26, read_ashr: 0, read_grade: 'B', read_los: 14 },
  { name: 'Quinn Adams', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 32, read_ashr: 9, read_grade: 'A1', read_los: 26 },
  { name: 'Ruby Singh', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 18, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Sam Wright', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 36, read_ashr: 3, read_grade: 'G', read_los: 42 },
  { name: 'Tara Gupta', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 38, read_ashr: 1, read_grade: '2A', read_los: 18 },
  { name: 'Uma Reyes', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 10, read_ashr: 9, read_grade: 'A1', read_los: 30 },
  { name: 'Victor Tran', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 50, read_ashr: 2, read_grade: 'E', read_los: 34 },
  { name: 'Wendy Zhou', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 22, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Xander Cole', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: 0, read_grade: 'A2', read_los: 12 },
  { name: 'Yara Hassan', band: 'K-2', math_ashr: 3, math_grade: '5A', math_los: 46, read_ashr: 3, read_grade: '4A', read_los: 40 },
  { name: 'Zach Reed', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 12, read_ashr: 0, read_grade: 'C', read_los: 10 },
  { name: 'Ava Martin', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 34, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Blake Foster', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 28, read_ashr: 2, read_grade: 'C', read_los: 26 },
  { name: 'Clara Wood', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 14, read_ashr: 9, read_grade: 'A1', read_los: 28 },
  { name: 'Diego Ruiz', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 36, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Elena Volkov', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 32, read_ashr: 1, read_grade: 'D', read_los: 20 },
  { name: 'Finn Murphy', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: 2, read_grade: '2A', read_los: 18 },
  { name: 'Gia Romano', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 38, read_ashr: 9, read_grade: 'A2', read_los: 32 },
  { name: 'Hugo Lane', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 20, read_ashr: 1, read_grade: 'A2', read_los: 16 },
  { name: 'Iris Young', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 24, read_ashr: 3, read_grade: 'D', read_los: 30 },
  { name: 'Jake Hill', band: '6-8', math_ashr: 3, math_grade: 'I', math_los: 60, read_ashr: 2, read_grade: 'F', read_los: 40 },
  { name: 'Kaia Bell', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 4, read_ashr: 0, read_grade: 'A1', read_los: 4 },
  { name: 'Leo Varga', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 40, read_ashr: 1, read_grade: 'B', read_los: 18 },
  { name: 'Maya Scott', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 26, read_ashr: 9, read_grade: 'A1', read_los: 24 },
  { name: 'Nathan Cruz', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 22, read_ashr: 2, read_grade: 'C', read_los: 24 },
  { name: 'Olive Hart', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 44, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Peter Lam', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 10, read_ashr: 9, read_grade: 'B', read_los: 36 },
  { name: 'Rosa Diaz', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 30, read_ashr: 1, read_grade: 'C', read_los: 20 },
  { name: 'Sean Burke', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 30, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Tina Yao', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Uri Moss', band: '6-8', math_ashr: 3, math_grade: 'H', math_los: 52, read_ashr: 3, read_grade: 'G', read_los: 48 },
  { name: 'Vera Hunt', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: 1, read_grade: 'A2', read_los: 12 },
  { name: 'Will Soto', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 36, read_ashr: 9, read_grade: 'A2', read_los: 34 },
  { name: 'Xia Feng', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 28, read_ashr: 2, read_grade: '2A', read_los: 24 },
  { name: 'Yusuf Ali', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 18, read_ashr: 0, read_grade: 'B', read_los: 10 },
  { name: 'Zoe Nash', band: '6-8', math_ashr: 2, math_grade: 'F', math_los: 34, read_ashr: 1, read_grade: 'D', read_los: 22 },
  { name: 'Amir Khan', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 38, read_ashr: 2, read_grade: 'D', read_los: 28 },
  { name: 'Bella Stone', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 8, read_ashr: 9, read_grade: 'A1', read_los: 26 },
  { name: 'Caleb Roth', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 26, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Dana Price', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 28, read_ashr: 2, read_grade: '2A', read_los: 22 },
  { name: 'Eli Grant', band: '6-8', math_ashr: 1, math_grade: 'E', math_los: 20, read_ashr: 1, read_grade: 'D', read_los: 18 },
  { name: 'Faye Long', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 40, read_ashr: 2, read_grade: '3A', read_los: 26 },
  { name: 'Gabe Fox', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 12, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Hana West', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 14, read_ashr: 3, read_grade: '3A', read_los: 32 },
  { name: 'Ivan Marsh', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 42, read_ashr: 9, read_grade: 'A1', read_los: 38 },
  { name: 'Jade Walsh', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 30, read_ashr: 0, read_grade: 'C', read_los: 10 },
  { name: 'Kai Tanaka', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Luna Perez', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 42, read_ashr: 1, read_grade: 'C', read_los: 18 },
  { name: 'Max Otto', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 4, read_ashr: 0, read_grade: 'A1', read_los: 4 },
  { name: 'Nora Crane', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 24, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Omar Farid', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 48, read_ashr: 9, read_grade: 'C', read_los: 42 },
  { name: 'Pia Bloom', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 26, read_ashr: 1, read_grade: '2A', read_los: 16 },
  { name: 'Ray Sharp', band: '3-5', math_ashr: 0, math_grade: 'C', math_los: 10, read_ashr: 9, read_grade: 'A2', read_los: 30 },
  { name: 'Sara Ito', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 16, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Tony Gibbs', band: '6-8', math_ashr: 3, math_grade: 'I', math_los: 56, read_ashr: 2, read_grade: 'F', read_los: 38 },
  { name: 'Uma Chen', band: '3-5', math_ashr: 9, math_grade: 'C', math_los: 34, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Val Horn', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 22, read_ashr: 3, read_grade: '3A', read_los: 28 },
  { name: 'Walt Dean', band: '3-5', math_ashr: 1, math_grade: 'D', math_los: 20, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Xena Lloyd', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 8, read_ashr: 2, read_grade: 'D', read_los: 24 },
  { name: 'Yuki Sato', band: 'K-2', math_ashr: 3, math_grade: '5A', math_los: 44, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Zain Malik', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 28, read_ashr: 9, read_grade: 'A2', read_los: 28 },
  { name: 'Amy Grant', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 26, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Brett Hull', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 14, read_ashr: 2, read_grade: 'C', read_los: 20 },
  { name: 'Cara Moon', band: '6-8', math_ashr: 2, math_grade: 'F', math_los: 32, read_ashr: 3, read_grade: 'F', read_los: 36 },
  { name: 'Drew Hale', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Eve Cross', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 34, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Fred Bass', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: 9, read_grade: 'A1', read_los: 30 },
  { name: 'Gwen Kerr', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 36, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Hank Snow', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 12, read_ashr: 0, read_grade: 'C', read_los: 10 },
  { name: 'Ivy Dunn', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 24, read_ashr: 1, read_grade: '2A', read_los: 14 },
  { name: 'Joel Kirk', band: '3-5', math_ashr: 1, math_grade: 'D', math_los: 20, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Kate Byrd', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 42, read_ashr: 2, read_grade: '3A', read_los: 24 },
  { name: 'Luis Vega', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 10, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Mira Shah', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 46, read_ashr: 9, read_grade: 'B', read_los: 44 },
  { name: 'Nate Palm', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 22, read_ashr: 0, read_grade: 'A1', read_los: 10 },
  { name: 'Opal Wise', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: 9, read_grade: 'A1', read_los: 32 },
  { name: 'Pete York', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 30, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Ria Lowe', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 38, read_ashr: 3, read_grade: 'E', read_los: 34 },
  { name: 'Scott Day', band: '6-8', math_ashr: 1, math_grade: 'F', math_los: 22, read_ashr: 1, read_grade: 'D', read_los: 18 },
  { name: 'Thea Bond', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 4, read_ashr: 3, read_grade: '3A', read_los: 26 },
  { name: 'Ugo Neri', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 26, read_ashr: 0, read_grade: 'B', read_los: 10 },
  { name: 'Viv Penn', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 32, read_ashr: 9, read_grade: 'A1', read_los: 28 },
  { name: 'Wren Koch', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 18, read_ashr: 2, read_grade: 'C', read_los: 24 },
  { name: 'Xara Gale', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 34, read_ashr: 1, read_grade: 'D', read_los: 20 },
  { name: 'Yale Todd', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 8, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Zara Finn', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 40, read_ashr: 2, read_grade: 'D', read_los: 26 },
  { name: 'Ada Blake', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 16, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Bo Chang', band: '6-8', math_ashr: 9, math_grade: 'C', math_los: 42, read_ashr: 0, read_grade: 'C', read_los: 12 },
  { name: 'Cora Webb', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 24, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Dane York', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: 2, read_grade: '2A', read_los: 18 },
  { name: 'Ella Rowe', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 38, read_ashr: 1, read_grade: 'B', read_los: 18 },
  { name: 'Ford Nash', band: '6-8', math_ashr: 3, math_grade: 'H', math_los: 50, read_ashr: 0, read_grade: 'C', read_los: 10 },
  { name: 'Gail Ruiz', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 14, read_ashr: 9, read_grade: 'A1', read_los: 26 },
  { name: 'Hal Ortiz', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 10, read_ashr: 0, read_grade: 'B', read_los: 10 },
  { name: 'Iris Quinn', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 28, read_ashr: 3, read_grade: '4A', read_los: 34 },
  { name: 'Jay Marsh', band: '3-5', math_ashr: 9, math_grade: 'C', math_los: 36, read_ashr: 9, read_grade: 'A2', read_los: 30 },
  { name: 'Kim Avery', band: '6-8', math_ashr: 1, math_grade: 'F', math_los: 24, read_ashr: 2, read_grade: 'E', read_los: 28 },
  { name: 'Lee Stark', band: 'K-2', math_ashr: 3, math_grade: '5A', math_los: 46, read_ashr: 1, read_grade: '2A', read_los: 16 },
  { name: 'Mae Potter', band: '3-5', math_ashr: 0, math_grade: 'C', math_los: 12, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Ned Cross', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 20, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Ora Vance', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 44, read_ashr: 2, read_grade: 'D', read_los: 26 },
  { name: 'Pat Doyle', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 18, read_ashr: 1, read_grade: 'B', read_los: 14 },
  { name: 'Quinn Ray', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 4, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Rex Boone', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 44, read_ashr: 9, read_grade: 'A2', read_los: 26 },
  { name: 'Sky Wolfe', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 30, read_ashr: 1, read_grade: 'D', read_los: 20 },
  { name: 'Ty Brock', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 28, read_ashr: 0, read_grade: 'A1', read_los: 10 },
  { name: 'Una Field', band: '3-5', math_ashr: 1, math_grade: 'D', math_los: 20, read_ashr: 3, read_grade: 'D', read_los: 30 },
  { name: 'Van Poole', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 24, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Wes Hogan', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 14, read_ashr: 9, read_grade: 'B', read_los: 38 },
  { name: 'Ximena Paz', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 36, read_ashr: 2, read_grade: 'D', read_los: 24 },
  { name: 'Yael Stern', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 34, read_ashr: 9, read_grade: 'A1', read_los: 30 },
  { name: 'Zion Wade', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 8, read_ashr: 1, read_grade: 'A2', read_los: 12 },
  { name: 'Aria Cook', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 22, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Beck Neal', band: '6-8', math_ashr: 1, math_grade: 'F', math_los: 22, read_ashr: 2, read_grade: 'E', read_los: 26 },
  // Math-only students (no reading)
  { name: 'Cole Fritz', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 24, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Dawn Stein', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Evan Peck', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 36, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Fern Hall', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Glen Drake', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 40, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Hope Lane', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 20, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Ira Floyd', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 18, read_ashr: null, read_grade: null, read_los: null },
  { name: 'June Frost', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 8, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Kent Pace', band: '6-8', math_ashr: 3, math_grade: 'H', math_los: 48, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Lena Marx', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 34, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Mark Sage', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 26, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Nell Ford', band: '3-5', math_ashr: 0, math_grade: 'C', math_los: 12, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Otto Huff', band: '6-8', math_ashr: 1, math_grade: 'E', math_los: 20, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Pip Garza', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 38, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Rae Downs', band: '3-5', math_ashr: 9, math_grade: 'C', math_los: 36, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Sol Cuevas', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 22, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Tad Briggs', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 14, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Ursa Pham', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 10, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Vito Agee', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 24, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Wynn Odom', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 16, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Xavi Luna', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 42, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Yoko Sosa', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 30, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Zeke Holt', band: '6-8', math_ashr: 0, math_grade: 'F', math_los: 12, read_ashr: null, read_grade: null, read_los: null },
  // Reading-only students (no math)
  { name: 'Anna Bates', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Benny Cooke', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'B', read_los: 10 },
  { name: 'Cece Rivera', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 3, read_grade: '3A', read_los: 28 },
  { name: 'Dale Prince', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 9, read_grade: 'A2', read_los: 32 },
  { name: 'Etta James', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'D', read_los: 18 },
  { name: 'Flip Mason', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: '2A', read_los: 22 },
  { name: 'Gigi Wu', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Hugh Boyer', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 9, read_grade: 'A1', read_los: 24 },
  { name: 'Ida Kemp', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'D', read_los: 20 },
  { name: 'Jim Hines', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 3, read_grade: 'E', read_los: 34 },
  { name: 'Kit Lomax', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: '3A', read_los: 26 },
  { name: 'Lex Pryor', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'C', read_los: 14 },
  { name: 'Moe Tripp', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'A2', read_los: 16 },
  { name: 'Nia Powers', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 9, read_grade: 'B', read_los: 36 },
  { name: 'Odie Small', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: 'C', read_los: 24 },
  { name: 'Pearl Nixon', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Reed Klein', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'B', read_los: 14 },
  { name: 'Sue Tabor', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 3, read_grade: 'F', read_los: 32 },
  { name: 'Tim Yates', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 9, read_grade: 'A1', read_los: 28 },
  { name: 'Ula Craig', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Vic Truong', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Willa Dean', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'E', read_los: 22 },
  // Extra math-only to hit 246 math enrolled
  { name: 'Axel Bower', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 22, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Bria Gibbs', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Cruz Stone', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 42, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Dina Reese', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Ebon Clay', band: 'K-2', math_ashr: 3, math_grade: '4A', math_los: 40, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Faye Drake', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 28, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Gray Novak', band: '6-8', math_ashr: 0, math_grade: 'F', math_los: 14, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Haru Ikeda', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Ines Rocha', band: '3-5', math_ashr: 9, math_grade: 'B', math_los: 32, read_ashr: null, read_grade: null, read_los: null },
  { name: 'Joss Plumb', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 20, read_ashr: null, read_grade: null, read_los: null },
  // Extra reading-only to hit 206 reading enrolled
  { name: 'Kade Ellis', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'B', read_los: 14 },
  { name: 'Lux Berry', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 0, read_grade: 'A1', read_los: 6 },
  { name: 'Mack Quinn', band: '6-8', math_ashr: null, math_grade: null, math_los: null, read_ashr: 2, read_grade: 'E', read_los: 26 },
  { name: 'Nyla Sims', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 9, read_grade: 'A1', read_los: 30 },
  { name: 'Olaf Brand', band: 'K-2', math_ashr: null, math_grade: null, math_los: null, read_ashr: 3, read_grade: '3A', read_los: 30 },
  { name: 'Paz Nunez', band: '3-5', math_ashr: null, math_grade: null, math_los: null, read_ashr: 1, read_grade: 'C', read_los: 18 },
  // Extra dual to balance out — last 26 students
  { name: 'Remy Gold', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: 2, read_grade: '2A', read_los: 22 },
  { name: 'Shay Nolan', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 10, read_ashr: 0, read_grade: 'A2', read_los: 10 },
  { name: 'Trey Hurst', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 46, read_ashr: 1, read_grade: 'D', read_los: 20 },
  { name: 'Uriah Colon', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 26, read_ashr: 9, read_grade: 'A1', read_los: 26 },
  { name: 'Viola Keane', band: '3-5', math_ashr: 3, math_grade: 'G', math_los: 40, read_ashr: 0, read_grade: 'B', read_los: 12 },
  { name: 'Wyatt Lynch', band: '6-8', math_ashr: 1, math_grade: 'F', math_los: 24, read_ashr: 2, read_grade: 'E', read_los: 28 },
  { name: 'Yara Brandt', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 6, read_ashr: 1, read_grade: 'A2', read_los: 14 },
  { name: 'Zola Peters', band: '3-5', math_ashr: 9, math_grade: 'C', math_los: 38, read_ashr: 3, read_grade: 'D', read_los: 30 },
  { name: 'Aldo Voss', band: '6-8', math_ashr: 2, math_grade: 'G', math_los: 32, read_ashr: 0, read_grade: 'C', read_los: 10 },
  { name: 'Bea Colvin', band: 'K-2', math_ashr: 3, math_grade: '5A', math_los: 44, read_ashr: 1, read_grade: '2A', read_los: 16 },
  { name: 'Cain Murphy', band: '3-5', math_ashr: 0, math_grade: 'C', math_los: 12, read_ashr: 9, read_grade: 'A1', read_los: 28 },
  { name: 'Diya Arora', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 14, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Esme Rivas', band: '6-8', math_ashr: 9, math_grade: 'D', math_los: 48, read_ashr: 9, read_grade: 'C', read_los: 40 },
  { name: 'Flynn Weber', band: '3-5', math_ashr: 2, math_grade: 'E', math_los: 28, read_ashr: 1, read_grade: 'C', read_los: 18 },
  { name: 'Gita Mehta', band: 'K-2', math_ashr: 0, math_grade: 'A', math_los: 4, read_ashr: 0, read_grade: 'A1', read_los: 4 },
  { name: 'Hans Berger', band: '3-5', math_ashr: 1, math_grade: 'C', math_los: 16, read_ashr: 2, read_grade: 'C', read_los: 22 },
  { name: 'Ines Correa', band: '6-8', math_ashr: 3, math_grade: 'H', math_los: 52, read_ashr: 3, read_grade: 'G', read_los: 46 },
  { name: 'Jude Watts', band: 'K-2', math_ashr: 9, math_grade: '2A', math_los: 30, read_ashr: 0, read_grade: 'A1', read_los: 8 },
  { name: 'Kora Liang', band: '3-5', math_ashr: 2, math_grade: 'D', math_los: 22, read_ashr: 1, read_grade: 'B', read_los: 14 },
  { name: 'Lars Bohm', band: '6-8', math_ashr: 0, math_grade: 'E', math_los: 10, read_ashr: 9, read_grade: 'B', read_los: 34 },
  { name: 'Mila Ramos', band: 'K-2', math_ashr: 1, math_grade: '2A', math_los: 18, read_ashr: 3, read_grade: '3A', read_los: 28 },
  { name: 'Nico Vidal', band: '3-5', math_ashr: 3, math_grade: 'F', math_los: 36, read_ashr: 2, read_grade: 'D', read_los: 24 },
  { name: 'Opal Greer', band: '6-8', math_ashr: 9, math_grade: 'C', math_los: 40, read_ashr: 0, read_grade: 'C', read_los: 12 },
  { name: 'Penn Adler', band: 'K-2', math_ashr: 2, math_grade: '3A', math_los: 24, read_ashr: 2, read_grade: '2A', read_los: 20 },
  { name: 'Rosa Cheng', band: '3-5', math_ashr: 0, math_grade: 'B', math_los: 8, read_ashr: 1, read_grade: 'B', read_los: 16 },
  { name: 'Seth Noble', band: '6-8', math_ashr: 1, math_grade: 'F', math_los: 22, read_ashr: 0, read_grade: 'C', read_los: 10 },
];

/* ═══════════════════════════════════════════
   TOOLTIP / POPOVER
   ═══════════════════════════════════════════ */
interface PopoverState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

function Popover({ state }: { state: PopoverState }) {
  if (!state.visible) return null;
  return (
    <div
      className={styles.popover}
      style={{ left: state.x, top: state.y }}
    >
      {state.content}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOS BUCKETS
   ═══════════════════════════════════════════ */
const LOS_BUCKETS = [
  { label: '0–6 mo', min: 0, max: 6 },
  { label: '7–12 mo', min: 7, max: 12 },
  { label: '13–18 mo', min: 13, max: 18 },
  { label: '19–24 mo', min: 19, max: 24 },
  { label: '25–36 mo', min: 25, max: 36 },
  { label: '37+ mo', min: 37, max: Infinity },
];

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export default function ProgressPage() {
  const [popover, setPopover] = useState<PopoverState>({ visible: false, x: 0, y: 0, content: null });

  const showPopover = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content,
    });
  }, []);

  const hidePopover = useCallback(() => {
    setPopover((p) => ({ ...p, visible: false }));
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const total = MOCK_STUDENTS.length;
    const mathEnrolled = MOCK_STUDENTS.filter((s) => s.math_ashr !== null);
    const readEnrolled = MOCK_STUDENTS.filter((s) => s.read_ashr !== null);
    const dual = MOCK_STUDENTS.filter((s) => s.math_ashr !== null && s.read_ashr !== null);
    const atRisk = MOCK_STUDENTS.filter(
      (s) => (s.math_ashr === 9 && (s.math_los ?? 0) >= 24) || (s.read_ashr === 9 && (s.read_los ?? 0) >= 24)
    );
    const stars = MOCK_STUDENTS.filter((s) => s.math_ashr === 3 || s.read_ashr === 3);
    return { total, mathEnrolled, readEnrolled, dual, atRisk, stars };
  }, []);

  // ASHR distribution for donuts
  const mathDonut = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((t) => {
      const students = stats.mathEnrolled.filter((s) => s.math_ashr === t);
      return { tier: t, label: ASHR_LABELS[t], count: students.length, students };
    }).filter((d) => d.count > 0);
  }, [stats]);

  const readDonut = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((t) => {
      const students = stats.readEnrolled.filter((s) => s.read_ashr === t);
      return { tier: t, label: ASHR_LABELS[t], count: students.length, students };
    }).filter((d) => d.count > 0);
  }, [stats]);

  // Tenure vs Performance bar data
  const tenureData = useMemo(() => {
    return LOS_BUCKETS.map((bucket) => {
      const inBucket = MOCK_STUDENTS.filter((s) => {
        const los = Math.max(s.math_los ?? 0, s.read_los ?? 0);
        return los >= bucket.min && los <= bucket.max;
      });
      const total = inBucket.length;
      if (total === 0) return { label: bucket.label, above: 0, below: 0, total: 0, aboveStudents: [] as ProgressStudent[], belowStudents: [] as ProgressStudent[] };
      const above = inBucket.filter((s) => {
        const hasAboveMath = s.math_ashr !== null && s.math_ashr >= 1 && s.math_ashr <= 3;
        const hasAboveRead = s.read_ashr !== null && s.read_ashr >= 1 && s.read_ashr <= 3;
        return hasAboveMath || hasAboveRead;
      });
      const below = inBucket.filter((s) => s.math_ashr === 9 || s.read_ashr === 9);
      return {
        label: bucket.label,
        above: Math.round((above.length / total) * 100),
        below: Math.round((below.length / total) * 100),
        total,
        aboveStudents: above,
        belowStudents: below,
      };
    });
  }, []);

  // Cross-subject matrix (dual-enrolled only)
  const matrix = useMemo(() => {
    const tiers = [3, 2, 1, 0, 9];
    return tiers.map((mathTier) => ({
      mathTier,
      cells: tiers.map((readTier) => {
        const students = stats.dual.filter(
          (s) => s.math_ashr === mathTier && s.read_ashr === readTier
        );
        return { readTier, count: students.length, students };
      }),
    }));
  }, [stats]);

  const maxMatrixCount = useMemo(() => {
    return Math.max(1, ...matrix.flatMap((r) => r.cells.map((c) => c.count)));
  }, [matrix]);

  // At-risk list
  const atRiskList = useMemo(() => {
    return stats.atRisk
      .map((s) => {
        const mathMonths = s.math_ashr === 9 ? (s.math_los ?? 0) : 0;
        const readMonths = s.read_ashr === 9 ? (s.read_los ?? 0) : 0;
        return { ...s, riskScore: mathMonths + readMonths, mathMonths, readMonths };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [stats]);

  // Stars list
  const starsList = useMemo(() => {
    return stats.stars.sort((a, b) => {
      const aLos = Math.max(a.math_los ?? 0, a.read_los ?? 0);
      const bLos = Math.max(b.math_los ?? 0, b.read_los ?? 0);
      return bLos - aLos;
    });
  }, [stats]);

  return (
    <div className={styles.page}>
      <Popover state={popover} />

      <div className={styles.header}>
        <SectionHeader
          script="Track the"
          title="Progress Dashboard"
          subtitle="Kumon Progress Map — January 2026"
        />
      </div>

      <div className={styles.content}>
        {/* Stat Bar */}
        <div className={styles.statBar}>
          {[
            { label: 'Total Students', value: stats.total },
            { label: 'Math Enrolled', value: stats.mathEnrolled.length },
            { label: 'Reading Enrolled', value: stats.readEnrolled.length },
            { label: 'At-Risk', value: stats.atRisk.length },
            { label: 'Stars / Gold', value: stats.stars.length },
            { label: 'Dual Enrolled', value: stats.dual.length },
          ].map((s) => (
            <Card key={s.label} className={styles.statCard}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Donut Charts */}
        <div className={styles.chartRow}>
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Math ASHR Distribution</h3>
            <p className={styles.cardSub}>{stats.mathEnrolled.length} students enrolled</p>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={mathDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="label"
                    onMouseEnter={(_, idx, e) => {
                      const d = mathDonut[idx];
                      showPopover(e as unknown as React.MouseEvent, (
                        <div>
                          <div className={styles.popTitle}>{d.label}</div>
                          <div className={styles.popStat}>{d.count} students ({Math.round((d.count / stats.mathEnrolled.length) * 100)}%)</div>
                          <div className={styles.popNames}>{d.students.slice(0, 3).map((s) => s.name).join(', ')}{d.students.length > 3 ? '...' : ''}</div>
                        </div>
                      ));
                    }}
                    onMouseLeave={hidePopover}
                  >
                    {mathDonut.map((d) => (
                      <Cell key={d.tier} fill={ASHR_COLORS[d.tier]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className={styles.legendText}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Reading ASHR Distribution</h3>
            <p className={styles.cardSub}>{stats.readEnrolled.length} students enrolled</p>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={readDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="label"
                    onMouseEnter={(_, idx, e) => {
                      const d = readDonut[idx];
                      showPopover(e as unknown as React.MouseEvent, (
                        <div>
                          <div className={styles.popTitle}>{d.label}</div>
                          <div className={styles.popStat}>{d.count} students ({Math.round((d.count / stats.readEnrolled.length) * 100)}%)</div>
                          <div className={styles.popNames}>{d.students.slice(0, 3).map((s) => s.name).join(', ')}{d.students.length > 3 ? '...' : ''}</div>
                        </div>
                      ));
                    }}
                    onMouseLeave={hidePopover}
                  >
                    {readDonut.map((d) => (
                      <Cell key={d.tier} fill={ASHR_COLORS[d.tier]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className={styles.legendText}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tenure vs Performance */}
        <Card className={styles.fullCard}>
          <h3 className={styles.cardTitle}>Tenure vs Performance</h3>
          <p className={styles.cardSub}>Percentage above/below grade level by length of study</p>
          <div className={styles.barWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenureData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'Montserrat' }} />
                <YAxis tick={{ fontSize: 12, fontFamily: 'Montserrat' }} unit="%" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className={styles.chartTooltip}>
                        <div className={styles.popTitle}>{d.label}</div>
                        <div className={styles.popStat}>{d.total} students</div>
                        <div style={{ color: '#009AAB' }}>{d.above}% above grade ({d.aboveStudents?.length ?? 0})</div>
                        <div style={{ color: '#dc2626' }}>{d.below}% below grade ({d.belowStudents?.length ?? 0})</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="above" name="Above Grade" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="below" name="Below Grade" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Legend formatter={(value: string) => <span className={styles.legendText}>{value}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Cross-Subject Matrix */}
        <Card className={styles.fullCard}>
          <h3 className={styles.cardTitle}>Cross-Subject Matrix</h3>
          <p className={styles.cardSub}>{stats.dual.length} dual-enrolled students — Math ASHR (rows) × Reading ASHR (columns)</p>
          <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th className={styles.matrixCorner}>Math ↓ / Read →</th>
                  {[3, 2, 1, 0, 9].map((t) => (
                    <th key={t} className={styles.matrixHeader}>{ASHR_SHORT[t]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.mathTier}>
                    <td className={styles.matrixRowLabel}>{ASHR_SHORT[row.mathTier]}</td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.readTier}
                        className={styles.matrixCell}
                        style={{
                          backgroundColor: cell.count > 0
                            ? `rgba(53, 92, 170, ${0.1 + (cell.count / maxMatrixCount) * 0.7})`
                            : 'var(--base)',
                          color: cell.count / maxMatrixCount > 0.5 ? 'var(--white)' : 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          if (cell.count === 0) return;
                          showPopover(e, (
                            <div>
                              <div className={styles.popTitle}>
                                {cell.count} student{cell.count !== 1 ? 's' : ''}
                              </div>
                              <div className={styles.popStat}>
                                {ASHR_SHORT[row.mathTier]} in Math, {ASHR_SHORT[cell.readTier]} in Reading
                              </div>
                              <div className={styles.popNames}>
                                {cell.students.slice(0, 5).map((s) => s.name).join(', ')}
                                {cell.students.length > 5 ? '...' : ''}
                              </div>
                            </div>
                          ));
                        }}
                        onMouseLeave={hidePopover}
                      >
                        {cell.count || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* At-Risk & Stars side by side */}
        <div className={styles.chartRow}>
          {/* At-Risk List */}
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>At-Risk Students</h3>
            <p className={styles.cardSub}>Below grade level 24+ months, sorted by risk score</p>
            <div className={styles.listScroll}>
              {atRiskList.map((s, i) => (
                <div
                  key={i}
                  className={styles.listRow}
                  onMouseEnter={(e) => {
                    const parts: string[] = [];
                    if (s.math_ashr === 9) parts.push(`Below grade in Math for ${s.mathMonths}mo (level ${s.math_grade})`);
                    if (s.read_ashr === 9) parts.push(`Below grade in Reading for ${s.readMonths}mo (level ${s.read_grade})`);
                    const longest = Math.max(s.mathMonths, s.readMonths);
                    showPopover(e, (
                      <div>
                        <div className={styles.popTitle}>{s.name}</div>
                        {parts.map((p, j) => <div key={j} className={styles.popStat}>{p}</div>)}
                        <div className={styles.popNote}>Longest-tenured at-risk: {longest} months</div>
                      </div>
                    ));
                  }}
                  onMouseLeave={hidePopover}
                >
                  <div className={styles.listInfo}>
                    <span className={styles.listName}>{s.name}</span>
                    <span className={styles.listBand}>{s.band}</span>
                    <div className={styles.listBadges}>
                      {s.math_ashr === 9 && <Badge variant="math">Math</Badge>}
                      {s.read_ashr === 9 && <Badge variant="reading">Read</Badge>}
                    </div>
                  </div>
                  <div className={styles.riskBarWrap}>
                    <div
                      className={styles.riskBar}
                      style={{ width: `${Math.min(100, (s.riskScore / (atRiskList[0]?.riskScore || 1)) * 100)}%` }}
                    />
                    <span className={styles.riskScore}>{s.riskScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stars List */}
          <Card className={styles.chartCard}>
            <h3 className={styles.cardTitle}>Stars / Gold Students</h3>
            <p className={styles.cardSub}>ASHR = 3 in at least one subject</p>
            <div className={styles.listScroll}>
              {starsList.map((s, i) => (
                <div
                  key={i}
                  className={styles.listRow}
                  onMouseEnter={(e) => {
                    showPopover(e, (
                      <div>
                        <div className={styles.popTitle}>{s.name}</div>
                        {s.math_grade && <div className={styles.popStat}>Math: Level {s.math_grade} ({ASHR_SHORT[s.math_ashr!]})</div>}
                        {s.read_grade && <div className={styles.popStat}>Reading: Level {s.read_grade} ({ASHR_SHORT[s.read_ashr!]})</div>}
                        <div className={styles.popNote}>Enrolled {Math.max(s.math_los ?? 0, s.read_los ?? 0)} months</div>
                      </div>
                    ));
                  }}
                  onMouseLeave={hidePopover}
                >
                  <div className={styles.listInfo}>
                    <span className={styles.listName}>{s.name}</span>
                    <div className={styles.listBadges}>
                      {s.math_ashr !== null && (
                        <span
                          className={styles.ashrBadge}
                          style={{ background: ASHR_COLORS[s.math_ashr], color: '#fff' }}
                        >
                          M: {ASHR_SHORT[s.math_ashr]}
                        </span>
                      )}
                      {s.read_ashr !== null && (
                        <span
                          className={styles.ashrBadge}
                          style={{ background: ASHR_COLORS[s.read_ashr], color: '#fff' }}
                        >
                          R: {ASHR_SHORT[s.read_ashr]}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.listTenure}>{Math.max(s.math_los ?? 0, s.read_los ?? 0)}mo</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
