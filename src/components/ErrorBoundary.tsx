'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  moduleName?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <Card className={styles.card}>
            <div className={styles.iconWrap}>
              <AlertTriangle size={40} color="var(--red)" />
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            {this.props.moduleName && (
              <p className={styles.module}>
                Error in {this.props.moduleName} module
              </p>
            )}
            {this.state.error && (
              <pre className={styles.errorMessage}>
                {this.state.error.message}
              </pre>
            )}
            <div className={styles.actions}>
              <Button variant="primary" onClick={this.handleReset}>
                Try Again
              </Button>
              <a href="/kiosk" className={styles.link}>
                Go to Dashboard
              </a>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
