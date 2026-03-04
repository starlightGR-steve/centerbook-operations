'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { addBook } from '@/hooks/useLibrary';
import styles from './AddBookModal.module.css';

interface AddBookModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = ['Early Reader', 'Chapter Book', 'Reference', 'Other'];
const READING_LEVELS = [
  '7A', '6A', '5A', '4A', '3A', '2A',
  'AI', 'AII', 'BI', 'BII', 'CI', 'CII',
  'DI', 'DII', 'EI', 'EII', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

export default function AddBookModal({ open, onClose }: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Early Reader');
  const [readingLevel, setReadingLevel] = useState('');

  async function handleSubmit() {
    if (!title.trim()) return;
    await addBook({
      title: title.trim(),
      author: author.trim() || null,
      isbn: isbn.trim() || null,
      barcode: barcode.trim() || null,
      category,
      reading_level: readingLevel || null,
    });
    // Reset form
    setTitle('');
    setAuthor('');
    setIsbn('');
    setBarcode('');
    setCategory('Early Reader');
    setReadingLevel('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Book" maxWidth="420px">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Title *</label>
          <input
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter book title"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Author</label>
          <input
            type="text"
            className={styles.input}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>ISBN</label>
            <input
              type="text"
              className={styles.input}
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Barcode</label>
            <input
              type="text"
              className={styles.input}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="LIB-..."
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reading Level</label>
            <select
              className={styles.select}
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value)}
            >
              <option value="">—</option>
              {READING_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={!title.trim()}
          style={{ width: '100%', marginTop: 4 }}
        >
          Add Book
        </Button>
      </div>
    </Modal>
  );
}
