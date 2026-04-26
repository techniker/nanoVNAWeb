import { render, screen } from '@testing-library/react';
import type React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/charts/ErrorBoundary.js';

function Thrower(): React.ReactElement {
  throw new Error('boom');
}

describe('<ErrorBoundary/>', () => {
  const origError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = origError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <span>child</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
});
