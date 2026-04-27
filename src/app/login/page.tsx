'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      // The authorize() callback throws `rate_limited:<seconds>` when the
      // mu-plugin v2.59.0 rate limiter trips a lockout. NextAuth may URL-
      // encode the message depending on the version, so decode defensively
      // before pattern-matching. Everything else collapses to the generic
      // invalid-credentials copy.
      let raw = result.error;
      try { raw = decodeURIComponent(raw); } catch { /* already decoded */ }
      if (raw.startsWith('rate_limited:')) {
        const seconds = parseInt(raw.slice('rate_limited:'.length), 10) || 900;
        const minutes = Math.max(1, Math.ceil(seconds / 60));
        setError(
          `Too many failed attempts. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`,
        );
      } else {
        setError('Invalid email or password');
      }
      return;
    }

    router.push('/kiosk');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img
            src="/images/the_center_book_logo_with_GR_north_text_horiz.svg"
            alt="The Center Book"
            className={styles.logo}
          />
        </div>

        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>The Center Book Operations</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </div>

        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
