/**
 * Shared flag and checklist configuration for Live Class views.
 * Import these constants everywhere flags are referenced to prevent drift.
 */

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
