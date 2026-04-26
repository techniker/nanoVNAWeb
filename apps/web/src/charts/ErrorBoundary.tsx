import React from 'react';

export interface ErrorBoundaryProps {
  readonly fallback: React.ReactNode;
  readonly onError?: (error: Error) => void;
  readonly children: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  public override render(): React.ReactNode {
    if (this.state.error !== null) return this.props.fallback;
    return this.props.children;
  }
}
