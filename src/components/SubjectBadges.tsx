import Badge from '@/components/ui/Badge';
import { parseSubjects } from '@/lib/types';

interface SubjectBadgesProps {
  subjects: string | string[] | null | undefined;
}

export default function SubjectBadges({ subjects }: SubjectBadgesProps) {
  if (!subjects) return null;
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
