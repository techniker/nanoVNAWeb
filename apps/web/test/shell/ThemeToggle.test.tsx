import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../../src/shell/ThemeToggle.js';

// Radix primitives inspect pointer capture / layout methods that jsdom omits;
// stub them so the dropdown can open under test.
beforeEach(() => {
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    Element.prototype.setPointerCapture = () => {};
  }
  if (typeof Element.prototype.releasePointerCapture !== 'function') {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {};
  }
});

describe('<ThemeToggle/>', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
  });

  it('renders a toggle control', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
  });

  it('cycles system -> light -> dark', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /theme/i });
    await user.click(btn);
    const lightItem = await screen.findByRole('menuitemradio', { name: /light/i });
    await user.click(lightItem);
    expect(localStorage.getItem('nanovnaweb.theme')).toBe('light');
  });
});
