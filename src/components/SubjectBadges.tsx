import Badge from '@/components/ui/Badge';
import { parseSubjects } from '@/lib/types';

interface SubjectBadgesProps {
  subjects: string | string[];
}

export default function SubjectBadges({ subjects }: SubjectBadgesProps) {
  const parsed =
    typeof subjects === 'string' ? parseSubjects(subjects) : subjects;

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {parsed.map((s) => (
        <Badge key={s} variant={s === 'Math' ? 'math' : 'reading'}>
          {s}
        </Badge>
      ))}
    </div>
  );
}
