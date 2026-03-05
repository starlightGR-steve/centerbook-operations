import { Lock, Eye } from 'lucide-react';
import type { NoteVisibility } from '@/lib/types';
import styles from './VisibilityLabel.module.css';

interface VisibilityLabelProps {
  visibility: NoteVisibility;
}

const CONFIG: Record<NoteVisibility, { label: string; icon: typeof Lock }> = {
  internal: { label: 'Internal', icon: Lock },
  staff: { label: 'Staff', icon: Eye },
  parent: { label: 'Parent Visible', icon: Eye },
};

export default function VisibilityLabel({ visibility }: VisibilityLabelProps) {
  const { label, icon: Icon } = CONFIG[visibility];

  return (
    <span className={`${styles.label} ${styles[visibility]}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}
