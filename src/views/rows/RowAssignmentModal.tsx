'use client';

import { ChevronRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import StudentRow from '@/components/StudentRow';
import type { Student } from '@/lib/types';
import { assignStudentToRow } from '@/hooks/useRows';
import { getCenterToday } from '@/lib/dates';

interface RowAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  rowLabel: string;
  availableStudents: Student[];
}

export default function RowAssignmentModal({
  open,
  onClose,
  rowLabel,
  availableStudents,
}: RowAssignmentModalProps) {
  const today = getCenterToday();

  const handleAssign = async (student: Student) => {
    await assignStudentToRow({
      student_id: student.id,
      row_label: rowLabel,
      session_date: today,
      assigned_by: 'Staff',
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign to ${rowLabel}`}
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
