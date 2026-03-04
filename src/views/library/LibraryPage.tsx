'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import BookGrid from './BookGrid';
import BookDetailModal from './BookDetailModal';
import AddBookModal from './AddBookModal';
import { useBooks, useOutstandingLoans } from '@/hooks/useLibrary';
import type { Book } from '@/lib/types';
import LibrarySkeleton from './LibrarySkeleton';
import styles from './LibraryPage.module.css';

type StatusFilter = 'all' | 'available' | 'checked-out';

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);

  const { data: books } = useBooks();
  const { data: loans } = useOutstandingLoans();

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let filtered = books;

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
  }, [books, search, filter]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <SectionHeader
          script="Browse the"
          title="Center Library"
          subtitle="Early reader inventory for student checkout"
        />
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Search books..."
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
