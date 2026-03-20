/**
 * Shared flag and checklist configuration for Live Class views.
 *
 * Defaults are hardcoded here as fallback. At runtime, the dynamic hooks
 * (useFlagConfig / useChecklistConfig) read from CenterSettings, falling
 * back to these defaults when settings haven't loaded yet.
 */

import type { FlagConfigItem, ChecklistConfigItem } from './types';

// ── Hardcoded defaults (fallback when settings are loading) ──

export const DEFAULT_FLAGS: FlagConfigItem[] = [
  { key: 'new_concept', label: 'New Concept', icon: 'Lightbulb', color: '#8b5cf6', enabled: true, sort_order: 0 },
  { key: 'needs_help', label: 'Needs Help', icon: 'CircleHelp', color: '#ef4444', enabled: true, sort_order: 1 },
  { key: 'work_with_amy', label: 'Work with Amy', icon: 'text:A', color: '#f59e0b', enabled: true, sort_order: 2 },
  { key: 'needs_homework', label: 'Needs Homework', icon: 'BookOpen', color: '#3b82f6', enabled: true, sort_order: 3 },
];

export const DEFAULT_CHECKLIST: ChecklistConfigItem[] = [
  { key: 'sound_cards', label: 'Sound Cards', enabled: true, sort_order: 0 },
  { key: 'flash_cards', label: 'Flash Cards', enabled: true, sort_order: 1 },
  { key: 'spelling', label: 'Spelling', enabled: true, sort_order: 2 },
  { key: 'handwriting', label: 'Handwriting Practice', enabled: true, sort_order: 3 },
];

// ── Legacy compat: static FLAG_CONFIG object for consumers not yet migrated ──

export const FLAG_CONFIG = {
  new_concept: { label: 'New Concept', icon: 'Sparkles', color: '#8b5cf6' },
  needs_help: { label: 'Needs Help', icon: 'HelpCircle', color: '#ef4444' },
  work_with_amy: { label: 'Work with Amy', icon: 'UserCheck', color: '#f59e0b' },
  needs_homework: { label: 'Needs Homework', icon: 'BookOpen', color: '#3b82f6' },
} as const;

export const CHECKLIST_CONFIG = {
  sound_cards: { label: 'Sound Cards' },
  flash_cards: { label: 'Flash Cards' },
  spelling: { label: 'Spelling' },
  handwriting: { label: 'Handwriting Practice' },
  custom: { label: 'Custom Task' },
} as const;

export type FlagKey = keyof typeof FLAG_CONFIG;
export type ChecklistKey = keyof typeof CHECKLIST_CONFIG;

export const FLAG_KEYS = Object.keys(FLAG_CONFIG) as FlagKey[];
export const CHECKLIST_KEYS = Object.keys(CHECKLIST_CONFIG) as ChecklistKey[];
