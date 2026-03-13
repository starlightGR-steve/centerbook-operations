'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, Scan, UserCheck, CheckCircle } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import BookGrid from './BookGrid';
import BookDetailModal from './BookDetailModal';
import AddBookModal from './AddBookModal';
import { useBooks, useOutstandingLoans, checkoutBook, returnBook } from '@/hooks/useLibrary';
import { useStudents } from '@/hooks/useStudents';
import type { Book } from '@/lib/types';
import LibrarySkeleton from './LibrarySkeleton';
import styles from './LibraryPage.module.css';

type StatusFilter = 'all' | 'available' | 'checked-out';
type TypeFilter = 'books' | 'answer_keys';

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('books');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);

  // Scan-to-checkout state
  const [bookScan, setBookScan] = useState('');
  const [studentScan, setStudentScan] = useState('');
  const [scanBook, setScanBook] = useState<Book | null>(null); // Book awaiting student scan
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const studentInputRef = useRef<HTMLInputElement>(null);

  const { data: books } = useBooks();
  const { data: loans } = useOutstandingLoans();
  const { data: students } = useStudents();

  const clearFeedback = useCallback(() => {
    setTimeout(() => setScanFeedback(null), 3000);
  }, []);

  // Step 1: Scan book barcode
  function handleBookScan(e: React.FormEvent) {
    e.preventDefault();
    if (!bookScan.trim() || !books) return;
    const q = bookScan.trim().toLowerCase();
    const book = books.find(
      (b) => b.barcode?.toLowerCase() === q || String(b.id) === q
    );
    if (!book) {
      setScanFeedback('Book not found');
      setBookScan('');
      clearFeedback();
      return;
    }
    if (book.status === 'checked-out') {
      // Auto-return
      returnBook({ book_id: book.id, returned_to: 'Scan' });
      setScanFeedback(`Returned "${book.title}"`);
      setBookScan('');
      clearFeedback();
      return;
    }
    // Available → prompt for student scan
    setScanBook(book);
    setBookScan('');
    setScanFeedback(null);
    setTimeout(() => studentInputRef.current?.focus(), 50);
  }

  // Step 2: Scan student folder barcode
  function handleStudentScan(e: React.FormEvent) {
    e.preventDefault();
    if (!studentScan.trim() || !scanBook || !students) return;
    const q = studentScan.trim().toLowerCase();
    const student = students.find(
      (s) =>
        s.student_id?.toLowerCase() === q ||
        s.first_name.toLowerCase() === q ||
        `${s.first_name} ${s.last_name}`.toLowerCase() === q
    );
    if (!student) {
      setScanFeedback('Student not found');
      setStudentScan('');
      clearFeedback();
      return;
    }
    checkoutBook({
      book_id: scanBook.id,
      student_id: student.id,
      checked_out_by: 'Scan',
    });
    setScanFeedback(`Checked out "${scanBook.title}" to ${student.first_name}`);
    setScanBook(null);
    setStudentScan('');
    clearFeedback();
  }

  function cancelScan() {
    setScanBook(null);
    setStudentScan('');
    setScanFeedback(null);
  }

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let filtered = books;

    // Filter by type
    if (typeFilter === 'answer_keys') {
      filtered = filtered.filter((b) => b.type === 'answer_key');
    } else {
      filtered = filtered.filter((b) => b.type !== 'answer_key');
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.barcode?.toLowerCase().includes(q)
      );
    }

    if (filter === 'available') {
      filtered = filtered.filter((b) => b.status === 'available');
    } else if (filter === 'checked-out') {
      filtered = filtered.filter((b) => b.status === 'checked-out');
    }

    return filtered;
  }, [books, search, filter, typeFilter]);

  const booksOnly = books?.filter((b) => b.type !== 'answer_key') || [];
  const answerKeysOnly = books?.filter((b) => b.type === 'answer_key') || [];
  const checkedOutCount = typeFilter === 'answer_keys'
    ? answerKeysOnly.filter((b) => b.status === 'checked-out').length
    : booksOnly.filter((b) => b.status === 'checked-out').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Browse the"
          title="Center Library"
          subtitle={typeFilter === 'answer_keys'
            ? `${answerKeysOnly.length} answer keys · ${checkedOutCount} checked out`
            : `${booksOnly.length} books · ${checkedOutCount} checked out · Scan barcode or use manual checkout`
          }
        />

        {/* Scan Bar */}
        <div className={styles.scanBar}>
          <form onSubmit={handleBookScan} className={styles.scanForm}>
            <div className={styles.scanInputWrap}>
              <Scan size={16} className={styles.scanIcon} />
              <input
                value={bookScan}
                onChange={(e) => setBookScan(e.target.value)}
                placeholder="Scan book barcode to checkout or return..."
                className={styles.scanInput}
              />
            </div>
          </form>
          {scanBook && (
            <form onSubmit={handleStudentScan} className={styles.scanForm}>
              <div className={`${styles.scanInputWrap} ${styles.scanInputStudent}`}>
                <UserCheck size={16} className={styles.scanIconAccent} />
                <input
                  ref={studentInputRef}
                  value={studentScan}
                  onChange={(e) => setStudentScan(e.target.value)}
                  placeholder={`Scan student folder for "${scanBook.title}"...`}
                  className={`${styles.scanInput} ${styles.scanInputAccentBorder}`}
                />
                <button type="button" onClick={cancelScan} className={styles.cancelScan}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {scanFeedback && (
            <div className={styles.scanFeedback}>
              <CheckCircle size={14} />
              {scanFeedback}
            </div>
          )}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.typeToggle}>
            <button
              className={`${styles.typeBtn} ${typeFilter === 'books' ? styles.typeBtnActive : ''}`}
              onClick={() => setTypeFilter('books')}
            >
              Books
            </button>
            <button
              className={`${styles.typeBtn} ${typeFilter === 'answer_keys' ? styles.typeBtnActive : ''}`}
              onClick={() => setTypeFilter('answer_keys')}
            >
              Answer Keys
            </button>
          </div>
          <SearchInput
            placeholder={typeFilter === 'answer_keys' ? 'Search answer keys...' : 'Search books...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
          <select
            className={styles.filter}
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="checked-out">Checked Out</option>
          </select>
          <Button variant="primary" size="sm" onClick={() => setShowAddBook(true)}>
            <Plus size={16} />
            Add Book
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {!books ? (
          <LibrarySkeleton />
        ) : (
          <BookGrid
            books={filteredBooks}
            loans={loans || []}
            onSelect={setSelectedBook}
          />
        )}
      </div>

      {selectedBook && (
        <BookDetailModal
          open={!!selectedBook}
          onClose={() => setSelectedBook(null)}
          book={selectedBook}
        />
      )}

      <AddBookModal
        open={showAddBook}
        onClose={() => setShowAddBook(false)}
      />
    </div>
  );
}
