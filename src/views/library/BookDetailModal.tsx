'use client';

import { useState, useMemo } from 'react';
import { BookOpen, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import { useStudents } from '@/hooks/useStudents';
import { useBookLoans, checkoutBook, returnBook } from '@/hooks/useLibrary';
import type { Book } from '@/lib/types';
import { formatTime } from '@/lib/types';
import styles from './BookDetailModal.module.css';

interface BookDetailModalProps {
  open: boolean;
  onClose: () => void;
  book: Book;
}

export default function BookDetailModal({ open, onClose, book }: BookDetailModalProps) {
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const { data: allStudents } = useStudents();
  const { data: bookLoans } = useBookLoans(book.id);

  const outstandingLoan = bookLoans?.find((l) => l.returned_at === null);
  const isCheckedOut = book.status === 'checked-out' || !!outstandingLoan;
  const history = bookLoans?.filter((l) => l.returned_at !== null).sort(
    (a, b) => b.checked_out_at.localeCompare(a.checked_out_at)
  ) || [];

  const isOverdue = outstandingLoan?.due_date
    ? new Date(outstandingLoan.due_date + 'T23:59:59') < new Date()
    : false;

  const availableStudents = useMemo(() => {
    if (!allStudents) return [];
    return allStudents
      .filter((s) => s.enrollment_status === 'Active')
      .filter((s) =>
        studentQuery
          ? `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentQuery.toLowerCase())
          : true
      );
  }, [allStudents, studentQuery]);

  async function handleCheckout() {
    if (!selectedStudentId) return;
    await checkoutBook({
      book_id: book.id,
      student_id: selectedStudentId,
      checked_out_by: 'Staff',
    });
    setSelectedStudentId(null);
    setStudentQuery('');
    onClose();
  }

  async function handleReturn() {
    await returnBook({ book_id: book.id, returned_to: 'Staff' });
    onClose();
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <Modal open={open} onClose={onClose} title="" maxWidth="520px">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconLarge}>
          <BookOpen size={24} />
        </div>
        <div className={styles.headerInfo}>
          <h3 className={styles.title}>{book.title}</h3>
          {book.author && <p className={styles.author}>{book.author}</p>}
          <div className={styles.headerMeta}>
            {book.isbn && <span className={styles.isbn}>ISBN: {book.isbn}</span>}
            {book.barcode && <span className={styles.isbn}>Barcode: {book.barcode}</span>}
          </div>
        </div>
      </div>

      {/* Book Info */}
      <div className={styles.section}>
        <div className={styles.infoRow}>
          {book.category && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CATEGORY</span>
              <span className={styles.infoValue}>{book.category}</span>
            </div>
          )}
          {book.reading_level && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>READING LEVEL</span>
              <span className={styles.infoValue}>{book.reading_level}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>STATUS</span>
            <span className={isCheckedOut ? styles.statusOut : styles.statusAvail}>
              {isCheckedOut ? 'Checked Out' : 'Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className={styles.section}>
        {isCheckedOut && outstandingLoan ? (
          <div className={styles.loanInfo}>
            <h4 className={styles.sectionTitle}>Current Loan</h4>
            <div className={styles.loanCard}>
              <div className={styles.loanRow}>
                <span className={styles.loanLabel}>Borrower:</span>
                <span className={styles.loanValue}>
                  {outstandingLoan.student
                    ? `${outstandingLoan.student.first_name} ${outstandingLoan.student.last_name}`
                    : `Student #${outstandingLoan.student_id}`}
                </span>
              </div>
              <div className={styles.loanRow}>
                <span className={styles.loanLabel}>Checked out:</span>
                <span className={styles.loanValue}>{formatDate(outstandingLoan.checked_out_at)}</span>
              </div>
              {outstandingLoan.due_date && (
                <div className={styles.loanRow}>
                  <span className={styles.loanLabel}>Due date:</span>
                  <span className={isOverdue ? styles.loanOverdue : styles.loanValue}>
                    {formatDate(outstandingLoan.due_date)}
                    {isOverdue && ' (OVERDUE)'}
                  </span>
                </div>
              )}
              {isOverdue && (
                <div className={styles.overdueWarning}>
                  <AlertTriangle size={14} /> This book is overdue
                </div>
              )}
            </div>
            <Button variant="secondary" size="md" onClick={handleReturn} style={{ marginTop: 12 }}>
              Return Book
            </Button>
          </div>
        ) : (
          <div className={styles.checkoutSection}>
            <h4 className={styles.sectionTitle}>Check Out to Student</h4>
            <SearchInput
              placeholder="Search students..."
              value={studentQuery}
              onChange={(e) => {
                setStudentQuery(e.target.value);
                setSelectedStudentId(null);
              }}
            />
            <div className={styles.studentList}>
              {availableStudents.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  className={`${styles.studentOption} ${selectedStudentId === s.id ? styles.studentSelected : ''}`}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  {s.first_name} {s.last_name}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleCheckout}
              disabled={!selectedStudentId}
              style={{ marginTop: 8 }}
            >
              Check Out
            </Button>
          </div>
        )}
      </div>

      {/* Loan History */}
      {history.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Loan History</h4>
          <div className={styles.historyList}>
            {history.map((loan) => (
              <div key={loan.id} className={styles.historyRow}>
                <span className={styles.historyName}>
                  {loan.student
                    ? `${loan.student.first_name} ${loan.student.last_name}`
                    : `Student #${loan.student_id}`}
                </span>
                <span className={styles.historyDate}>
                  {formatDate(loan.checked_out_at)}
                  {loan.returned_at && ` → ${formatDate(loan.returned_at)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
