import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutSwitcher } from '../../src/shell/LayoutSwitcher.js';

describe('<LayoutSwitcher/>', () => {
  it('renders four preset buttons', () => {
    const fn = vi.fn();
    render(<LayoutSwitcher preset="single" onChange={fn} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('highlights the active preset', () => {
    const fn = vi.fn();
    render(<LayoutSwitcher preset="quad" onChange={fn} />);
    const active = screen.getByRole('button', { pressed: true });
    expect(active).toHaveAttribute('data-preset', 'quad');
  });

  it('dispatches onChange on click', () => {
    const fn = vi.fn();
    render(<LayoutSwitcher preset="single" onChange={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /horizontal pair/i }));
    expect(fn).toHaveBeenCalledWith('horizontal-pair');
  });
});
