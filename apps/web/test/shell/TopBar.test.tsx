import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopBar } from '../../src/shell/TopBar.js';

describe('<TopBar/>', () => {
  it('renders logo and passes children', () => {
    render(
      <TopBar>
        <button type="button">Click</button>
      </TopBar>,
    );
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.getByText('NanoVNAWeb')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });
});
