import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <MemoryRouter>
        <EmptyState title="No items" description="Nothing to show here." />
      </MemoryRouter>,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show here.')).toBeInTheDocument();
  });

  it('renders action button with href', () => {
    render(
      <MemoryRouter>
        <EmptyState title="Empty" actionLabel="Create one" actionHref="/new" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Create one')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <MemoryRouter>
        <EmptyState icon={Megaphone} title="No broadcasts" />
      </MemoryRouter>,
    );
    expect(screen.getByText('No broadcasts')).toBeInTheDocument();
  });

  it('does not render action when no label', () => {
    render(
      <MemoryRouter>
        <EmptyState title="Empty" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
