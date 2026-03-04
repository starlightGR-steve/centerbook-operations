'use client';

import { ChevronRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import StudentRow from '@/components/StudentRow';
import type { Student } from '@/lib/types';
import { assignToRow } from '@/hooks/useRows';

interface RowAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  rowNumber: number;
  availableStudents: Student[];
}

export default function RowAssignmentModal({
  open,
  onClose,
  rowNumber,
  availableStudents,
}: RowAssignmentModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const handleAssign = async (student: Student) => {
    await assignToRow({
      student_id: student.id,
      row_number: rowNumber,
      date: today,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign to Row ${rowNumber}`}
      subtitle="Select a checked-in student"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {availableStudents.length === 0 && (
          <p
            style={{
              fontSize: '14px',
              color: 'var(--neutral)',
              fontStyle: 'italic',
              padding: '12px 0',
            }}
          >
            No unassigned students available.
          </p>
        )}
        {availableStudents.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            onClick={() => handleAssign(s)}
            showDuration
            rightElement={
              <ChevronRight size={16} color="var(--secondary)" />
            }
          />
        ))}
      </div>
    </Modal>
  );
}
