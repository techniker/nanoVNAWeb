import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcuts } from '../../src/shortcuts/useShortcuts.js';

function Harness(props: { handlers: Parameters<typeof useShortcuts>[0] }): React.ReactElement {
  useShortcuts(props.handlers);
  return <input aria-label="input" />;
}

describe('useShortcuts', () => {
  it('dispatches onTogglePause on Space', () => {
    const h = {
      onTogglePause: vi.fn(),
      onSaveSnapshot: vi.fn(),
      onEscape: vi.fn(),
      onLayout: vi.fn(),
    };
    render(<Harness handlers={h} />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(h.onTogglePause).toHaveBeenCalled();
  });

  it('dispatches onSaveSnapshot on Cmd+S', () => {
    const h = {
      onTogglePause: vi.fn(),
      onSaveSnapshot: vi.fn(),
      onEscape: vi.fn(),
      onLayout: vi.fn(),
    };
    render(<Harness handlers={h} />);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(h.onSaveSnapshot).toHaveBeenCalled();
  });

  it('dispatches layout on 1..4', () => {
    const h = {
      onTogglePause: vi.fn(),
      onSaveSnapshot: vi.fn(),
      onEscape: vi.fn(),
      onLayout: vi.fn(),
    };
    render(<Harness handlers={h} />);
    fireEvent.keyDown(window, { key: '4' });
    expect(h.onLayout).toHaveBeenCalledWith('quad');
  });

  it('ignores keys when focus is on an input', () => {
    const h = {
      onTogglePause: vi.fn(),
      onSaveSnapshot: vi.fn(),
      onEscape: vi.fn(),
      onLayout: vi.fn(),
    };
    const { getByLabelText } = render(<Harness handlers={h} />);
    const input = getByLabelText('input');
    input.focus();
    fireEvent.keyDown(input, { key: ' ' });
    expect(h.onTogglePause).not.toHaveBeenCalled();
  });
});
