'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchInput.module.css';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <div className={`${styles.wrapper} ${className || ''}`}>
        <span className={styles.icon}>{icon || <Search size={18} />}</span>
        <input ref={ref} className={styles.input} {...props} />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
export default SearchInput;
